## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set authentication secrets in `.env.local`:
   `THERMOMETER_API_KEY=replace-with-a-long-random-key`
   `JWT_SECRET=replace-with-a-different-long-random-secret`
3. Run the app:
   `npm run dev`

The dashboard login uses `THERMOMETER_API_KEY`. API clients can also send it as
`Authorization: Bearer <key>` or `X-API-Key: <key>`.

## HTTPS

Production mode requires HTTPS certificate files:

```powershell
$env:NODE_ENV="production"
$env:THERMOMETER_API_KEY="replace-with-a-long-random-key"
$env:JWT_SECRET="replace-with-a-different-long-random-secret"
$env:HTTPS_KEY_PATH="C:\certs\thermometer.key"
$env:HTTPS_CERT_PATH="C:\certs\thermometer.crt"
$env:HTTPS_PORT="3443"
npm run build
npm start
```

To redirect plain HTTP traffic to HTTPS, also set:

```powershell
$env:PORT="3000"
$env:ENABLE_HTTP_REDIRECT="true"
```

For real deployments, use a certificate from a trusted CA such as Let's Encrypt.
For a private LAN, you can use your own CA, but each ESP32 must trust that CA
certificate.

For quick LAN testing with OpenSSL, create a certificate for your server IP or
DNS name:

```powershell
openssl req -x509 -newkey rsa:2048 -nodes -days 365 `
  -keyout thermometer.key `
  -out thermometer.crt `
  -subj "/CN=192.168.1.50" `
  -addext "subjectAltName=IP:192.168.1.50,DNS:thermometer.local"
```

Then point `HTTPS_KEY_PATH` to `thermometer.key` and `HTTPS_CERT_PATH` to
`thermometer.crt`. Embed the matching certificate, or the CA that signed it, in
the ESP32 firmware.

## ESP32 Thermometer Clients

Each ESP32 needs:

- Wi-Fi SSID and password.
- The server URL, for example `https://your-domain.example:3443`.
- `THERMOMETER_API_KEY`.
- A thermometer ID created in the dashboard, for example `therm-abc1234`.
- The server CA certificate embedded in firmware when using TLS certificate
  validation.

Send readings to:

```http
POST /api/thermometers/<thermometer-id>/reading
Authorization: Bearer <THERMOMETER_API_KEY>
Content-Type: application/json

{
  "temperature": 21.7,
  "batteryAlert": false,
  "signalStrength": 4
}
```

Minimal Arduino-style ESP32 example:

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASSWORD = "your-password";
const char* API_KEY = "replace-with-a-long-random-key";
const char* SERVER_URL = "https://your-domain.example:3443";
const char* THERMOMETER_ID = "therm-abc1234";

const char* ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
paste your CA certificate here
-----END CERTIFICATE-----
)EOF";

float readTemperatureC() {
  // Replace this with DS18B20, DHT22, BME280, or your sensor code.
  return 21.7;
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setCACert(ROOT_CA);

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/thermometers/" + THERMOMETER_ID + "/reading";
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + API_KEY);

    float temperature = readTemperatureC();
    bool batteryAlert = false;
    int signalStrength = constrain(map(WiFi.RSSI(), -90, -45, 1, 4), 1, 4);

    String body = "{";
    body += "\"temperature\":" + String(temperature, 1) + ",";
    body += "\"batteryAlert\":" + String(batteryAlert ? "true" : "false") + ",";
    body += "\"signalStrength\":" + String(signalStrength);
    body += "}";

    int status = http.POST(body);
    Serial.printf("POST status: %d\n", status);
    http.end();
  }

  delay(30000);
}
```

Do not use `client.setInsecure()` except for a quick bench test. It disables TLS
certificate validation and makes the ESP32 accept impostor servers.
