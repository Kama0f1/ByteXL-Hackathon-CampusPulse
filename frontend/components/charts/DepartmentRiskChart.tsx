import { ChartLegend } from "@/components/charts/ChartTooltip";
import { formatShare } from "@/lib/format";
import type { DepartmentRisk } from "@/lib/types";

const ROWS = [
  { key: "academicHigh", label: "Academic", bar: "bg-academic" },
  { key: "placementHigh", label: "Placement", bar: "bg-placement" },
] as const;

/** Paired horizontal bars: share of each department's students at high academic vs placement risk. */
export function DepartmentRiskChart({ departments }: { departments: DepartmentRisk[] }) {
  if (departments.length === 0) {
    return <p className="text-sm text-ink-3">No department data yet.</p>;
  }

  const shares = departments.flatMap((d) => [d.academicHigh / d.students, d.placementHigh / d.students]);
  const scaleMax = Math.max(0.05, Math.ceil((Math.max(...shares) * 100) / 5) * 0.05);

  return (
    <div className="space-y-4">
      <ChartLegend items={ROWS.map((r) => ({ label: `${r.label}: high`, swatch: r.bar }))} />
      <dl className="space-y-3.5">
        {departments.map((d) => (
          <div key={d.department} className="grid grid-cols-[84px_1fr] items-center gap-x-3 sm:grid-cols-[104px_1fr]">
            <dt className="text-[13px] leading-tight">
              <span className="block font-medium text-ink">{d.department}</span>
              <span className="text-[11px] text-ink-3">{d.students} students</span>
            </dt>
            <dd className="space-y-1">
              {ROWS.map((row) => {
                const count = d[row.key];
                const share = count / d.students;
                return (
                  <div key={row.key} className="group flex items-center gap-2" title={`${d.department}, ${row.label.toLowerCase()} risk high: ${count} of ${d.students}`}>
                    <span className="sr-only">{row.label} risk high: </span>
                    <div className="h-2.5 flex-1">
                      <div
                        className={`h-full rounded-r-[4px] ${row.bar} transition-opacity group-hover:opacity-75`}
                        style={{ width: `${(share / scaleMax) * 100}%` }}
                      />
                    </div>
                    <span className="tabular w-[76px] shrink-0 text-right text-xs text-ink-2">
                      {formatShare(count, d.students)} <span className="text-ink-3">({count})</span>
                    </span>
                  </div>
                );
              })}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-3">Bars share a 0-{Math.round(scaleMax * 100)}% scale.</p>
    </div>
  );
}
