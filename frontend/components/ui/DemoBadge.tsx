import { InfoIcon, PulseIcon } from "@phosphor-icons/react/dist/ssr";
import type { DataOrigin } from "@/lib/types";

/** Quiet, always-visible marker of where the numbers come from. */
export function DemoBadge({ origin = "demo", className = "" }: { origin?: DataOrigin; className?: string }) {
  const live = origin === "api";
  return (
    <span
      title={
        live
          ? "Scores, risks and segments are computed by the backend from the seven campus datasets. Names, departments and weekly history are simulated."
          : "The backend is not reachable, so a simulated campus is shown. Start it with `python backend/main.py`."
      }
      className={`inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 ${className}`}
    >
      {live ? (
        <PulseIcon aria-hidden="true" weight="bold" className="h-3.5 w-3.5 text-risk-low-ink" />
      ) : (
        <InfoIcon aria-hidden="true" weight="bold" className="h-3.5 w-3.5 text-risk-medium-ink" />
      )}
      {live ? "Live data" : "Demo data"}
    </span>
  );
}

/** One-line footnote naming the data source behind the page. */
export function DemoFootnote({ endpoint, origin = "demo" }: { endpoint: string; origin?: DataOrigin }) {
  const code = <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px] text-ink-2">{endpoint}</code>;
  return (
    <p className="pt-2 text-xs leading-relaxed text-ink-3">
      {origin === "api" ? (
        <>
          Live from {code}. Scores, risks, predictions and segments come from the seven campus datasets; names, departments, subject split and the weekly
          history before this week are simulated around those real values, because the datasets are anonymised and have no dates.
        </>
      ) : (
        <>Simulated campus of invented students: the analytics backend is not reachable, so this page is not reading {code}.</>
      )}
    </p>
  );
}
