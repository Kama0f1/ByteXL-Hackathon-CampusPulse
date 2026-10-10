import { ArrowUpRightIcon, CommandIcon, HandshakeIcon, UsersThreeIcon, WarningDiamondIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LineChart } from "@/components/charts/LineChart";
import { CampusField, type FieldStudent } from "@/components/landing/CampusField";
import { LandingNav } from "@/components/landing/LandingNav";
import { Reveal } from "@/components/landing/Reveal";
import { RiskExplainer } from "@/components/students/RiskExplainer";
import { Logo } from "@/components/ui/Logo";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { getInterventionReport } from "@/lib/interventions";
import { getCampusOverview } from "@/lib/overview";
import { getPipelineReport } from "@/lib/pipeline";
import { getRiskReport } from "@/lib/risks";
import { getSegmentReport } from "@/lib/segments";
import { getStudentProfile, getStudents } from "@/lib/students";

const STORY = [
  { week: "Week 5", title: "Flagged early", body: "Attendance drops to 58% and three LMS assignments are missed. Academic risk turns high, weeks before mid-semester exams.", tone: "bg-risk-high" },
  { week: "Week 6", title: "Mentor steps in", body: "The suggested follow-up is a mentor call and an attendance plan. The mentor assigns it from Riya's profile in one click.", tone: "bg-academic" },
  { week: "Week 9", title: "Signals recover", body: "Attendance climbs back to 79% and LMS work is submitted on time again.", tone: "bg-risk-medium" },
  { week: "Week 12", title: "Back on track", body: "Academic risk falls from high to low, and the follow-up is recorded as effective.", tone: "bg-risk-low" },
];

export default async function LandingPage() {
  const [{ data: overview }, { data: rows }, { data: segments }, { data: risks }, { data: interventions }, { data: pipeline }] = await Promise.all([
    getCampusOverview(),
    getStudents(),
    getSegmentReport(),
    getRiskReport(),
    getInterventionReport(),
    getPipelineReport(),
  ]);
  // Show the most urgent flagged student, or anyone if nobody is flagged.
  const example = (await getStudentProfile((risks.flagged[0] ?? rows[0]).studentId))!.data;

  const readiness = new Map(segments.points.map((p) => [p.studentId, p]));
  const field: FieldStudent[] = rows.map((r) => ({
    id: r.studentId,
    name: r.name,
    department: r.department,
    score: r.successScore,
    academic: r.academicRisk,
    placement: r.placementRisk,
    segment: r.segmentId,
    academicReadiness: readiness.get(r.studentId)?.academicReadiness ?? 50,
    placementReadiness: readiness.get(r.studentId)?.placementReadiness ?? 50,
  }));
  const statusCount = (s: string) => interventions.interventions.filter((i) => i.status === s).length;

  return (
    <div data-theme="dark" className="grain min-h-dvh bg-canvas text-ink">
      <LandingNav />

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24">
          <div aria-hidden="true" className="dot-field absolute inset-0" />
          <div aria-hidden="true" className="absolute -top-48 left-[10%] h-[34rem] w-[34rem] rounded-full bg-academic/20 blur-[120px]" />
          <div aria-hidden="true" className="absolute -right-40 top-40 h-[26rem] w-[26rem] rounded-full bg-[#c8f13c]/10 blur-[120px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <Reveal>
              <h1 className="text-[42px] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-[68px]">
                See who needs help, <span className="text-white/45">before results day.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
                CampusPulse joins seven campus data sources, flags academic and placement risk separately, and explains every flag.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="pressable group inline-flex items-center gap-3 rounded-full bg-[#c8f13c] py-2 pl-6 pr-2 text-[15px] font-semibold text-[#0d1117] hover:bg-white"
                >
                  Open the demo
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0d1117] text-white transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-0.5">
                    <ArrowUpRightIcon aria-hidden="true" weight="bold" className="h-4 w-4" />
                  </span>
                </Link>
                <a href="#how" className="pressable inline-flex h-[52px] items-center rounded-full border border-white/15 px-6 text-[15px] font-medium text-white hover:bg-white/5">
                  How it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="rounded-[28px] bg-white/[0.04] p-2 ring-1 ring-white/10">
                <div className="rounded-[22px] bg-[#0f1115] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] sm:p-5">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      {overview.summary.studentsTracked} students, {overview.currentWeek.toLowerCase()}
                    </p>
                    <p className="text-[11px] text-white/45">Simulated campus. Hover any dot.</p>
                  </div>
                  <CampusField students={field} segments={segments.segments.map((s) => ({ id: s.segmentId, name: s.name }))} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Sources strip */}
        <section aria-labelledby="sources" className="border-y border-white/5 bg-white/[0.015]">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:justify-between">
            <h2 id="sources" className="shrink-0 text-sm text-white/55">
              One record per student, built from
            </h2>
            <ul className="flex flex-wrap justify-center gap-2">
              {pipeline.sources.map((s) => (
                <li key={s.key} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[13px] text-white/80">
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <Reveal className="lg:sticky lg:top-32 lg:self-start">
              <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">From scattered records to a clear next step.</h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
                Colleges already collect the data. It just lives in seven places. CampusPulse turns it into one decision faculty can act on this week.
              </p>
            </Reveal>

            <ol className="space-y-4">
              <Reveal>
                <li className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">Combine</h3>
                  <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/60">
                    Attendance logs, marks, LMS activity, clubs, aptitude tests, skills and feedback are cleaned and joined on student ID.
                  </p>
                  <div className="mt-6 flex h-9 gap-[2px] overflow-hidden rounded-xl">
                    {pipeline.weights.map((w, i) => (
                      <div key={w.key} className="grid place-items-center bg-white" style={{ width: `${w.weight * 100}%`, opacity: 1 - i * 0.11 }} title={w.label}>
                        <span className="text-[11px] font-semibold text-[#0d1117]">{Math.round(w.weight * 100)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-white/45">Weights of the seven areas in the 0-100 Student Success Score.</p>
                </li>
              </Reveal>
              <Reveal>
                <li className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">Score and flag</h3>
                  <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/60">
                    Every student gets one score and two separate risk levels, because a topper can still be unready for placements.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-5">
                    <ScoreRing score={example.successScore} size={96} stroke={8} />
                    <div className="space-y-2">
                      <RiskBadge domain="academic" level={example.academic.level} size="md" />
                      <br />
                      <RiskBadge domain="placement" level={example.placement.level} size="md" />
                    </div>
                  </div>
                </li>
              </Reveal>
              <Reveal>
                <li className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">Act and follow up</h3>
                  <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/60">
                    Each flag comes with a suggested follow-up matched to its main reason, and the board tracks whether it worked.
                  </p>
                  <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#c8f13c] px-4 py-2 text-sm font-semibold text-[#0d1117]">
                    <HandshakeIcon aria-hidden="true" weight="bold" className="h-4 w-4" /> {example.suggestedAction.label}
                  </p>
                </li>
              </Reveal>
            </ol>
          </div>
        </section>

        {/* Explainable */}
        <section id="explain" className="scroll-mt-24 border-t border-white/5 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">Reasons, not just red flags.</h2>
              <p className="mt-5 text-base leading-relaxed text-white/60">
                Every risk shows how much each factor contributes, in plain language a mentor can act on. This is {example.name.split(" ")[0]}, one of the
                students in the dataset (name simulated).
              </p>
            </Reveal>
            <div className="mt-12 grid gap-4 lg:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-[24px] border border-line bg-surface p-6">
                  <RiskExplainer domain="academic" risk={example.academic} />
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="h-full rounded-[24px] border border-line bg-surface p-6">
                  <RiskExplainer domain="placement" risk={example.placement} />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section id="features" className="scroll-mt-24 border-t border-white/5 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">Built for the Monday meeting.</h2>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Reveal className="md:col-span-2">
                <div className="h-full rounded-[24px] border border-line bg-surface p-6 sm:p-8">
                  <WarningDiamondIcon aria-hidden="true" weight="duotone" className="h-7 w-7 text-risk-high" />
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-white">Early warning, week by week</h3>
                  <p className="mt-1.5 max-w-md text-sm text-white/60">Students slipping show up while there is still time to help, not after mid-semester marks.</p>
                  <div className="mt-6">
                    <LineChart
                      ariaLabel="High-risk students by week"
                      labels={overview.weeklyRisk.map((w) => w.week)}
                      series={[
                        { key: "academic", label: "Academic", values: overview.weeklyRisk.map((w) => w.academicHigh), stroke: "stroke-academic", fill: "fill-academic", swatch: "bg-academic", text: "text-academic" },
                        { key: "placement", label: "Placement", values: overview.weeklyRisk.map((w) => w.placementHigh), stroke: "stroke-placement", fill: "fill-placement", swatch: "bg-placement", text: "text-placement" },
                      ]}
                      height={220}
                    />
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="flex h-full flex-col rounded-[24px] bg-[#c8f13c] p-6 text-[#0d1117] sm:p-8">
                  <CommandIcon aria-hidden="true" weight="bold" className="h-7 w-7" />
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">Any student in one keystroke</h3>
                  <p className="mt-1.5 text-sm text-[#0d1117]/70">Press Ctrl K, type a name or ID, and land on their full explanation.</p>
                  <p className="mt-auto pt-8 font-mono text-5xl font-semibold tracking-tight">Ctrl K</p>
                </div>
              </Reveal>
              <Reveal>
                <div className="h-full rounded-[24px] border border-line bg-surface p-6 sm:p-8">
                  <HandshakeIcon aria-hidden="true" weight="duotone" className="h-7 w-7 text-academic" />
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-white">Follow-ups that close the loop</h3>
                  <dl className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      { k: "Suggested", v: statusCount("suggested") },
                      { k: "In progress", v: statusCount("in-progress") + statusCount("assigned") },
                    ].map((m) => (
                      <div key={m.k} className="rounded-2xl bg-surface-2 p-3">
                        <dt className="text-xs text-white/50">{m.k}</dt>
                        <dd className="tabular text-2xl font-semibold text-white">{m.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Reveal>
              <Reveal delay={0.08} className="md:col-span-2">
                <div className="h-full rounded-[24px] border border-line bg-surface p-6 sm:p-8">
                  <UsersThreeIcon aria-hidden="true" weight="duotone" className="h-7 w-7 text-placement" />
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-white">Segments for group support</h3>
                  <p className="mt-1.5 max-w-md text-sm text-white/60">Students with the same problem are grouped, so one bootcamp can reach a whole cohort.</p>
                  <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {segments.segments.map((s) => (
                      <li key={s.segmentId}>
                        <div className="flex items-baseline justify-between gap-3 text-[13px]">
                          <span className="truncate text-white/85">{s.name}</span>
                          <span className="tabular text-white/50">{s.students}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-white/60" style={{ width: `${Math.min(100, (s.students / overview.summary.studentsTracked) * 300)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Story */}
        <section id="story" className="scroll-mt-24 border-t border-white/5 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">Riya&apos;s semester, caught in time.</h2>
              <p className="mt-5 text-base text-white/55">An illustrative scenario. Riya is fictional.</p>
            </Reveal>
            <ol className="mt-14 grid gap-6 md:grid-cols-4">
              {STORY.map((step, i) => (
                <Reveal key={step.week} delay={i * 0.08}>
                  <li className="relative border-t border-white/10 pt-6">
                    <span aria-hidden="true" className={`absolute -top-[5px] left-0 h-2.5 w-2.5 rounded-full ${step.tone}`} />
                    <p className="font-mono text-xs text-white/45">{step.week}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{step.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center sm:px-12">
              <div aria-hidden="true" className="absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[#c8f13c]/15 blur-[100px]" />
              <h2 className="relative text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Try it with the demo campus.</h2>
              <p className="relative mx-auto mt-4 max-w-md text-base text-white/60">One click signs you in. No account, no real student data.</p>
              <Link
                href="/login"
                className="pressable group relative mt-9 inline-flex items-center gap-3 rounded-full bg-[#c8f13c] py-2 pl-6 pr-2 text-[15px] font-semibold text-[#0d1117] hover:bg-white"
              >
                Open the demo
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0d1117] text-white transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-0.5">
                  <ArrowUpRightIcon aria-hidden="true" weight="bold" className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-white/45 sm:flex-row sm:px-6">
          <Logo tone="light" />
          <p>Built for HacXLerate 2026. Scores from the campus datasets; names and history simulated.</p>
        </div>
      </footer>
    </div>
  );
}
