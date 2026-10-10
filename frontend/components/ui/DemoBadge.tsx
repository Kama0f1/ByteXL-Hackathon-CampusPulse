import { InfoIcon } from "@phosphor-icons/react/dist/ssr";

/** Quiet, always-visible marker that the app is running on simulated data. */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Names and numbers are simulated for the demo. They are not findings about a real campus."
      className={`inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 ${className}`}
    >
      <InfoIcon aria-hidden="true" weight="bold" className="h-3.5 w-3.5 text-risk-medium-ink" />
      Demo data
    </span>
  );
}

/** One-line footnote for pages that render simulated values. */
export function DemoFootnote({ endpoint }: { endpoint: string }) {
  return (
    <p className="pt-2 text-xs leading-relaxed text-ink-3">
      Simulated campus of invented students for the demo. When the analytics service is live, this page reads{" "}
      <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px] text-ink-2">{endpoint}</code> (proposed endpoint).
    </p>
  );
}
