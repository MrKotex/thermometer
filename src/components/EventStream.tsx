import React, { useState } from "react";
import { SystemEvent } from "../types";
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Terminal,
  Clock
} from "lucide-react";

interface EventStreamProps {
  events: SystemEvent[];
}

export default function EventStream({ events }: EventStreamProps) {
  const [filterType, setFilterType] = useState<'all' | 'danger' | 'warning' | 'info'>('all');

  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-indigo-500 shrink-0" />;
    }
  };

  const getEventStyle = (type: string) => {
    switch (type) {
      case 'danger':
        return 'border-rose-105 bg-rose-50/40 dark:border-rose-950/20 dark:bg-rose-950/10';
      case 'warning':
        return 'border-amber-105 bg-amber-50/40 dark:border-amber-950/20 dark:bg-amber-950/10';
      case 'success':
        return 'border-emerald-105 bg-emerald-50/40 dark:border-emerald-950/20 dark:bg-emerald-950/10';
      case 'info':
      default:
        return 'border-indigo-100 bg-indigo-50/15 dark:border-indigo-950/15 dark:bg-indigo-950/5';
    }
  };

  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/40 backdrop-blur-xs">
      <div className="mb-4.5 flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-indigo-550 dark:text-indigo-400" />
          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
            System Telemetry Event Stream
          </h3>
        </div>
        
        {/* Toggle Filter Pill Badges */}
        <div className="flex gap-1 rounded-xl bg-slate-50 p-1 dark:bg-slate-800/60 border border-slate-100/50 dark:border-slate-800/20">
          <button
            onClick={() => setFilterType('all')}
            className={`cursor-pointer rounded-lg px-2.5 py-0.5 font-display text-[9.5px] font-extrabold tracking-wider uppercase transition ${
              filterType === 'all'
                ? "bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setFilterType('danger')}
            className={`cursor-pointer rounded-lg px-2.5 py-0.5 font-display text-[9.5px] font-extrabold tracking-wider uppercase transition ${
              filterType === 'danger'
                ? "bg-rose-500 text-white shadow-xs"
                : "text-rose-500 hover:bg-rose-50/70 dark:hover:bg-rose-950/20"
            }`}
          >
            Breaches
          </button>
          <button
            onClick={() => setFilterType('warning')}
            className={`cursor-pointer rounded-lg px-2.5 py-0.5 font-display text-[9.5px] font-extrabold tracking-wider uppercase transition ${
              filterType === 'warning'
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/20"
            }`}
          >
            Warnings
          </button>
          <button
            onClick={() => setFilterType('info')}
            className={`cursor-pointer rounded-lg px-2.5 py-0.5 font-display text-[9.5px] font-extrabold tracking-wider uppercase transition ${
              filterType === 'info'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-indigo-500 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/20"
            }`}
          >
            Info
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        {filteredEvents.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-sans text-xs text-gray-400 dark:text-gray-500">
              No matching occurrences report for the selected log filter.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${getEventStyle(evt.type)}`}
            >
              <div className="pt-0.5">{getEventIcon(evt.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    {evt.thermometerName}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[9px] text-gray-400 dark:text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatEventTime(evt.timestamp)}</span>
                  </div>
                </div>
                <p className="font-sans text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {evt.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
