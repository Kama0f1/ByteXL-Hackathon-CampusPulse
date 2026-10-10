import type { FollowUpActionSummary, RiskDomain } from "@/lib/types";

const GROUPS: { domain: RiskDomain; title: string; bar: string }[] = [
  { domain: "academic", title: "Academic support", bar: "bg-academic" },
  { domain: "placement", title: "Placement readiness", bar: "bg-placement" },
];

/** Suggested follow-ups for flagged students, grouped by the risk they address. */
export function FollowUpActions({ actions }: { actions: FollowUpActionSummary[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-ink-3">No follow-ups suggested right now.</p>;
  }
  const max = Math.max(...actions.map((a) => a.students));

  return (
    <div className="space-y-5">
      {GROUPS.map((group) => {
        const items = actions.filter((a) => a.domain === group.domain);
        if (items.length === 0) return null;
        return (
          <div key={group.domain}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-3">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${group.bar}`} />
              {group.title}
            </h3>
            <ul className="space-y-2.5">
              {items.map((a) => (
                <li key={a.actionId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-ink">{a.label}</p>
                    <p className="tabular text-sm font-semibold text-ink">{a.students}</p>
                  </div>
                  <p className="text-xs text-ink-3">{a.description}</p>
                  <div className="mt-1.5 h-1.5">
                    <div className={`h-full rounded-r-full ${group.bar} opacity-80`} style={{ width: `${(a.students / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
