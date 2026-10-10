import { ChartLegend } from "@/components/charts/ChartTooltip";
import { formatPercent } from "@/lib/format";
import type { RiskDriverSummary } from "@/lib/types";

/** Campus-wide: how many flagged students have each factor as their main reason. */
export function DriverBars({ drivers }: { drivers: RiskDriverSummary[] }) {
  const shown = drivers.filter((d) => d.students > 0);
  const max = Math.max(...shown.map((d) => d.students), 1);

  return (
    <div className="space-y-4">
      <ChartLegend
        items={[
          { label: "Academic factor", swatch: "bg-academic" },
          { label: "Placement factor", swatch: "bg-placement" },
        ]}
      />
      <ul className="space-y-3">
        {shown.map((d) => (
          <li key={d.factor} className="group">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium text-ink">{d.factor}</span>
              <span className="tabular text-ink-2">
                <span className="font-semibold text-ink">{d.students}</span> students
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2.5 flex-1">
                <div
                  className={`h-full rounded-r-[4px] ${d.domain === "academic" ? "bg-academic" : "bg-placement"} transition-opacity group-hover:opacity-80`}
                  style={{ width: `${(d.students / max) * 100}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-[11px] text-ink-3">avg {formatPercent(d.averageShare)} of risk</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-3">Counted for every student at medium or high risk, by their main reason. &ldquo;Avg share&rdquo; is how much of the risk that factor explains when it appears.</p>
    </div>
  );
}
