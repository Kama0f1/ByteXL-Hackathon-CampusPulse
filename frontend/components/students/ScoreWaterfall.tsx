"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { StudentSignal } from "@/lib/types";

type ScoreWaterfallProps = {
  signals: StudentSignal[];
  score: number;
};

/**
 * Where the missing points went: each data area's weight times its gap from 100,
 * stepped down from a perfect score to the student's score.
 */
export function ScoreWaterfall({ signals, score }: ScoreWaterfallProps) {
  const [active, setActive] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const steps = signals
    .map((s) => ({ ...s, lost: s.weight * (100 - s.value) }))
    .sort((a, b) => b.lost - a.lost);

  const rows = steps.map((s, i) => {
    const from = 100 - steps.slice(0, i).reduce((sum, p) => sum + p.lost, 0);
    return { ...s, from, to: from - s.lost };
  });
  const totalLost = 100 - score;
  const top = rows[0];

  return (
    <div>
      <p className="mb-4 text-[13px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">{top.label}</span> costs the most:{" "}
        <span className="tabular font-semibold text-ink">{Math.round((top.lost / totalLost) * 100)}%</span> of the {totalLost} missing points.
      </p>
      <div className="space-y-1.5">
        <Row label="Perfect score" value="100" bar={{ from: 100, to: 0, tone: "bg-surface-3" }} muted />
        {rows.map((r, i) => (
          <div
            key={r.key}
            onPointerEnter={() => setActive(r.key)}
            onPointerLeave={() => setActive(null)}
            className={`grid grid-cols-[112px_1fr_64px] items-center gap-3 rounded-lg px-1 py-0.5 transition-colors sm:grid-cols-[140px_1fr_72px] ${active === r.key ? "bg-surface-2" : ""}`}
          >
            <span className="truncate text-[13px] text-ink-2">
              {r.label}
              <span className="ml-1.5 font-mono text-[10.5px] text-ink-3">x{r.weight.toFixed(2)}</span>
            </span>
            <div className="relative h-5">
              <div className="absolute inset-y-[9px] left-0 right-0 bg-gridline" />
              <motion.div
                className={`absolute inset-y-0 rounded-[4px] ${r.band >= 3 ? "bg-risk-high" : r.band === 2 ? "bg-risk-medium" : "bg-ink-3/60"}`}
                style={{ left: `${r.to}%`, width: `${Math.max(0.6, r.from - r.to)}%`, originX: 1 }}
                initial={reduce ? false : { scaleX: 0, opacity: 0 }}
                whileInView={{ scaleX: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.1 + i * 0.07, ease: [0.23, 1, 0.32, 1] }}
              />
              <div className="absolute inset-y-[-2px] w-px bg-line-strong" style={{ left: `${r.to}%` }} />
            </div>
            <span className="tabular text-right font-mono text-xs text-ink-2">−{r.lost.toFixed(1)}</span>
          </div>
        ))}
        <Row label="Success score" value={String(score)} bar={{ from: score, to: 0, tone: "bg-inverse" }} strong />
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Points lost = area weight x gap to 100. {active ? `${steps.find((s) => s.key === active)?.evidence.join(", ")}.` : "Hover a row for the raw indicators."}
      </p>
    </div>
  );
}

function Row({ label, value, bar, muted, strong }: { label: string; value: string; bar: { from: number; to: number; tone: string }; muted?: boolean; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[112px_1fr_64px] items-center gap-3 px-1 py-0.5 sm:grid-cols-[140px_1fr_72px]">
      <span className={`text-[13px] ${strong ? "font-semibold text-ink" : "text-ink-3"}`}>{label}</span>
      <div className="relative h-5">
        <div className={`absolute inset-y-0 left-0 rounded-[4px] ${bar.tone} ${muted ? "opacity-70" : ""}`} style={{ width: `${bar.from - bar.to}%` }} />
      </div>
      <span className={`tabular text-right font-mono text-xs ${strong ? "font-semibold text-ink" : "text-ink-3"}`}>{value}</span>
    </div>
  );
}
