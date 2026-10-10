"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ChartLegend, ChartTooltip } from "@/components/charts/ChartTooltip";
import { useWidth } from "@/components/charts/useWidth";

export type LineSeries = {
  key: string;
  label: string;
  values: number[];
  /** Tailwind classes: stroke for the line, fill for markers, bg for legend swatches. */
  stroke: string;
  fill: string;
  swatch: string;
  /** Text colour class used to tint the area fill, e.g. "text-academic". */
  text: string;
};

type LineChartProps = {
  labels: string[];
  series: LineSeries[];
  height?: number;
  /** Fixed y-range; defaults to 0..nice max. */
  yDomain?: [number, number];
  formatValue?: (v: number) => string;
  /** Accessible description of what the chart shows. */
  ariaLabel: string;
  /** Soft area under a single series. */
  area?: boolean;
  showLegend?: boolean;
};

function niceMax(value: number) {
  const step = value > 200 ? 50 : value > 60 ? 20 : 10;
  return Math.max(step, Math.ceil(value / step) * step);
}

/** Line chart with crosshair tooltip, arrow-key reading and end labels. */
export function LineChart({ labels, series, height = 260, yDomain, formatValue = (v) => String(v), ariaLabel, area = false, showLegend = true }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const compact = width < 480;
  const pad = { top: 14, right: compact ? 44 : 92, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const all = series.flatMap((s) => s.values);
  const [y0, y1] = yDomain ?? [0, niceMax(Math.max(...all))];
  const ticks = Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) / 4) * i);
  const last = labels.length - 1;
  const x = (i: number) => pad.left + (last === 0 ? plotW / 2 : (plotW * i) / last);
  const y = (v: number) => pad.top + plotH - ((v - y0) / (y1 - y0)) * plotH;
  const labelEvery = compact ? 3 : labels.length > 8 ? 2 : 1;

  function indexFromClientX(clientX: number, target: SVGSVGElement) {
    const rect = target.getBoundingClientRect();
    const rel = ((clientX - rect.left) / rect.width) * width - pad.left;
    return Math.round(Math.min(1, Math.max(0, rel / plotW)) * last);
  }

  function onKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const d = event.key === "ArrowRight" ? 1 : -1;
      setActive((c) => Math.min(last, Math.max(0, (c ?? last) + d)));
    } else if (event.key === "Escape") setActive(null);
  }

  // End labels: keep at least 15px apart so close finishing values don't overlap.
  const endY = new Map<string, number>();
  [...series]
    .sort((a, b) => y(a.values[last]) - y(b.values[last]))
    .forEach((s, i, arr) => {
      const prev = i > 0 ? endY.get(arr[i - 1].key)! : -Infinity;
      endY.set(s.key, Math.max(y(s.values[last]), prev + 15));
    });

  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), 80), width - 80);

  return (
    <div className="space-y-3">
      {showLegend && series.length > 1 ? <ChartLegend items={series.map((s) => ({ label: s.label, swatch: s.swatch }))} /> : null}
      <div
        ref={ref}
        className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-academic"
        tabIndex={0}
        role="group"
        aria-label={`${ariaLabel}. Use left and right arrow keys to read values.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full touch-pan-y select-none"
          aria-hidden="true"
          onPointerMove={(e) => setActive(indexFromClientX(e.clientX, e.currentTarget))}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`area-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {ticks.map((t, i) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className={i === 0 ? "stroke-baseline" : "stroke-gridline"} strokeDasharray={i === 0 ? undefined : "2 4"} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 font-mono text-[10.5px]">
                {Math.round(t)}
              </text>
            </g>
          ))}

          {labels.map((label, i) =>
            i % labelEvery === 0 || i === last ? (
              <text key={label} x={x(i)} y={height - 6} textAnchor="middle" className={`font-mono text-[10.5px] ${active === i ? "fill-ink" : "fill-ink-3"}`}>
                {label}
              </text>
            ) : null,
          )}

          {active !== null ? <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + plotH} className="stroke-line-strong" /> : null}

          {series.map((s, si) => {
            const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
            const end = s.values[last];
            return (
              <g key={s.key} className={s.text}>
                {area ? <path d={`${d} L${x(last)},${y(y0)} L${x(0)},${y(y0)} Z`} fill={`url(#area-${s.key})`} /> : null}
                <motion.path
                  d={d}
                  fill="none"
                  className={s.stroke}
                  strokeWidth={2.25}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, delay: 0.15 + si * 0.12, ease: [0.23, 1, 0.32, 1] }}
                />
                <circle cx={x(last)} cy={y(end)} r={4.5} className={`${s.fill} stroke-surface`} strokeWidth={2} />
                <text x={x(last) + 10} y={endY.get(s.key)} dy="0.32em" className="fill-ink-2 text-[12px] font-medium">
                  {compact ? formatValue(end) : `${s.label} ${formatValue(end)}`}
                </text>
                {active !== null ? <circle cx={x(active)} cy={y(s.values[active])} r={5} className={`${s.fill} stroke-surface`} strokeWidth={2} /> : null}
              </g>
            );
          })}
        </svg>

        {active !== null ? (
          <ChartTooltip
            left={tooltipLeft}
            title={labels[active]}
            rows={series.map((s) => ({ label: s.label, value: formatValue(s.values[active]), swatch: s.swatch }))}
          />
        ) : null}
        <p className="sr-only" aria-live="polite">
          {active !== null ? `${labels[active]}: ${series.map((s) => `${s.label} ${formatValue(s.values[active])}`).join(", ")}` : ""}
        </p>
      </div>
    </div>
  );
}
