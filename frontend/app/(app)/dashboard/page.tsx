import { ArrowRightIcon, BriefcaseIcon, GaugeIcon, GraduationCapIcon, HandshakeIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Histogram } from "@/components/charts/Histogram";
import { LineChart } from "@/components/charts/LineChart";
import { SignalHeatmap } from "@/components/charts/SignalHeatmap";
import { AttentionList } from "@/components/overview/AttentionList";
import { DepartmentRiskChart } from "@/components/charts/DepartmentRiskChart";
import { FollowUpActions } from "@/components/overview/FollowUpActions";
import { StartHere } from "@/components/overview/StartHere";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { InfoTip } from "@/components/ui/InfoTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { formatDate, formatSigned, lowerLabel } from "@/lib/format";
import { getAlerts } from "@/lib/alerts";
import { getInterventionReport } from "@/lib/interventions";
import { getCampusOverview } from "@/lib/overview";

export const metadata: Metadata = {
  title: "Overview",
};

const TONE_BAR = { strong: "bg-risk-low", mixed: "bg-academic", watch: "bg-risk-medium", support: "bg-risk-high" } as const;

export default async function OverviewPage() {
  const [{ data, origin }, { data: interventions }, { data: alertReport }] = await Promise.all([getCampusOverview(), getInterventionReport(), getAlerts()]);
  const newAlerts = alertReport.alerts.filter((a) => a.week === `W${alertReport.currentWeek.replace(/\D/g, "")}`);
  const unassigned = interventions.interventions.filter((i) => i.status === "suggested").length;
  const { summary } = data;
  const weeks = data.weeklyRisk.map((w) => w.week);
  const first = data.weeklyRisk[0];
  const last = data.weeklyRisk[data.weeklyRisk.length - 1];
  const totalFollowUps = data.followUpActions.reduce((s, a) => s + a.students, 0);
  // Plain-language headline from the payload: the two areas whose flagged share rose most.
  const rising = [...data.signalChart]
    .map((r) => ({ label: lowerLabel(r.label), delta: r.shares[r.shares.length - 1] - r.shares[0] }))
    .filter((r) => r.delta > 1)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2);
  const placementDelta = last.placementHigh - first.placementHigh;
  const placementTrend = Math.abs(placementDelta) <= 5 ? "is holding steady" : placementDelta > 0 ? "is rising" : "is easing";

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <span>
            {data.term}, {data.currentWeek.toLowerCase()} <span className="text-ink-3/70">|</span> updated {formatDate(data.generatedAt)}
          </span>
        }
        title={`${data.currentWeek} at a glance`}
        description={
          <>
            Academic high risk went from <strong className="font-semibold text-ink">{first.academicHigh}</strong> to{" "}
            <strong className="font-semibold text-ink">{last.academicHigh}</strong> students since {first.week}
            {rising.length ? `, with the biggest rises in ${rising.map((r) => r.label).join(" and ")}` : ""}. Placement risk {placementTrend}.
          </>
        }
      />

      <StartHere alerts={newAlerts.length} urgent={newAlerts.filter((a) => a.severity === "high").length} unassigned={unassigned} segments={data.segments.length} />

      <section aria-label="Key indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          index={1}
          label={
            <>
              Average success score
              <InfoTip>
                Every student gets a 0-100 score combining all seven data areas: academics 25%, attendance, LMS and placement 15% each, engagement,
                skills and feedback 10% each.
              </InfoTip>
            </>
          }
          icon={<GaugeIcon aria-hidden="true" className="h-4 w-4 text-ink-3" />}
          value={summary.averageSuccessScore}
          decimals={1}
          trend={data.weeklyScore}
          trendClassName="stroke-ink-2 text-ink-2"
          detail={
            <>
              <span className="font-medium text-ink-2">{formatSigned(summary.averageSuccessScoreChange)}</span> vs last week, across {summary.studentsTracked} students
            </>
          }
        />
        <StatTile
          index={2}
          label={
            <>
              Academic risk: high
              <InfoTip>Students likely to struggle in exams: low internals, attendance under the 75% rule, missed LMS work or backlogs.</InfoTip>
            </>
          }
          icon={<GraduationCapIcon aria-hidden="true" className="h-4 w-4 text-academic" />}
          value={summary.academicRisk.high}
          trend={data.weeklyRisk.map((w) => w.academicHigh)}
          trendClassName="stroke-academic text-academic"
          detail={`${summary.academicRisk.medium} more at medium risk`}
        />
        <StatTile
          index={3}
          label={
            <>
              Placement risk: high
              <InfoTip>Students likely to miss out in placement season: weak aptitude or coding scores, low skills ratings, few projects.</InfoTip>
            </>
          }
          icon={<BriefcaseIcon aria-hidden="true" className="h-4 w-4 text-placement" />}
          value={summary.placementRisk.high}
          trend={data.weeklyRisk.map((w) => w.placementHigh)}
          trendClassName="stroke-placement text-placement"
          detail={`${summary.placementRisk.medium} more at medium risk`}
        />
        <StatTile
          index={4}
          label="Open interventions"
          icon={<HandshakeIcon aria-hidden="true" className="h-4 w-4 text-ink-3" />}
          value={summary.openInterventions}
          detail={`${totalFollowUps} flagged students have a suggested follow-up`}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          index={5}
          className="xl:col-span-7"
          title="Is risk going up or down?"
          description="Students flagged high risk at the end of each teaching week, academic and placement tracked separately."
        >
          <LineChart
            ariaLabel="High-risk students by week"
            labels={weeks}
            series={[
              { key: "academic", label: "Academic", values: data.weeklyRisk.map((w) => w.academicHigh), stroke: "stroke-academic", fill: "fill-academic", swatch: "bg-academic", text: "text-academic" },
              { key: "placement", label: "Placement", values: data.weeklyRisk.map((w) => w.placementHigh), stroke: "stroke-placement", fill: "fill-placement", swatch: "bg-placement", text: "text-placement" },
            ]}
            height={280}
          />
        </Panel>

        <Panel
          index={6}
          className="xl:col-span-5 xl:row-span-2"
          title="Who needs help first?"
          description="Most urgent first. Click a name to see why, then open the full profile."
          action={
            <Link href="/risks" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
              All flagged <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <AttentionList students={data.studentsNeedingAttention} />
        </Panel>

        <Panel
          index={7}
          className="xl:col-span-7"
          title="Which areas are slipping?"
          description="Share of students flagged in each of the seven data areas, week by week."
        >
          <SignalHeatmap rows={data.signalChart} weeks={weeks} students={summary.studentsTracked} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel index={8} title="How is the campus doing?" description="Students in each Success Score band.">
          <Histogram bands={data.scoreDistribution} total={summary.studentsTracked} />
        </Panel>
        <Panel index={9} title="Which departments need support?" description="Share of each department's students at high risk.">
          <DepartmentRiskChart departments={data.departmentRisk} />
        </Panel>
        <Panel
          index={10}
          title="What should we do about it?"
          description="Suggested follow-ups, matched to each student's main risk factor."
          action={
            <Link href="/interventions" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
              Board <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <FollowUpActions actions={data.followUpActions} />
        </Panel>
      </div>

      <Panel
        index={11}
        title="Which groups share the same problem?"
        description="Students with similar profiles, so one session can help a whole group."
        action={
          <Link href="/segments" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
            Explore segments <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.segments.map((seg) => (
            <li key={seg.segmentId}>
              <Link
                href={`/segments?focus=${seg.segmentId}`}
                className="pressable group flex h-full flex-col rounded-2xl border border-line bg-surface-2 p-4 hover:border-line-strong hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug text-ink">{seg.name}</p>
                  <span className="tabular text-lg font-semibold tracking-tight text-ink">{seg.students}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-3">{seg.description}</p>
                <div className="mt-auto pt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className={`h-full rounded-full ${TONE_BAR[seg.tone]}`} style={{ width: `${(seg.students / summary.studentsTracked) * 100}%` }} />
                  </div>
                  <p className="mt-2 flex justify-between text-[11px] text-ink-3">
                    <span>Avg score {seg.averageScore}</span>
                    <span>
                      {seg.academicHigh} academic, {seg.placementHigh} placement high
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <DemoFootnote endpoint="GET /api/overview" origin={origin} />
    </div>
  );
}
