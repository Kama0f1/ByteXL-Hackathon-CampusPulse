"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { formatNumber } from "@/lib/format";
import type { ScoreBand } from "@/lib/types";

const BAND_TONE = ["bg-risk-high", "bg-risk-medium", "bg-ink-3", "bg-ink-2", "bg-ink"];

/** Students per Success Score band. Columns grow in on first view; hover reads exact counts. */
export function Histogram({ bands, total }: { bands: ScoreBand[]; total: number }) {
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const max = Math.max(...bands.map((b) => b.students), 1);

  return (
    <div>
      <div className="flex h-52 items-end gap-2.5 border-b border-baseline">
        {bands.map((band, i) => {
          const share = (band.students / total) * 100;
          return (
            <button
              key={band.label}
              type="button"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`Score ${band.label}: ${band.students} students`}
              className="group flex h-full flex-1 flex-col items-center justify-end outline-none"
            >
              <span className={`tabular mb-1.5 text-xs font-semibold transition-colors ${active === i ? "text-ink" : "text-ink-2"}`}>
                {active === i ? `${share.toFixed(0)}%` : formatNumber(band.students)}
              </span>
              <motion.span
                className={`block w-full max-w-12 origin-bottom rounded-t-[6px] ${BAND_TONE[i] ?? "bg-ink"} ${active !== null && active !== i ? "opacity-40" : ""} transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-academic`}
                style={{ height: `${(band.students / max) * 82}%` }}
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2.5">
        {bands.map((band) => (
          <span key={band.label} className="flex-1 text-center font-mono text-[10.5px] text-ink-3">
            {band.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-3">Success Score bands. Red and amber bands are below the follow-up line.</p>
    </div>
  );
}
