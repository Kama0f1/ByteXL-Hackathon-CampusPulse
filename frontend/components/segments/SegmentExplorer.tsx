"use client";

import { CheckIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useWidth } from "@/components/charts/useWidth";
import { buttonClass } from "@/components/ui/Button";
import { planGroupSession } from "@/lib/api-client";
import { DOMAIN_LABEL } from "@/lib/labels";
import type { SegmentReport } from "@/lib/types";

const TONE = {
  strong: { dot: "fill-risk-low", chip: "bg-risk-low", text: "text-risk-low-ink", label: "Doing well" },
  mixed: { dot: "fill-academic", chip: "bg-academic", text: "text-academic", label: "Mixed" },
  watch: { dot: "fill-risk-medium", chip: "bg-risk-medium", text: "text-risk-medium-ink", label: "Watch" },
  support: { dot: "fill-risk-high", chip: "bg-risk-high", text: "text-risk-high-ink", label: "Needs support" },
} as const;

type SegmentExplorerProps = {
  report: SegmentReport;
  initialFocus?: string;
  /** Save group plans to the backend (false on demo data). */
  live?: boolean;
};

/** Pick a segment: its students light up on the readiness map, with its profile and a group plan. */
export function SegmentExplorer({ report, initialFocus, live = false }: SegmentExplorerProps) {
  const router = useRouter();
  const [focus, setFocus] = useState(initialFocus ?? report.segments[0].segmentId);
  const [hover, setHover] = useState<(typeof report.points)[number] | null>(null);
  const [planned, setPlanned] = useState<string[]>(() => report.segments.filter((s) => s.planned).map((s) => s.segmentId));
  const [saveError, setSaveError] = useState<string | null>(null);

  async function plan(segmentId: string, on: boolean) {
    setPlanned((p) => (on ? [...p, segmentId] : p.filter((x) => x !== segmentId)));
    if (!live) return;
    try {
      await planGroupSession(segmentId, on);
      setSaveError(null);
    } catch {
      setPlanned((p) => (on ? p.filter((x) => x !== segmentId) : [...p, segmentId]));
      setSaveError("Could not save. Is the backend running?");
    }
  }
  const [ref, width] = useWidth<HTMLDivElement>(560);

  const segment = report.segments.find((s) => s.segmentId === focus) ?? report.segments[0];
  const tone = TONE[segment.tone];

  const campusAverage = useMemo(() => {
    const total = report.segments.reduce((s, x) => s + x.students, 0);
    return segment.profile.map((p) => ({
      key: p.key,
      value: Math.round(report.segments.reduce((sum, s) => sum + s.students * (s.profile.find((q) => q.key === p.key)?.value ?? 0), 0) / total),
    }));
  }, [report.segments, segment.profile]);

  const height = Math.min(420, Math.max(300, width * 0.72));
  const pad = { top: 12, right: 12, bottom: 34, left: 40 };
  const x = (v: number) => pad.left + (v / 100) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v / 100) * (height - pad.top - pad.bottom);
  const members = report.points.filter((p) => p.segmentId === segment.segmentId);
  const others = report.points.filter((p) => p.segmentId !== segment.segmentId);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div role="radiogroup" aria-label="Segment" className="mb-4 flex flex-wrap gap-2">
          {report.segments.map((s) => {
            const active = s.segmentId === segment.segmentId;
            return (
              <button
                key={s.segmentId}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFocus(s.segmentId)}
                className={`pressable inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium ${active ? "border-inverse bg-inverse text-on-inverse" : "border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink"}`}
              >
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${TONE[s.tone].chip}`} />
                {s.name}
                <span className={`tabular font-mono text-[11px] ${active ? "opacity-70" : "text-ink-3"}`}>{s.students}</span>
              </button>
            );
          })}
        </div>

        <div ref={ref} className="relative rounded-2xl border border-line bg-surface-2 p-1">
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`Readiness map: ${members.length} students in ${segment.name} highlighted among ${report.points.length}.`}>
            {[0, 25, 50, 75, 100].map((t) => (
              <g key={t}>
                <line x1={x(0)} x2={x(100)} y1={y(t)} y2={y(t)} className={t === 50 ? "stroke-line-strong" : "stroke-gridline"} strokeDasharray={t === 50 ? "4 4" : undefined} />
                <line y1={y(0)} y2={y(100)} x1={x(t)} x2={x(t)} className={t === 50 ? "stroke-line-strong" : "stroke-gridline"} strokeDasharray={t === 50 ? "4 4" : undefined} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 font-mono text-[10px]">
                  {t}
                </text>
                <text x={x(t)} y={height - pad.bottom + 16} textAnchor="middle" className="fill-ink-3 font-mono text-[10px]">
                  {t}
                </text>
              </g>
            ))}
            <text x={x(98)} y={y(96)} textAnchor="end" className="fill-ink-3 text-[11px]">Ready on both</text>
            <text x={x(2)} y={y(4)} className="fill-ink-3 text-[11px]">Struggling on both</text>
            <text x={x(50)} y={height - 4} textAnchor="middle" className="fill-academic text-[11px] font-medium">Academic readiness</text>
            <text transform={`translate(11 ${y(50)}) rotate(-90)`} textAnchor="middle" className="fill-placement text-[11px] font-medium">Placement readiness</text>

            {others.map((p) => (
              <circle key={p.studentId} cx={x(p.academicReadiness)} cy={y(p.placementReadiness)} r={3} className="fill-ink-3" opacity={0.18} />
            ))}
            {members.map((p) => (
              <circle
                key={p.studentId}
                cx={x(p.academicReadiness)}
                cy={y(p.placementReadiness)}
                r={hover?.studentId === p.studentId ? 7 : 4.5}
                className={`${tone.dot} cursor-pointer stroke-surface transition-[r] duration-150`}
                strokeWidth={1.5}
                onPointerEnter={() => setHover(p)}
                onPointerLeave={() => setHover(null)}
                onClick={() => router.push(`/students/${p.studentId}`)}
              />
            ))}
          </svg>
          {hover ? (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop"
              style={{ left: `${(x(hover.academicReadiness) / width) * 100}%`, top: `calc(${(y(hover.placementReadiness) / height) * 100}% - 10px)` }}
            >
              <p className="font-semibold text-ink">{hover.name}</p>
              <p className="text-ink-3">
                Academic {hover.academicReadiness}, placement {hover.placementReadiness}. Click to open.
              </p>
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-ink-3">Each dot is a student. Readiness = 100 minus the risk index, so up and to the right is better.</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={segment.segmentId}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="flex min-w-0 flex-col gap-4"
        >
          <div>
            <p className={`text-xs font-medium ${tone.text}`}>{tone.label}</p>
            <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">{segment.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{segment.description}</p>
          </div>

          <dl className="grid grid-cols-3 gap-2">
            {[
              { k: "Students", v: segment.students },
              { k: "Avg score", v: segment.averageScore },
              { k: "High risk", v: `${segment.academicHigh} / ${segment.placementHigh}`, hint: "academic / placement" },
            ].map((m) => (
              <div key={m.k} className="rounded-2xl border border-line bg-surface-2 px-3 py-2.5">
                <dt className="text-[11px] text-ink-3">{m.k}</dt>
                <dd className="tabular text-lg font-semibold tracking-tight text-ink">{m.v}</dd>
                {m.hint ? <dd className="text-[10px] text-ink-3">{m.hint}</dd> : null}
              </div>
            ))}
          </dl>

          <div>
            <p className="mb-2 flex items-center justify-between text-xs text-ink-3">
              <span className="font-medium text-ink-2">Profile across the seven areas</span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-3 w-0.5 bg-ink" /> campus average
              </span>
            </p>
            <ul className="space-y-1.5">
              {segment.profile.map((p) => {
                const avg = campusAverage.find((c) => c.key === p.key)?.value ?? 0;
                const below = p.value < avg - 5;
                return (
                  <li key={p.key} className="grid grid-cols-[120px_1fr_32px] items-center gap-2 text-[13px]">
                    <span className="truncate text-ink-2">{p.label}</span>
                    <div className="relative h-2.5 rounded-full bg-surface-3">
                      <div className={`h-full rounded-full ${below ? "bg-risk-high/80" : "bg-ink-2"}`} style={{ width: `${p.value}%` }} />
                      <div aria-hidden="true" className="absolute -top-1 h-[18px] w-0.5 rounded bg-ink" style={{ left: `${avg}%` }} title={`Campus average ${avg}`} />
                    </div>
                    <span className={`tabular text-right text-xs font-semibold ${below ? "text-risk-high-ink" : "text-ink"}`}>{p.value}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-auto rounded-2xl border border-line bg-surface p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-ink-3">
              <UsersThreeIcon aria-hidden="true" className="h-4 w-4" /> Suggested group intervention, {DOMAIN_LABEL[segment.groupIntervention.domain].toLowerCase()}
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-ink">{segment.groupIntervention.label}</p>
            <p className="mt-1 text-[13px] text-ink-2">{segment.groupIntervention.detail}</p>
            <div className="mt-3 flex items-center gap-3">
              {planned.includes(segment.segmentId) ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-low-soft px-3 py-1.5 text-[13px] font-medium text-risk-low-ink">
                    <CheckIcon aria-hidden="true" weight="bold" className="h-3.5 w-3.5" /> Planned for {segment.students} students
                  </span>
                  <button type="button" onClick={() => plan(segment.segmentId, false)} className="text-[12px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
                    Undo
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => plan(segment.segmentId, true)} className={buttonClass("primary", "sm")}>
                  Plan for all {segment.students}
                </button>
              )}
              <span role="status" className={`text-[11px] ${saveError ? "text-risk-high-ink" : "text-ink-3"}`}>
                {saveError ?? (live ? "Saved for the whole group." : "Demo: not saved.")}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
