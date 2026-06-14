import React, { useEffect, useState } from "react";
import { Thermometer, TempReading, SystemEvent } from "./types";
import { 
  ShieldAlert, 
  Thermometer as ThermoIcon, 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  Activity, 
  AlertOctagon, 
  Globe, 
  Server,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck
} from "lucide-react";
import ThermometerCard from "./components/ThermometerCard";
import HistoryChart from "./components/HistoryChart";
import EventStream from "./components/EventStream";
import AddThermometerModal from "./components/AddThermometerModal";

type AuthState = "checking" | "authenticated" | "anonymous";

function LoginScreen({
  onLogin,
}: {
  onLogin: (apiKey: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await onLogin(apiKey);
    if (!result.ok) {
      setError(result.message || "Access denied.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-slate-950">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-lg font-extrabold leading-none">Thermometer Telemetry</h1>
            <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Restricted Gateway
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20"
        >
          <div className="mb-5 flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-cyan-400">
              <Lock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold">Sign in</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Enter the configured API key to create a protected browser session.
              </p>
            </div>
          </div>

          <label className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-widest text-slate-400">
            API Key
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-750 bg-slate-950 px-3 py-2.5 focus-within:border-cyan-500">
            <KeyRound className="h-4 w-4 text-slate-500" />
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="current-password"
              className="w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="Paste API key"
              required
            />
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {isSubmitting ? "Checking..." : "Unlock Dashboard"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [thermometers, setThermometers] = useState<Thermometer[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<TempReading[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Initialize and poll datasets
  const fetchData = async (isManualClick = false) => {
    if (isManualClick) setIsRefreshing(true);
    try {
      const thermoRes = await fetch("/api/thermometers", { credentials: "include" });
      if (thermoRes.status === 401) {
        setAuthState("anonymous");
        return;
      }
      if (!thermoRes.ok) throw new Error("Could not contact telemetry network hub.");
      const thermoData: Thermometer[] = await thermoRes.json();
      setThermometers(thermoData);

      // Default selection to first thermometer if nothing selected yet
      if (thermoData.length > 0 && selectedId === null) {
        setSelectedId(thermoData[0].id);
      }

      const eventsRes = await fetch("/api/events", { credentials: "include" });
      if (eventsRes.status === 401) {
        setAuthState("anonymous");
        return;
      }
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }
      setErrorStatus(null);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to synchronise telemetry indicators.");
    } finally {
      if (isManualClick) setIsRefreshing(false);
    }
  };

  // Fetch history for the active selected thermometer
  const fetchSelectedHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/thermometers/${id}/history`, { credentials: "include" });
      if (res.status === 401) {
        setAuthState("anonymous");
        return;
      }
      if (res.ok) {
        const data: TempReading[] = await res.json();
        setHistoryData(data);
      }
    } catch (err) {
      console.error("Telemetry history offset load issue:", err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = await res.json();
        setAuthState(data.authenticated ? "authenticated" : "anonymous");
      } catch {
        setAuthState("anonymous");
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (authState === "authenticated") {
      fetchData();
    }
  }, [authState]);

  // Poll thermometers, events, and the focused history every 3 seconds.
  useEffect(() => {
    if (authState !== "authenticated") return;
    const pollInterval = setInterval(() => {
      fetchData();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [authState, selectedId]);

  // Handle active selection graph updates
  useEffect(() => {
    if (authState === "authenticated" && selectedId) {
      fetchSelectedHistory(selectedId);
      // Continuous polling for selected device history specifically
      const historyInterval = setInterval(() => {
        fetchSelectedHistory(selectedId);
      }, 3000);
      return () => clearInterval(historyInterval);
    }
  }, [authState, selectedId]);

  const handleLogin = async (apiKey: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { ok: false, message: data?.error || "Invalid API key." };
      }

      setAuthState("authenticated");
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not reach the authentication service." };
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    setThermometers([]);
    setEvents([]);
    setSelectedId(null);
    setHistoryData([]);
    setAuthState("anonymous");
  };

  // Edit Alarming Limits Thresholds
  const handleUpdateThresholds = async (id: string, low: number, high: number) => {
    try {
      const res = await fetch(`/api/thermometers/${id}/thresholds`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowThreshold: low, highThreshold: high }),
      });
      if (res.ok) {
        const updatedThermo = await res.json();
        setThermometers(prev => prev.map(t => t.id === id ? updatedThermo : t));
        fetchData(); // pull alert stream updates
      }
    } catch (err) {
      console.error("Limit adjustment saving failed:", err);
    }
  };

  // Reset displayed session statistics
  const handleResetStats = async (id: string) => {
    try {
      const res = await fetch(`/api/thermometers/${id}/control`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-stats" }),
      });
      if (res.ok) {
        const updatedThermo = await res.json();
        setThermometers(prev => prev.map(t => t.id === id ? updatedThermo : t));
        fetchData();
      }
    } catch (err) {
      console.error("Stats reset failed:", err);
    }
  };

  // Remove Device Permanently
  const handleUnlink = async (id: string) => {
    try {
      const res = await fetch(`/api/thermometers/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setThermometers(prev => prev.filter(t => t.id !== id));
        if (selectedId === id) {
          setSelectedId(null);
          setHistoryData([]);
        }
        fetchData();
      }
    } catch (err) {
      console.error("Failed to unbind device:", err);
    }
  };

  // Onboard / Connect new node
  const handleAddThermometer = async (data: any) => {
    try {
      const res = await fetch("/api/thermometers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newThermo = await res.json();
        setThermometers(prev => [...prev, newThermo]);
        setSelectedId(newThermo.id);
        setShowAddModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to register thermometer:", err);
    }
  };

  // Statistics KPI computation
  const activeCount = thermometers.filter(t => t.status !== "offline").length;
  const offlineCount = thermometers.filter(t => t.status === "offline").length;
  const breachCount = thermometers.filter(t => t.status === "danger").length;
  const warningCount = thermometers.filter(t => t.status === "warning").length;

  const activeTemps = thermometers.filter(t => t.status !== "offline").map(t => t.currentTemp);
  const averageGridTemp = activeTemps.length > 0 
    ? +(activeTemps.reduce((a, b) => a + b, 0) / activeTemps.length).toFixed(1)
    : 0;

  const selectedThermometer = thermometers.find(t => t.id === selectedId);

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3 font-display text-sm font-bold">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
          Checking secure session
        </div>
      </div>
    );
  }

  if (authState === "anonymous") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      
      {/* Upper Navigation Strip */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-4.5 dark:border-slate-900/60 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/10">
              <ThermoIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500"></span>
              </span>
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-tight text-slate-950 dark:text-white leading-none">
                Thermometer Telemetry
              </h1>
              <p className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                Mesh Network Controller Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="cursor-pointer inline-flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-450 dark:hover:text-slate-200 transition"
              title="Manually query sensors"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? "animate-spin text-indigo-650" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-650 px-4.5 py-2.5 font-display text-xs font-bold text-white shadow-sm shadow-indigo-600/10 hover:brightness-105 active:scale-98 transition-all duration-200 text-center"
            >
              <Plus className="h-4 w-4" />
              Link Thermometer Node
            </button>
            <button
              onClick={handleLogout}
              className="cursor-pointer inline-flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-450 dark:hover:text-rose-400 transition"
              title="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        
        {/* Network Connection Offline / Gateway Status Warn Banner */}
        {errorStatus && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
            <AlertOctagon className="h-5 w-5 text-rose-500 shrink-0" />
            <span className="font-sans text-sm font-semibold text-rose-700 dark:text-rose-400">
              {errorStatus} - Trying to reconnect to network telemetry loop automatically.
            </span>
          </div>
        )}

        {/* Dashboard Operational KPIs Ribbon */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          
          {/* KPI 1: Active Mesh */}
          <div className="rounded-2xl border border-slate-100 bg-white/75 p-5 shadow-xs dark:border-slate-800/85 dark:bg-slate-900/40 backdrop-blur-xs hover:border-slate-200 dark:hover:border-slate-800 transition duration-300">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">
                Connected Mesh
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {activeCount}
              </span>
              <span className="font-sans text-xs text-slate-400 dark:text-slate-500 font-medium">
                / {thermometers.length} online
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Sensors sending readings</span>
            </div>
          </div>

          {/* KPI 2: Average temperature across space */}
          <div className="rounded-2xl border border-slate-100 bg-white/75 p-5 shadow-xs dark:border-slate-800/85 dark:bg-slate-900/40 backdrop-blur-xs hover:border-slate-200 dark:hover:border-slate-800 transition duration-300">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">
                System Average
              </span>
              <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-500 dark:bg-cyan-950/30 dark:text-cyan-400">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-0.5">
              <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {averageGridTemp || "--.-"}
              </span>
              <span className="font-display text-xs font-bold text-slate-400 dark:text-slate-500">°C</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              <span>Mean active thermal state</span>
            </div>
          </div>

          {/* KPI 3: Danger Zone Breaches */}
          <div className="rounded-2xl border border-slate-100 bg-white/75 p-5 shadow-xs dark:border-slate-800/85 dark:bg-slate-900/40 backdrop-blur-xs hover:border-slate-200 dark:hover:border-slate-800 transition duration-300">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">
                Critical Breaches
              </span>
              <div className={`p-1.5 rounded-lg ${breachCount > 0 ? "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-450" : "bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500"}`}>
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className={`font-mono text-2xl font-extrabold leading-none ${breachCount > 0 ? "text-rose-600 animate-pulse dark:text-rose-450" : "text-slate-900 dark:text-white"}`}>
                {breachCount}
              </span>
              <span className="font-sans text-xs text-slate-400 dark:text-slate-500 font-medium">devices alert</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] leading-none">
              <span className={`h-1.5 w-1.5 rounded-full ${breachCount > 0 ? "bg-rose-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`} />
              <span className={breachCount > 0 ? "text-rose-500 dark:text-rose-450 font-semibold" : "text-slate-400 dark:text-slate-500"}>
                {breachCount > 0 ? "Exceeding safety bounds!" : "All bounds secure"}
              </span>
            </div>
          </div>

          {/* KPI 4: Pending Warn triggers */}
          <div className="rounded-2xl border border-slate-100 bg-white/75 p-5 shadow-xs dark:border-slate-800/85 dark:bg-slate-900/40 backdrop-blur-xs hover:border-slate-200 dark:hover:border-slate-800 transition duration-300">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">
                Buffer Warns
              </span>
              <div className={`p-1.5 rounded-lg ${warningCount > 0 ? "bg-amber-50 text-amber-500 dark:bg-amber-950/35 dark:text-amber-400" : "bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500"}`}>
                <AlertOctagon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className={`font-mono text-2xl font-extrabold leading-none ${warningCount > 0 ? "text-amber-500" : "text-slate-900 dark:text-white"}`}>
                {warningCount}
              </span>
              <span className="font-sans text-xs text-slate-400 dark:text-slate-500 font-medium">near threshold</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 leading-none">
              <span className={`h-1.5 w-1.5 rounded-full ${warningCount > 0 ? "bg-amber-400" : "bg-slate-350 dark:bg-slate-700"}`} />
              <span>Approaching alert limits</span>
            </div>
          </div>
        </div>

        {/* Dashboard Split Sections */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Main List Section: 2 Columns wide */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="h-4.5 w-4.5 text-indigo-500" />
                Active Node Boxes ({thermometers.length})
              </h2>
              <span className="font-sans text-[11px] font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
                Click any box to inspect recent telemetry history on the right.
              </span>
            </div>

            {thermometers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
                <ThermoIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
                <h3 className="mt-4 font-sans text-sm font-semibold text-gray-700 dark:text-gray-300">
                  No Thermometer Nodes Linked
                </h3>
                <p className="mt-1 font-sans text-xs text-gray-400 dark:text-gray-500">
                  Register a thermometer to begin collecting incoming readings.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 cursor-pointer rounded-lg bg-cyan-600 px-4 py-2 font-sans text-xs font-bold text-white hover:bg-cyan-500"
                >
                  Onboard First Device
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {thermometers.map((thermo) => (
                  <ThermometerCard
                    key={thermo.id}
                    thermometer={thermo}
                    isActive={selectedId === thermo.id}
                    onSelect={() => setSelectedId(thermo.id)}
                    onUpdateThresholds={handleUpdateThresholds}
                    onResetStats={handleResetStats}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Graphs & Events sidebar: 1 column wide */}
          <div className="space-y-6">
            
            {/* Analytical Focused Detail Overviews */}
            <div>
              <h2 className="mb-4 font-display text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                Sensors Analytics Overlay
              </h2>

              {selectedThermometer ? (
                <div className="space-y-4">
                  {/* Summary context badge for the plotted device */}
                  <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/40 backdrop-blur-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[11px] font-bold text-cyan-600 uppercase tracking-widest dark:text-cyan-400">
                        Inspecting Telemetry
                      </span>
                      <span className="font-mono text-xs text-gray-400 dark:text-gray-500 font-bold">
                        {selectedThermometer.model}
                      </span>
                    </div>
                    <h3 className="mt-1 font-sans text-base font-bold text-gray-800 dark:text-gray-100">
                      {selectedThermometer.name}
                    </h3>
                    <p className="font-sans text-xs text-gray-400 dark:text-gray-500">
                      {selectedThermometer.location} • Status:{" "}
                      <span className={`font-semibold capitalize ${
                        selectedThermometer.status === "danger" 
                        ? "text-rose-500" 
                        : selectedThermometer.status === "warning" 
                        ? "text-amber-500" 
                        : "text-teal-500"
                      }`}>
                        {selectedThermometer.status}
                      </span>
                    </p>
                  </div>

                  {/* Main Graph Component */}
                  <HistoryChart
                    data={historyData}
                    highThreshold={selectedThermometer.highThreshold}
                    lowThreshold={selectedThermometer.lowThreshold}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-white/20 p-6 text-center dark:border-gray-800/30">
                  <p className="font-sans text-sm text-gray-400 dark:text-gray-500">
                    Select a connected device on the left to see its telemetry logs graphed.
                  </p>
                </div>
              )}
            </div>

            {/* Live stream timeline logs */}
            <EventStream events={events} />

          </div>

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="mt-16 border-t border-gray-200/50 py-8 text-center text-xs text-gray-400 dark:border-gray-900/30 dark:text-gray-500">
        <p>Connected Thermometer Mesh Infrastructure Dashboard</p>
      </footer>

      {/* Onboard pairing dialog popup */}
      {showAddModal && (
        <AddThermometerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddThermometer}
        />
      )}

    </div>
  );
}
