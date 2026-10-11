import type { CampusInsight } from "@/lib/types";

const DOMAIN = {
  academic: { label: "Academic", bar: "bg-academic", metric: "text-academic" },
  placement: { label: "Placement", bar: "bg-placement", metric: "text-placement" },
  campus: { label: "Campus-wide", bar: "bg-ink-3", metric: "text-ink" },
} as const;

/** Findings from the joined data: a headline number, what it means, and the evidence behind it. */
export function InsightGrid({ insights }: { insights: CampusInsight[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => {
        const d = DOMAIN[insight.domain ?? "campus"];
        return (
          <li key={insight.id} className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 p-5">
            <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] ${d.bar}`} />
            <div className="flex items-start justify-between gap-3">
              <p className={`tabular text-[32px] font-semibold leading-none tracking-[-0.03em] ${d.metric}`}>{insight.metric}</p>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-2 ring-1 ring-line">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${d.bar}`} />
                {d.label}
              </span>
            </div>
            <p className="mt-4 text-balance text-[15px] font-semibold leading-snug text-ink">{insight.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{insight.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}
