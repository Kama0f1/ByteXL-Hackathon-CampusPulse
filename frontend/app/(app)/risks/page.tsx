import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "@/components/charts/LineChart";
import { DepartmentRiskChart } from "@/components/charts/DepartmentRiskChart";
import { DriverBars } from "@/components/risks/DriverBars";
import { RiskMatrixExplorer } from "@/components/risks/RiskMatrixExplorer";
import { Avatar } from "@/components/ui/Avatar";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { InfoTip } from "@/components/ui/InfoTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { formatSignedInt } from "@/lib/format";
import { getRiskReport } from "@/lib/risks";
import { getStudents } from "@/lib/students";

export const metadata: Metadata = {
  title: "Risks",
};

export default async function RisksPage() {
  const [{ data: report }, { data: rows }] = await Promise.all([getRiskReport(), getStudents()]);
  const weeks = report.weeklyRisk.map((w) => w.week);
  const predicted = rows.filter((r) => r.semester >= 7 && r.placementProbability < 0.4).sort((a, b) => a.placementProbability - b.placementProbability);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risks"
        description={
          <>
            <strong className="font-semibold text-ink">{report.flagged.length}</strong> students are high risk on at least one track. Academic and placement risk are
            scored separately, because a topper can still be unready for placements.
          </>
        }
      />

      <Panel
        index={1}
        title={
          <>
            Who is at risk on which track?{" "}
            <InfoTip align="left">
              Each student has two risk levels. Rows are academic risk, columns are placement risk. The top-left cell is students who are high risk on both.
            </InfoTip>
          </>
        }
        description="Click any cell to see the students in it."
      >
        <RiskMatrixExplorer matrix={report.matrix} rows={rows} />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel index={2} title="What is driving risk across campus?" description="The main reason behind each student at medium or high risk.">
          <DriverBars drivers={report.drivers} />
        </Panel>
        <Panel index={3} title="Is risk going up or down?" description="Students flagged high risk at the end of each week.">
          <LineChart
            ariaLabel="High-risk students by week"
            labels={weeks}
            series={[
              { key: "academic", label: "Academic", values: report.weeklyRisk.map((w) => w.academicHigh), stroke: "stroke-academic", fill: "fill-academic", swatch: "bg-academic", text: "text-academic" },
              { key: "placement", label: "Placement", values: report.weeklyRisk.map((w) => w.placementHigh), stroke: "stroke-placement", fill: "fill-placement", swatch: "bg-placement", text: "text-placement" },
            ]}
            height={280}
          />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          index={4}
          className="xl:col-span-7"
          title={`Newly flagged this month (${report.newlyFlagged.length})`}
          description="Students who were not high risk four weeks ago. Catching them now is the point of early warning."
          action={
            <Link href="/students?risk=any-high" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
              All flagged <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {report.newlyFlagged.slice(0, 10).map((r) => (
              <li key={r.studentId}>
                <Link href={`/students/${r.studentId}`} className="pressable flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 hover:border-line-strong hover:bg-surface">
                  <Avatar name={r.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{r.name}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {r.academicRisk === "high" ? <RiskBadge domain="academic" level="high" /> : null}
                      {r.placementRisk === "high" ? <RiskBadge domain="placement" level="high" /> : null}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="tabular block text-sm font-semibold text-ink">{r.successScore}</span>
                    <span className={`tabular block font-mono text-[11px] ${r.scoreChange < 0 ? "text-risk-high-ink" : "text-ink-3"}`}>{formatSignedInt(r.scoreChange)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel index={5} className="xl:col-span-5" title="Which departments need support?" description="Share of each department's students at high risk.">
          <DepartmentRiskChart departments={report.departmentRisk} />
        </Panel>
      </div>

      <Panel
        index={6}
        title={`Final-years predicted to miss placement (${predicted.length})`}
        description="Semester 7 students the placement model gives under a 40% chance. Placement season is now, so these come first."
        action={
          <Link href="/students?risk=placement-high" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
            Placement high <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {predicted.slice(0, 12).map((r) => (
            <li key={r.studentId}>
              <Link href={`/students/${r.studentId}`} className="pressable flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 hover:border-line-strong hover:bg-surface">
                <Avatar name={r.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{r.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {r.department}, coding {r.codingScore}/100
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-sm font-semibold text-risk-high-ink">{Math.round(r.placementProbability * 100)}%</span>
                  <span className="block text-[10px] text-ink-3">chance</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <DemoFootnote endpoint="GET /api/risks" />
    </div>
  );
}
