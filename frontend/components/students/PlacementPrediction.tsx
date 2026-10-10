import { TargetIcon } from "@phosphor-icons/react/dist/ssr";

/** The placement model's prediction for one student, shown as a probability with a plain verdict. */
export function PlacementPrediction({ probability, semester, mainGap }: { probability: number; semester: number; mainGap?: string }) {
  const pct = Math.round(probability * 100);
  const verdict = pct >= 70 ? "Likely to be placed" : pct >= 40 ? "Could go either way" : "At risk of missing placement";
  const tone = pct >= 70 ? "bg-risk-low" : pct >= 40 ? "bg-risk-medium" : "bg-risk-high";
  const ink = pct >= 70 ? "text-risk-low-ink" : pct >= 40 ? "text-risk-medium-ink" : "text-risk-high-ink";

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-medium text-ink-3">
        <TargetIcon aria-hidden="true" className="h-4 w-4" /> Placement model prediction
      </p>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="tabular text-4xl font-semibold tracking-[-0.04em] text-ink">{pct}%</span>
        <span className="text-sm text-ink-2">chance of being placed</span>
      </p>
      <div className="relative mt-3 h-2.5 rounded-full bg-surface-3" role="meter" aria-label="Placement probability" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        <div aria-hidden="true" className="absolute -top-1 h-[18px] w-px bg-ink-3" style={{ left: "40%" }} />
        <div aria-hidden="true" className="absolute -top-1 h-[18px] w-px bg-ink-3" style={{ left: "70%" }} />
      </div>
      <p className={`mt-3 text-sm font-semibold ${ink}`}>{verdict}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
        {semester >= 7 ? "Final year: placement season is now." : `Semester ${semester}: there is time to build readiness before placement season.`}
        {mainGap && pct < 70 ? ` Biggest gap: ${mainGap.toLowerCase()}.` : ""}
      </p>
    </div>
  );
}
