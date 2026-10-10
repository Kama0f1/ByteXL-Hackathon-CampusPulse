"use client";

import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import type { CampusSignalRow } from "@/lib/types";

type SignalHeatmapProps = {
  rows: CampusSignalRow[];
  weeks: string[];
  students: number;
};

/**
 * Data areas × weeks. Each cell is the share of students flagged in that area that week,
 * on a single-hue sequential scale (more red = more students flagged).
 */
export function SignalHeatmap({ rows, weeks, students }: SignalHeatmapProps) {
  const [hover, setHover] = useState<{ r: number; w: number } | null>(null);
  const all = rows.flatMap((r) => r.shares);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const intensity = (v: number) => 8 + ((v - min) / (max - min || 1)) * 80;

  const hovered = hover ? { row: rows[hover.r], week: weeks[hover.w], value: rows[hover.r].shares[hover.w] } : null;

  return (
    <div>
      <div className="relative overflow-x-auto pb-1">
        <table className="w-full min-w-[620px] border-separate border-spacing-[3px] text-left">
          <caption className="sr-only">Share of students flagged in each data area, by week</caption>
          <thead>
            <tr>
              <th scope="col" className="w-36 pb-1 text-[11px] font-medium text-ink-3">
                Data area
              </th>
              {weeks.map((w, i) => (
                <th key={w} scope="col" className={`pb-1 text-center font-mono text-[10.5px] font-normal ${hover?.w === i ? "text-ink" : "text-ink-3"}`}>
                  {w}
                </th>
              ))}
              <th scope="col" className="w-28 pb-1 pl-3 text-right text-[11px] font-medium text-ink-3">
                Flagged now
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => {
              const delta = row.shares[row.shares.length - 1] - row.shares[0];
              return (
                <tr key={row.key}>
                  <th scope="row" className={`pr-2 text-[13px] font-medium ${hover?.r === r ? "text-ink" : "text-ink-2"}`}>
                    {row.label}
                  </th>
                  {row.shares.map((v, w) => (
                    <td
                      key={w}
                      onPointerEnter={() => setHover({ r, w })}
                      onPointerLeave={() => setHover(null)}
                      className={`h-9 min-w-9 rounded-md transition-[outline-color] duration-150 ${hover?.r === r && hover?.w === w ? "outline-2 outline-ink" : "outline-2 outline-transparent"}`}
                      style={{ backgroundColor: `color-mix(in srgb, var(--risk-high) ${intensity(v)}%, var(--surface-2))` }}
                    >
                      <span className="sr-only">
                        {weeks[w]}: {v}% flagged
                      </span>
                    </td>
                  ))}
                  <td className="pl-3 text-right">
                    <span className="tabular text-sm font-semibold text-ink">{row.flaggedNow}</span>
                    <span
                      className={`ml-2 inline-flex items-center gap-0.5 font-mono text-[11px] ${delta > 1 ? "text-risk-high-ink" : delta < -1 ? "text-risk-low-ink" : "text-ink-3"}`}
                      title={`${delta > 0 ? "+" : ""}${delta.toFixed(1)} points since ${weeks[0]}`}
                    >
                      {delta > 1 ? <TrendUpIcon aria-hidden="true" weight="bold" /> : delta < -1 ? <TrendDownIcon aria-hidden="true" weight="bold" /> : null}
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(0)}pt
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex min-h-10 flex-wrap items-center justify-between gap-3 text-xs text-ink-3">
        <p aria-live="polite" className="text-[13px] text-ink-2">
          {hovered ? (
            <>
              <span className="font-semibold text-ink">{hovered.row.label}</span>, {hovered.week}:{" "}
              <span className="tabular font-semibold text-ink">{hovered.value}%</span> of students flagged (about{" "}
              {Math.round((hovered.value / 100) * students)})
            </>
          ) : (
            "Hover a cell to read the week. Rising red rows are where students are slipping."
          )}
        </p>
        <div className="flex items-center gap-2">
          <span>{Math.round(min)}%</span>
          <span
            aria-hidden="true"
            className="h-2 w-28 rounded-full"
            style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--risk-high) 8%, var(--surface-2)), color-mix(in srgb, var(--risk-high) 88%, var(--surface-2)))" }}
          />
          <span>{Math.round(max)}% flagged</span>
        </div>
      </div>
    </div>
  );
}
