import { formatPercent, formatSignedInt, lowerLabel } from "@/lib/format";
import type { ScoreChangeFactor } from "@/lib/types";

/** Diverging bars: which data areas pushed the score down (left) or up (right) over four weeks. */
export function ChangeBreakdown({ factors, change }: { factors: ScoreChangeFactor[]; change: number }) {
  if (factors.length === 0) {
    return <p className="text-[13px] text-ink-3">The score has been stable for the last four weeks.</p>;
  }

  const max = Math.max(...factors.map((f) => Math.abs(f.points)), 0.5);
  const down = factors.filter((f) => f.points < 0);
  const up = factors.filter((f) => f.points > 0);
  const lead = change < 0 ? down : up;

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-ink-2">
        Score {change < 0 ? "fell" : change > 0 ? "rose" : "held"}{" "}
        <span className={`tabular font-semibold ${change < 0 ? "text-risk-high-ink" : change > 0 ? "text-risk-low-ink" : "text-ink"}`}>{formatSignedInt(change)}</span> in four weeks
        {lead.length ? (
          <>
            {". "}
            The {change < 0 ? "drop" : "rise"} came{" "}
            {lead
              .slice(0, 3)
              .map((f) => `${formatPercent(f.share)} from ${lowerLabel(f.label)}`)
              .join(", ")}
            .
          </>
        ) : (
          "."
        )}
      </p>
      <div className="mt-4 space-y-1.5">
        {factors.map((f) => (
          <div key={f.key} className="grid grid-cols-[1fr_96px_1fr] items-center gap-2 sm:grid-cols-[1fr_128px_1fr]">
            <div className="flex h-4 justify-end">
              {f.points < 0 ? <div className="h-full rounded-l-[4px] bg-risk-high/85" style={{ width: `${(Math.abs(f.points) / max) * 100}%` }} /> : null}
            </div>
            <p className="truncate text-center text-xs text-ink-2">
              {f.label} <span className="tabular font-mono text-[10.5px] text-ink-3">{f.points > 0 ? "+" : "−"}{Math.abs(f.points).toFixed(1)}</span>
            </p>
            <div className="flex h-4">
              {f.points > 0 ? <div className="h-full rounded-r-[4px] bg-risk-low/85" style={{ width: `${(f.points / max) * 100}%` }} /> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_96px_1fr] text-[11px] text-ink-3 sm:grid-cols-[1fr_128px_1fr]">
        <span className="text-right">pulled down</span>
        <span />
        <span>pushed up</span>
      </div>
    </div>
  );
}
