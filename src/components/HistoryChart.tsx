import React, { useState, useRef, useEffect } from "react";
import { TempReading } from "../types";

interface HistoryChartProps {
  data: TempReading[];
  highThreshold: number;
  lowThreshold: number;
}

export default function HistoryChart({ data, highThreshold, lowThreshold }: HistoryChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(500);

  // Maintain container sizing for fluid columns
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width || 500);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-900/30">
        <span className="font-sans text-sm text-gray-400 dark:text-gray-500">
          No telemetry stream values cached for this device.
        </span>
      </div>
    );
  }

  // Dimensions
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = containerWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Extract temperatures
  const temps = data.map((d) => d.temperature);
  const dataMax = Math.max(...temps, highThreshold);
  const dataMin = Math.min(...temps, lowThreshold);

  // Pad the bounds slightly so the line never hits absolute top or bottom
  const valueRange = dataMax - dataMin;
  const minBound = +(dataMin - (valueRange > 0 ? valueRange * 0.15 : 2)).toFixed(1);
  const maxBound = +(dataMax + (valueRange > 0 ? valueRange * 0.15 : 2)).toFixed(1);
  const range = maxBound - minBound || 1;

  // Conversion helpers
  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (temp: number) => {
    const ratio = (temp - minBound) / range;
    return height - paddingBottom - ratio * chartHeight;
  };

  // Build the lines and points
  const points = data.map((d, index) => ({
    x: getX(index),
    y: getY(d.temperature),
    temp: d.temperature,
    time: d.timestamp,
    index,
  }));

  // Construct SVG Path definitions
  let linePath = "";
  let areaPath = "";

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }

    // Area path goes to bottom-right, then bottom-left, then closes
    const bottomY = height - paddingBottom;
    areaPath = `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }

  // Handle pointer tracking
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Find closest index
    let closestIndex = 0;
    let minDistance = Infinity;

    points.forEach((pt, index) => {
      const distance = Math.abs(pt.x - x);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setHoverIndex(closestIndex);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  // Format timestamp helper
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const selectedPoint = hoverIndex !== null ? points[hoverIndex] : null;

  // Find average of depicted logs
  const averageValue = +(temps.reduce((u, v) => u + v, 0) / temps.length).toFixed(1);

  // Color scheme helpers
  const getSeverityColor = (temp: number) => {
    if (temp >= highThreshold || temp <= lowThreshold) return "text-rose-500 stroke-rose-500 fill-rose-500";
    if (temp >= highThreshold - 1.0 || temp <= lowThreshold + 1.0) return "text-amber-500 stroke-amber-500 fill-amber-500";
    return "text-indigo-500 stroke-indigo-500 fill-indigo-500";
  };

  return (
    <div ref={containerRef} className="relative w-full rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/40 backdrop-blur-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
            Real-time Thermal Stream
          </h3>
          <p className="font-sans text-xs text-slate-400 dark:text-slate-500">
            Mapping {data.length} telemetry records over the current monitor loop
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-450">
              Avg: {averageValue}°C
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500/80"></span>
            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-450">
              Max Limit: {highThreshold}°C
            </span>
          </div>
        </div>
      </div>

      <div className="relative h-60 w-full select-none">
        <svg
          className="h-full w-full overflow-visible pointer-events-auto cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            {/* Soft gradient fill under line */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="warmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Guidelines on background */}
          {[minBound, +(minBound + range / 2).toFixed(1), maxBound].map((val, idx) => (
            <g key={`y-grid-${idx}`}>
              <line
                x1={paddingLeft}
                y1={getY(val)}
                x2={containerWidth - paddingRight}
                y2={getY(val)}
                className="stroke-gray-100 dark:stroke-gray-800/60"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 8}
                y={getY(val) + 4}
                textAnchor="end"
                className="fill-gray-400 font-mono text-[10px] dark:fill-gray-500"
              >
                {val}°
              </text>
            </g>
          ))}

          {/* High Danger Threshold guideline marker */}
          {highThreshold < maxBound && highThreshold > minBound && (
            <g key="high-thresh">
              <line
                x1={paddingLeft}
                y1={getY(highThreshold)}
                x2={containerWidth - paddingRight}
                y2={getY(highThreshold)}
                className="stroke-rose-400/40 dark:stroke-rose-500/30"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
              <text
                x={containerWidth - paddingRight - 4}
                y={getY(highThreshold) - 5}
                textAnchor="end"
                className="fill-rose-400 font-sans text-[9px] font-bold tracking-tight dark:fill-rose-500/80"
              >
                LIMIT HIGH {highThreshold}°C
              </text>
            </g>
          )}

          {/* Low Danger Threshold guideline marker */}
          {lowThreshold < maxBound && lowThreshold > minBound && (
            <g key="low-thresh">
              <line
                x1={paddingLeft}
                y1={getY(lowThreshold)}
                x2={containerWidth - paddingRight}
                y2={getY(lowThreshold)}
                className="stroke-rose-400/40 dark:stroke-rose-500/30"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
              <text
                x={containerWidth - paddingRight - 4}
                y={getY(lowThreshold) + 12}
                textAnchor="end"
                className="fill-rose-400 font-sans text-[9px] font-bold tracking-tight dark:fill-rose-500/80"
              >
                LIMIT LOW {lowThreshold}°C
              </text>
            </g>
          )}

          {/* Gradient backdrop fill under the main path */}
          {areaPath && (
            <path
              d={areaPath}
              className="fill-[url(#chartGradient)] transition-all duration-300"
            />
          )}

          {/* Stroke line path */}
          {linePath && (
            <path
              d={linePath}
              className="fill-none stroke-indigo-500 dark:stroke-indigo-400 transition-all duration-300"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active pointer crosshair & tooltip popup */}
          {selectedPoint && (
            <g>
              {/* Vertical line crosshair */}
              <line
                x1={selectedPoint.x}
                y1={paddingTop}
                x2={selectedPoint.x}
                y2={height - paddingBottom}
                className="stroke-gray-300 dark:stroke-gray-700"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* Data circle tracker */}
              <circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r={6}
                className={`stroke-white border dark:stroke-gray-950 ${getSeverityColor(selectedPoint.temp)}`}
                strokeWidth={2}
              />
              <circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r={2}
                className="fill-white"
              />
            </g>
          )}

          {/* Label time strings on X Axis */}
          {points.length > 1 && (
            <g>
              {/* Left boundary node */}
              <text
                x={paddingLeft}
                y={height - 8}
                textAnchor="start"
                className="fill-gray-400 font-sans text-[10px] dark:fill-gray-500"
              >
                {formatTime(points[0].time)}
              </text>
              {/* Mid boundary node */}
              {points.length > 5 && (
                <text
                  x={paddingLeft + chartWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-gray-400 font-sans text-[10px] dark:fill-gray-500"
                >
                  {formatTime(points[Math.floor(points.length / 2)].time)}
                </text>
              )}
              {/* Right boundary node */}
              <text
                x={containerWidth - paddingRight}
                y={height - 8}
                textAnchor="end"
                className="fill-gray-400 font-sans text-[10px] dark:fill-gray-500"
              >
                {formatTime(points[points.length - 1].time)}
              </text>
            </g>
          )}
        </svg>

        {/* Hover Floating Details Banner */}
        {selectedPoint && (
          <div
            className="absolute z-10 rounded-lg border border-gray-100 bg-white/95 p-2 shadow-lg backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95"
            style={{
              left: `${Math.min(
                Math.max(selectedPoint.x - 60, paddingLeft),
                containerWidth - 140
              )}px`,
              top: `${Math.min(Math.max(selectedPoint.y - 65, 5), height - 75)}px`,
            }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-[10px] uppercase tracking-wider text-gray-405 dark:text-gray-500">
                {formatTime(selectedPoint.time)}
              </span>
              <span className="font-sans text-xs font-semibold text-slate-800 dark:text-gray-100">
                Temp:{" "}
                <span className={selectedPoint.temp >= highThreshold || selectedPoint.temp <= lowThreshold ? "text-rose-500 font-bold" : "text-indigo-500 font-bold"}>
                  {selectedPoint.temp.toFixed(1)} °C
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
