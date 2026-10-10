import type { Metadata } from "next";
import { InterventionBoard } from "@/components/interventions/InterventionBoard";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { formatPercent } from "@/lib/format";
import { getInterventionReport } from "@/lib/interventions";

export const metadata: Metadata = {
  title: "Interventions",
};

export default async function InterventionsPage() {
  const { data: report } = await getInterventionReport();
  const count = (status: string) => report.interventions.filter((i) => i.status === status).length;
  const completed = report.outcomes.reduce((s, o) => s + o.completed, 0);
  const improved = report.outcomes.reduce((s, o) => s + o.improved, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interventions"
        description={
          <>
            Every flagged student gets a suggested follow-up. <strong className="font-semibold text-ink">{count("suggested")}</strong> are waiting for an owner,{" "}
            <strong className="font-semibold text-ink">{count("assigned") + count("in-progress")}</strong> are under way.
          </>
        }
      />

      <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
        <InterventionBoard initial={report.interventions} />
      </div>

      <Panel
        index={2}
        title="Did it work?"
        description={
          completed
            ? `${improved} of ${completed} completed follow-ups (${formatPercent(improved / completed)}) were followed by a higher Success Score.`
            : "No follow-ups have been completed yet."
        }
      >
        {report.outcomes.length ? (
          <div className="scroll-thin relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-ink-3">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Follow-up
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Completed
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Improved
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Avg score change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.outcomes.map((o) => (
                  <tr key={o.label}>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${o.domain === "academic" ? "bg-academic" : "bg-placement"}`} />
                        {o.label}
                      </span>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right text-ink-2">{o.completed}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full bg-risk-low" style={{ width: `${(o.improved / o.completed) * 100}%` }} />
                        </div>
                        <span className="tabular text-xs text-ink-2">
                          {o.improved}/{o.completed}
                        </span>
                      </div>
                    </td>
                    <td className={`tabular py-2.5 pl-3 text-right font-mono text-xs font-semibold ${o.averageGain > 0 ? "text-risk-low-ink" : o.averageGain < 0 ? "text-risk-high-ink" : "text-ink-3"}`}>
                      {o.averageGain > 0 ? "+" : ""}
                      {o.averageGain.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-ink-3">Early signal, not proof: score change is measured from the week each follow-up started.</p>
      </Panel>

      <DemoFootnote endpoint="GET /api/interventions" />
    </div>
  );
}
