import React, { useState } from "react";
import { Plus, X, HelpCircle, Thermometer } from "lucide-react";

interface AddThermometerModalProps {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    location: string;
    model: string;
    lowThreshold: number;
    highThreshold: number;
  }) => void;
}

export default function AddThermometerModal({ onClose, onAdd }: AddThermometerModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [model, setModel] = useState("SensiLink Ultra V1");
  const [lowThreshold, setLowThreshold] = useState(15.0);
  const [highThreshold, setHighThreshold] = useState(28.0);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Device label is required.");
      return;
    }
    if (!location.trim()) {
      setError("Physical location is required.");
      return;
    }
    if (lowThreshold >= highThreshold) {
      setError("Low alert threshold must be below the high alert threshold.");
      return;
    }

    onAdd({
      name: name.trim(),
      location: location.trim(),
      model,
      lowThreshold: +lowThreshold,
      highThreshold: +highThreshold,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm dark:bg-black/60" />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-indigo-600 to-cyan-500" />

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-display text-base font-extrabold text-slate-800 dark:text-gray-100">
              Register Thermometer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-50 hover:text-gray-650 dark:hover:bg-slate-800 dark:hover:text-gray-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-500 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-display text-[9.5px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-1.5">
                Device Label
              </label>
              <input
                type="text"
                placeholder="e.g., Attic Vent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-150 bg-white p-2.5 font-sans text-sm outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-display text-[9.5px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-1.5">
                Physical Location
              </label>
              <input
                type="text"
                placeholder="e.g., Attic Loft"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-150 bg-white p-2.5 font-sans text-sm outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-display text-[9.5px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-1.5">
              Device Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-slate-150 bg-white p-2.5 font-sans text-sm outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="SensiLink Ultra V1">SensiLink Ultra V1</option>
              <option value="Industrial-Grid T1000">Industrial-Grid T1000</option>
              <option value="AgroPulse Hydro 4X">AgroPulse Hydro 4X</option>
              <option value="CryoGlow SafeGuard-5">CryoGlow SafeGuard-5</option>
              <option value="EcoOutpost Solar 2">EcoOutpost Solar 2</option>
            </select>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-850 dark:bg-slate-800/10">
            <h4 className="mb-3 font-display text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-550" />
              Configure Alarm Protection Levels
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-display text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 dark:text-slate-500">
                  Low Warning Limit
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-150 bg-white p-2.5 text-center font-mono text-sm outline-none focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-display text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 dark:text-slate-500">
                  High Warning Limit
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={highThreshold}
                  onChange={(e) => setHighThreshold(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-150 bg-white p-2.5 text-center font-mono text-sm outline-none focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
              Incoming readings outside these thresholds trigger visual safety color shifts, server events, and alert counts.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-sans text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 font-sans text-xs font-bold text-white hover:bg-indigo-500 transition shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Register Thermometer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
