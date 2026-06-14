import React, { useState } from "react";
import { Thermometer, ThermometerStatus } from "../types";
import {
  Thermometer as TempIcon,
  Battery,
  BatteryWarning,
  WifiOff,
  Trash2,
  Sliders,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface ThermometerCardProps {
  key?: string;
  thermometer: Thermometer;
  isActive: boolean;
  onSelect: () => void;
  onUpdateThresholds: (id: string, low: number, high: number) => void;
  onResetStats: (id: string) => void;
  onUnlink: (id: string) => void;
}

export default function ThermometerCard({
  thermometer,
  isActive,
  onSelect,
  onUpdateThresholds,
  onResetStats,
  onUnlink,
}: ThermometerCardProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    id,
    name,
    location,
    model,
    status,
    currentTemp,
    minTemp,
    maxTemp,
    averageTemp,
    highThreshold,
    lowThreshold,
    batteryAlert,
    signalStrength,
    lastUpdated,
  } = thermometer;

  const isOffline = status === "offline";
  const [lclLow, setLclLow] = useState(lowThreshold);
  const [lclHigh, setLclHigh] = useState(highThreshold);

  const submitThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    onUpdateThresholds(id, lclLow, lclHigh);
    setTimeout(() => {
      setIsUpdating(false);
      setShowConfig(false);
    }, 400);
  };

  const getStatusConfig = (currStatus: ThermometerStatus) => {
    switch (currStatus) {
      case "danger":
        return {
          bgColor: "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/60",
          textColor: "text-rose-600 dark:text-rose-400",
          pillClass: "bg-rose-500 text-white animate-pulse",
          gaugeColor: "bg-rose-500",
          statusLabel: "Critical Breach",
        };
      case "warning":
        return {
          bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40",
          textColor: "text-amber-600 dark:text-amber-400",
          pillClass: "bg-amber-500 text-white",
          gaugeColor: "bg-amber-500",
          statusLabel: "Limit Warning",
        };
      case "offline":
        return {
          bgColor: "bg-gray-50/50 border-gray-100 dark:bg-gray-900/20 dark:border-gray-800/40",
          textColor: "text-gray-400 dark:text-gray-500",
          pillClass: "bg-gray-400 text-white dark:bg-gray-700",
          gaugeColor: "bg-gray-300 dark:bg-gray-700",
          statusLabel: "Awaiting Reading",
        };
      case "online":
      default:
        return {
          bgColor: "bg-cyan-50/20 border-gray-100 dark:bg-cyan-900/5 dark:border-gray-800/80",
          textColor: "text-cyan-600 dark:text-cyan-400",
          pillClass: "bg-teal-500 text-white",
          gaugeColor: "bg-cyan-500",
          statusLabel: "Online",
        };
    }
  };

  const visualStyle = getStatusConfig(status);

  const renderSignalBars = (strength: number) => {
    if (isOffline || strength <= 0) return <WifiOff className="h-4 w-4 text-gray-300 dark:text-gray-600" />;
    return (
      <div className="flex items-end gap-0.5" title={`${strength} Signal Bars`}>
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={`w-0.5 rounded-sm ${
              bar <= strength ? "bg-cyan-500 dark:bg-cyan-400" : "bg-gray-200 dark:bg-gray-800"
            }`}
            style={{ height: `${bar * 3.5}px` }}
          />
        ))}
      </div>
    );
  };

  const renderBattery = (hasAlert: boolean) => {
    return (
      <div
        className={`flex items-center gap-1 ${hasAlert ? "text-rose-500" : "text-gray-400 dark:text-gray-500"}`}
        title={hasAlert ? "Battery alert active" : "Battery OK"}
      >
        {hasAlert ? <BatteryWarning className="h-4 w-4 text-rose-500" /> : <Battery className="h-4 w-4" />}
        <span className="font-mono text-10px font-medium">{hasAlert ? "Alert" : "OK"}</span>
      </div>
    );
  };

  const limitRange = highThreshold - lowThreshold;
  const percentagePos = Math.min(Math.max(((currentTemp - lowThreshold) / (limitRange || 1)) * 100, 0), 100);

  const formatLastUpdated = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div
      id={id}
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 transition-all duration-355 hover:shadow-md hover:translate-y-[-2px] ${
        isActive
          ? "border-indigo-500 ring-4 ring-indigo-500/10 bg-white dark:bg-slate-900"
          : "border-slate-100/80 hover:border-slate-200/90 bg-white dark:border-slate-800/60 dark:bg-slate-905/45 dark:hover:bg-slate-900/65"
      }`}
    >
      <div className={`h-1.5 w-full ${visualStyle.gaugeColor} transition-all duration-300`} />

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3.5 flex items-start justify-between">
          <div onClick={onSelect} className="cursor-pointer flex-1">
            <h4 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 hover:text-indigo-600 transition-colors">
              {name}
            </h4>
            <p className="font-sans text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">{location}</p>
          </div>
          <div className="flex items-center gap-2.5">
            {renderBattery(batteryAlert)}
            {renderSignalBars(signalStrength)}
          </div>
        </div>

        <div
          onClick={onSelect}
          className={`group cursor-pointer rounded-2xl p-4.5 transition-all duration-300 border ${visualStyle.bgColor} flex items-center justify-between hover:brightness-102 hover:scale-[1.01]`}
        >
          <div className="flex flex-col">
            <span className="font-display text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none">
              Sensor Reading
            </span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span
                className={`font-mono text-4xl font-extrabold tracking-tighter ${
                  isOffline ? "text-slate-350 dark:text-slate-700" : "text-slate-950 dark:text-white"
                }`}
              >
                {isOffline ? "--.-" : currentTemp.toFixed(1)}
              </span>
              <span className="font-display text-base font-bold text-slate-400 dark:text-slate-500">C</span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between self-stretch text-right">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase ${visualStyle.pillClass}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white opacity-95"></span>
              {visualStyle.statusLabel}
            </span>
            <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 font-medium">
              Update: {formatLastUpdated(lastUpdated)}
            </span>
          </div>
        </div>

        {!isOffline && (
          <div className="my-4">
            <div className="mb-1 flex items-center justify-between text-[9px] font-semibold text-gray-400 uppercase tracking-widest dark:text-gray-500">
              <span>Low {lowThreshold} C</span>
              <span>High {highThreshold} C</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`absolute h-full rounded-full ${visualStyle.gaugeColor} opacity-70`}
                style={{
                  left: `${Math.min(percentagePos, 50)}%`,
                  right: `${100 - Math.max(percentagePos, 50)}%`,
                }}
              />
              <div
                className="absolute h-3 w-3 -translate-y-1/2 rounded-full border border-white bg-cyan-600 shadow-md transition-all duration-200 dark:border-gray-950"
                style={{
                  left: `calc(${percentagePos}% - 6px)`,
                  top: "50%",
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-4.5 grid grid-cols-3 gap-2.5">
          {[
            { label: "Min", value: minTemp, icon: <TrendingDown className="h-2.5 w-2.5 text-cyan-500" /> },
            { label: "Max", value: maxTemp, icon: <TrendingUp className="h-2.5 w-2.5 text-rose-500" /> },
            { label: "Average", value: averageTemp, icon: <Activity className="h-2.5 w-2.5 text-indigo-500" /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-slate-50/60 p-2 text-center dark:bg-slate-800/25 border border-slate-100/40 dark:border-slate-800/10"
            >
              <div className="flex items-center justify-center gap-0.5 font-display text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none">
                {stat.icon}
                {stat.label}
              </div>
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-350 block mt-1">
                {isOffline ? "--.-" : `${stat.value.toFixed(1)} C`}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60">
          {showConfig ? (
            <form onSubmit={submitThresholds} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  Alarm Thresholds (C)
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="font-sans text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-sans text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Low Trigger limit
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={lclLow}
                    onChange={(e) => setLclLow(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-100 bg-gray-50 p-1.5 text-center font-mono text-xs font-bold text-gray-800 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-sans text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    High Trigger limit
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={lclHigh}
                    onChange={(e) => setLclHigh(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-100 bg-gray-50 p-1.5 text-center font-mono text-xs font-bold text-gray-800 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full cursor-pointer rounded-lg bg-cyan-600 p-2 text-center font-sans text-[11px] font-bold text-white shadow-sm hover:bg-cyan-500 transition disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Apply Alarm Limits"}
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-1">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowConfig(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-650 dark:border-slate-800/80 dark:bg-slate-900 dark:hover:text-slate-250 transition"
                  title="Configure Alarm Thresholds"
                >
                  <Sliders className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onResetStats(id)}
                  className="font-display font-semibold text-[10px] text-slate-400 hover:text-slate-600 px-2.5 border border-slate-100 hover:bg-slate-50 rounded-xl h-8 flex items-center justify-center dark:border-slate-800 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition"
                  title="Reset Session Min/Max/Avg Statistics"
                >
                  Reset
                </button>
              </div>

              <button
                onClick={() => {
                  if (confirm(`Confirm removal of ${name}?`)) {
                    onUnlink(id);
                  }
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:border-rose-100 hover:bg-rose-50/70 hover:text-rose-600 dark:hover:bg-rose-950/25 transition"
                title="Unregister Thermometer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
