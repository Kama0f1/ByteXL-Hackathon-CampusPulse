import { CaretLeftIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineChart } from "@/components/charts/LineChart";
import { AlertIcon } from "@/components/alerts/alertMeta";
import { ActionCard } from "@/components/students/ActionCard";
import { ChangeBreakdown } from "@/components/students/ChangeBreakdown";
import { PlacementPrediction } from "@/components/students/PlacementPrediction";
import { QueueNav } from "@/components/students/QueueNav";
import { RiskExplainer } from "@/components/students/RiskExplainer";
import { ScoreWaterfall } from "@/components/students/ScoreWaterfall";
import { SignalGrid } from "@/components/students/SignalGrid";
import { SubjectAttendance } from "@/components/students/SubjectAttendance";
import { Avatar } from "@/components/ui/Avatar";
import { DemoFootnote, SimulatedTag } from "@/components/ui/DemoBadge";
import { Panel } from "@/components/ui/Panel";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { formatSignedInt } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { getStudentProfile, getStudents } from "@/lib/students";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getStudentProfile(id);
  return { title: result ? result.data.name : "Student not found" };
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, { data: roster }] = await Promise.all([getStudentProfile(id), getStudents()]);
  if (!result) notFound();
  const s = result.data;
  const weeks = s.scoreHistory.map((_, i) => `W${i + 1}`);
  const mentors = [...new Set(roster.map((r) => r.mentor))];
  const firstName = s.name.split(" ")[0];
  const riskier = s.academic.index >= s.placement.index ? { domain: "academic", risk: s.academic } : { domain: "placement", risk: s.placement };
  const lead = riskier.risk.factors[0];
  const summary =
    riskier.risk.level === "low"
      ? `${firstName} is on track in both academics and placement prep. Nothing needs action this week.`
      : `${firstName} needs ${riskier.domain} support first. ${lead ? `${lead.factor} explains ${Math.round(lead.share * 100)}% of the ${riskier.domain} risk (${/^[A-Z]{2}/.test(lead.evidence) ? lead.evidence : lead.evidence.charAt(0).toLowerCase() + lead.evidence.slice(1)}).` : ""}`;

  return (
    <div className="space-y-5">
      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <Link href="/students" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <CaretLeftIcon aria-hidden="true" className="h-3.5 w-3.5" /> All students
        </Link>
        <QueueNav previousId={s.previousFlaggedId} nextId={s.nextFlaggedId} />
      </div>

      <section className="rise grid gap-5 rounded-[24px] border border-line bg-surface p-5 shadow-card sm:p-7 lg:grid-cols-[1fr_auto]" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex min-w-0 items-start gap-5">
          <Avatar name={s.name} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[34px]">{s.name}</h1>
            <p className="mt-1 text-sm text-ink-2">
              {s.department}, semester {s.semester} <span className="text-ink-3">|</span> <span className="font-mono text-[13px]">{s.studentId}</span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
              <span>Mentor: {s.mentor}</span>
              <span className="inline-flex items-center gap-1">
                <EnvelopeSimpleIcon aria-hidden="true" className="h-3.5 w-3.5" /> {s.email}
              </span>
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                { k: "CGPA", v: s.cgpa.toFixed(1) },
                { k: "Attendance", v: `${s.attendancePct}%`, warn: s.attendancePct < 75 },
                { k: "LMS submitted", v: `${s.lmsCompletionPct}%` },
                { k: "Coding test", v: `${s.codingScore}/100` },
              ].map((m) => (
                <div key={m.k}>
                  <dt className="text-xs text-ink-3">{m.k}</dt>
                  <dd className={`tabular text-lg font-semibold tracking-tight ${m.warn ? "text-risk-high-ink" : "text-ink"}`}>{m.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="flex items-center gap-5 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <ScoreRing score={s.successScore} />
          <div>
            <p className="text-[13px] font-medium text-ink">Student Success Score</p>
            <p className={`mt-1 text-[13px] ${s.scoreChange < 0 ? "text-risk-high-ink" : s.scoreChange > 0 ? "text-risk-low-ink" : "text-ink-3"}`}>
              {formatSignedInt(s.scoreChange)} in 4 weeks
            </p>
          </div>
        </div>
      </section>

      <p
        className={`rise flex items-start gap-3 rounded-[20px] border px-5 py-4 text-[15px] leading-relaxed ${riskier.risk.level === "low" ? "border-risk-low/30 bg-risk-low-soft text-risk-low-ink" : "border-line bg-surface text-ink-2 shadow-card"}`}
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <span className="mt-0.5 shrink-0 rounded-full bg-inverse px-2 py-0.5 text-[11px] font-semibold text-on-inverse">In short</span>
        <span>{summary}</span>
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel index={2}>
          <RiskExplainer domain="academic" risk={s.academic} />
        </Panel>
        <Panel index={3}>
          <RiskExplainer domain="placement" risk={s.placement} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel index={4}>
          <PlacementPrediction probability={s.placementProbability} semester={s.semester} mainGap={s.placement.factors[0]?.factor} />
        </Panel>
        <Panel index={4} title="Attendance by subject" action={<SimulatedTag label="Simulated split" />}>
          <SubjectAttendance subjects={s.subjectAttendance} overall={s.attendancePct} />
        </Panel>
        <Panel index={4} title={`Alerts (${s.alerts.length})`} description="Recent changes that triggered an alert.">
          {s.alerts.length ? (
            <ul className="space-y-3">
              {s.alerts.map((a) => (
                <li key={a.alertId} className="flex gap-3">
                  <AlertIcon kind={a.kind} severity={a.severity} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">
                      {a.title} <span className="font-mono text-[11px] font-normal text-ink-3">{a.week}</span>
                    </span>
                    <span className="block text-xs leading-relaxed text-ink-3">{a.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-3">No alerts in the last four weeks.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel index={4} className="xl:col-span-7" title="Why the score is what it is" description="Each data area's weight times its gap from 100.">
          <ScoreWaterfall signals={s.signals} score={s.successScore} />
        </Panel>
        <div className="flex flex-col gap-4 xl:col-span-5">
          <div className="rise" style={{ "--i": 5 } as React.CSSProperties}>
            <ActionCard
              studentId={s.studentId}
              action={s.suggestedAction}
              mentor={s.mentor}
              mentors={mentors}
              alreadyAssigned={s.interventions.some((i) => i.status !== "completed")}
              live={result.origin === "api"}
            />
          </div>
          <Panel index={6} title="What changed in four weeks" action={<SimulatedTag />}>
            <ChangeBreakdown factors={s.scoreChangeFactors} change={s.scoreChange} />
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel index={7} className="xl:col-span-8" title="Weekly early-warning chart" description="All seven data areas, week by week." action={<SimulatedTag />}>
          <SignalGrid signals={s.signals} weeks={weeks} />
        </Panel>
        <Panel index={8} className="xl:col-span-4" title="Success score this term" action={<SimulatedTag />}>
          <LineChart
            ariaLabel="Success score by week"
            labels={weeks}
            series={[{ key: "score", label: "Score", values: s.scoreHistory, stroke: "stroke-ink", fill: "fill-ink", swatch: "bg-ink", text: "text-ink" }]}
            yDomain={[0, 100]}
            height={200}
            area
          />
          {s.interventions.length ? (
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {s.interventions.map((i) => (
                <li key={i.interventionId} className="flex items-start justify-between gap-3 text-[13px]">
                  <span>
                    <span className="block font-medium text-ink">{i.label}</span>
                    <span className="text-xs text-ink-3">
                      {i.owner}, from {i.startedWeek}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-ink-2">{STATUS_LABEL[i.status]}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>

      <DemoFootnote endpoint={`GET /api/students/${s.studentId}`} origin={result.origin} />
    </div>
  );
}
