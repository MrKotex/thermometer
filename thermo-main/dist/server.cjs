var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_http = __toESM(require("http"), 1);
var import_https = __toESM(require("https"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = require("dotenv");
var import_vite = require("vite");
(0, import_dotenv.config)({ path: import_path.default.resolve(process.cwd(), ".env.local") });
(0, import_dotenv.config)();
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "32kb" }));
var PORT = Number(process.env.PORT || 3e3);
var HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
var HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH;
var HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH;
var ENABLE_HTTPS = Boolean(HTTPS_KEY_PATH && HTTPS_CERT_PATH);
var ENABLE_HTTP_REDIRECT = process.env.ENABLE_HTTP_REDIRECT === "true";
var SESSION_COOKIE = "thermo_session";
var SESSION_TTL_SECONDS = 60 * 60 * 8;
var AUTH_API_KEY = process.env.THERMOMETER_API_KEY || process.env.API_KEY || "local-dev-change-me";
var JWT_SECRET = process.env.JWT_SECRET || AUTH_API_KEY;
var IS_PRODUCTION = process.env.NODE_ENV === "production";
if (IS_PRODUCTION && (!process.env.THERMOMETER_API_KEY || !process.env.JWT_SECRET)) {
  throw new Error("Set THERMOMETER_API_KEY and JWT_SECRET before starting in production.");
}
if (IS_PRODUCTION && !ENABLE_HTTPS) {
  throw new Error("Set HTTPS_KEY_PATH and HTTPS_CERT_PATH before starting in production.");
}
var loginAttempts = /* @__PURE__ */ new Map();
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (IS_PRODUCTION) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.set("trust proxy", 1);
var redirectApp = (0, import_express.default)();
redirectApp.use((req, res) => {
  const host = req.headers.host?.replace(/:\d+$/, `:${HTTPS_PORT}`) || `localhost:${HTTPS_PORT}`;
  res.redirect(308, `https://${host}${req.originalUrl}`);
});
var thermometers = [];
var readingsHistory = {};
var systemEvents = [];
function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}
function constantTimeEqual(a, b) {
  const aHash = import_crypto.default.createHash("sha256").update(a).digest();
  const bHash = import_crypto.default.createHash("sha256").update(b).digest();
  return import_crypto.default.timingSafeEqual(aHash, bHash);
}
function signToken(payload) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (!constantTimeEqual(signature, expectedSignature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}
function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, pair) => {
    const index = pair.indexOf("=");
    if (index === -1) return cookies;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}
function setSessionCookie(res, token) {
  const secure = IS_PRODUCTION ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`
  );
}
function clearSessionCookie(res) {
  const secure = IS_PRODUCTION ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}
function isRateLimited(req) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1e3;
  const maxAttempts = 8;
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxAttempts;
}
function clearRateLimit(req) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  loginAttempts.delete(key);
}
function tokenFromRequest(req) {
  const authHeader = req.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return req.get("x-api-key") || "";
}
function authenticateApi(req, res, next) {
  const apiKey = tokenFromRequest(req);
  if (apiKey && constantTimeEqual(apiKey, AUTH_API_KEY)) {
    return next();
  }
  const cookies = parseCookies(req.get("cookie"));
  const session = cookies[SESSION_COOKIE];
  if (session && verifyToken(session)) {
    return next();
  }
  return res.status(401).json({ error: "Authentication required." });
}
app.post("/api/auth/login", (req, res) => {
  if (isRateLimited(req)) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }
  const submittedKey = typeof req.body?.apiKey === "string" ? req.body.apiKey : "";
  if (!submittedKey || !constantTimeEqual(submittedKey, AUTH_API_KEY)) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  clearRateLimit(req);
  const now = Math.floor(Date.now() / 1e3);
  const token = signToken({
    sub: "dashboard",
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  });
  setSessionCookie(res, token);
  return res.json({ authenticated: true });
});
app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ authenticated: false });
});
app.get("/api/auth/session", (req, res) => {
  const apiKey = tokenFromRequest(req);
  if (apiKey && constantTimeEqual(apiKey, AUTH_API_KEY)) {
    return res.json({ authenticated: true });
  }
  const cookies = parseCookies(req.get("cookie"));
  const session = cookies[SESSION_COOKIE];
  return res.json({ authenticated: Boolean(session && verifyToken(session)) });
});
app.use("/api", authenticateApi);
function pushEvent(thermometerId, name, type, message) {
  const newEvent = {
    id: `event-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    thermometerId,
    thermometerName: name,
    type,
    message
  };
  systemEvents.unshift(newEvent);
  if (systemEvents.length > 100) {
    systemEvents.pop();
  }
}
function updateThermometerMetricsAndStatus(t, newReading) {
  t.currentTemp = +newReading.toFixed(1);
  t.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  const history = readingsHistory[t.id] || [];
  if (history.length > 0) {
    const temps = history.map((h) => h.temperature);
    t.minTemp = Math.min(...temps);
    t.maxTemp = Math.max(...temps);
    const sum = temps.reduce((a, b) => a + b, 0);
    t.averageTemp = +(sum / temps.length).toFixed(1);
  } else {
    t.minTemp = t.currentTemp;
    t.maxTemp = t.currentTemp;
    t.averageTemp = t.currentTemp;
  }
  const previousStatus = t.status;
  let newStatus = "online";
  if (t.currentTemp >= t.highThreshold || t.currentTemp <= t.lowThreshold) {
    newStatus = "danger";
  } else if (t.currentTemp >= t.highThreshold - 1 || t.currentTemp <= t.lowThreshold + 1) {
    newStatus = "warning";
  }
  if (newStatus !== previousStatus) {
    t.status = newStatus;
    if (newStatus === "danger") {
      pushEvent(
        t.id,
        t.name,
        "danger",
        `CRITICAL BREACH: Temperature is ${t.currentTemp} C (Allowed range: ${t.lowThreshold} - ${t.highThreshold} C)`
      );
    } else if (newStatus === "warning") {
      pushEvent(t.id, t.name, "warning", `Warning: Temperature is approaching limits at ${t.currentTemp} C.`);
    } else {
      pushEvent(t.id, t.name, "success", `Stabilized: Temperature back in safe zones at ${t.currentTemp} C.`);
    }
  }
}
app.get("/api/thermometers", (req, res) => {
  res.json(thermometers);
});
app.post("/api/thermometers", (req, res) => {
  const { name, location, model, highThreshold, lowThreshold, batteryAlert, signalStrength, unit } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: "Name and location fields are required." });
  }
  const id = `therm-${Math.random().toString(36).substring(2, 9)}`;
  const newThermometer = {
    id,
    name,
    location,
    model: model || "SmartLink Node S5",
    status: "offline",
    currentTemp: 0,
    minTemp: 0,
    maxTemp: 0,
    averageTemp: 0,
    highThreshold: typeof highThreshold === "number" ? highThreshold : 28,
    lowThreshold: typeof lowThreshold === "number" ? lowThreshold : 15,
    batteryAlert: typeof batteryAlert === "boolean" ? batteryAlert : false,
    signalStrength: typeof signalStrength === "number" ? Math.max(0, Math.min(4, Math.round(signalStrength))) : 0,
    unit: unit || "C",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  thermometers.push(newThermometer);
  readingsHistory[id] = [];
  pushEvent(id, name, "success", `Registered thermometer at ${location}. Waiting for first reading.`);
  res.status(201).json(newThermometer);
});
app.get("/api/thermometers/:id/history", (req, res) => {
  const history = readingsHistory[req.params.id] || [];
  res.json(history);
});
app.post("/api/thermometers/:id/thresholds", (req, res) => {
  const id = req.params.id;
  const { highThreshold, lowThreshold } = req.body;
  const thermo = thermometers.find((t) => t.id === id);
  if (!thermo) {
    return res.status(404).json({ error: "Thermometer not found" });
  }
  if (typeof highThreshold === "number") thermo.highThreshold = highThreshold;
  if (typeof lowThreshold === "number") thermo.lowThreshold = lowThreshold;
  pushEvent(
    thermo.id,
    thermo.name,
    "info",
    `Telemetry limits reconfigured to Min: ${thermo.lowThreshold} C / Max: ${thermo.highThreshold} C`
  );
  if ((readingsHistory[thermo.id] || []).length > 0) {
    updateThermometerMetricsAndStatus(thermo, thermo.currentTemp);
  }
  res.json(thermo);
});
app.post("/api/thermometers/:id/reading", (req, res) => {
  const id = req.params.id;
  const { temperature, batteryAlert, signalStrength } = req.body;
  if (typeof temperature !== "number") {
    return res.status(400).json({ error: "Numeric temperature reading is required." });
  }
  const thermo = thermometers.find((t) => t.id === id);
  if (!thermo) {
    return res.status(404).json({ error: "Thermometer not found" });
  }
  if (typeof batteryAlert === "boolean") {
    thermo.batteryAlert = batteryAlert;
  }
  if (typeof signalStrength === "number") {
    thermo.signalStrength = Math.max(0, Math.min(4, Math.round(signalStrength)));
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  if (!readingsHistory[thermo.id]) {
    readingsHistory[thermo.id] = [];
  }
  readingsHistory[thermo.id].push({ timestamp, temperature: +temperature.toFixed(1) });
  if (readingsHistory[thermo.id].length > 150) {
    readingsHistory[thermo.id].shift();
  }
  updateThermometerMetricsAndStatus(thermo, temperature);
  res.json({ thermometer: thermo, history: readingsHistory[thermo.id] });
});
app.post("/api/thermometers/:id/control", (req, res) => {
  const id = req.params.id;
  const { action } = req.body;
  const thermo = thermometers.find((t) => t.id === id);
  if (!thermo) {
    return res.status(404).json({ error: "Thermometer not found" });
  }
  if (action !== "reset-stats") {
    return res.status(400).json({ error: "Unsupported control action." });
  }
  thermo.minTemp = thermo.currentTemp;
  thermo.maxTemp = thermo.currentTemp;
  thermo.averageTemp = thermo.currentTemp;
  pushEvent(thermo.id, thermo.name, "info", "Cleared history statistics cache for the current monitor session.");
  res.json(thermo);
});
app.delete("/api/thermometers/:id", (req, res) => {
  const id = req.params.id;
  const index = thermometers.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Thermometer not found" });
  }
  const name = thermometers[index].name;
  thermometers.splice(index, 1);
  delete readingsHistory[id];
  pushEvent(id, name, "warning", "Unlinked and unregistered thermometer.");
  res.status(200).json({ success: true, message: "Thermometer disconnected successfully." });
});
app.get("/api/events", (req, res) => {
  res.json(systemEvents);
});
async function startApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  if (ENABLE_HTTPS) {
    const tlsOptions = {
      key: import_fs.default.readFileSync(HTTPS_KEY_PATH),
      cert: import_fs.default.readFileSync(HTTPS_CERT_PATH)
    };
    import_https.default.createServer(tlsOptions, app).listen(HTTPS_PORT, "0.0.0.0", () => {
      console.log(`HTTPS server running on port ${HTTPS_PORT}`);
    });
    if (ENABLE_HTTP_REDIRECT) {
      import_http.default.createServer(redirectApp).listen(PORT, "0.0.0.0", () => {
        console.log(`HTTP redirect server running on port ${PORT}`);
      });
    }
  } else {
    import_http.default.createServer(app).listen(PORT, "0.0.0.0", () => {
      console.log(`HTTP server running on port ${PORT}`);
    });
  }
}
startApp().catch((err) => {
  console.error("Failed to start telemetry server:", err);
});
//# sourceMappingURL=server.cjs.map
