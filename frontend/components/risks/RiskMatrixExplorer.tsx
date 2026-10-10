"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { RiskGlyph } from "@/components/ui/RiskBadge";
import { LEVEL_LABEL } from "@/lib/labels";
import type { RiskLevel, RiskMatrixCell, StudentRow } from "@/lib/types";

const LEVELS: RiskLevel[] = ["high", "medium", "low"];

function cellMeaning(a: RiskLevel, p: RiskLevel) {
  if (a === "high" && p === "high") return "Struggling on both tracks. Needs one coordinated plan.";
  if (a === "high") return "Academic help first: attendance, internals or backlogs.";
  if (p === "high") return "Placement prep first: aptitude, coding or interview practice.";
  if (a === "low" && p === "low") return "On track. Keep stretching them.";
  return "Worth watching. One more slip moves them to high.";
}

type RiskMatrixExplorerProps = {
  matrix: RiskMatrixCell[];
  rows: StudentRow[];
};

/** Academic × placement risk grid. Click a cell to list the students in it. */
export function RiskMatrixExplorer({ matrix, rows }: RiskMatrixExplorerProps) {
  const [selected, setSelected] = useState<{ a: RiskLevel; p: RiskLevel }>({ a: "high", p: "high" });
  const max = Math.max(...matrix.map((m) => m.students));
  const total = matrix.reduce((s, m) => s + m.students, 0);

  const students = useMemo(
    () => rows.filter((r) => r.academicRisk === selected.a && r.placementRisk === selected.p).sort((x, y) => x.successScore - y.successScore),
    [rows, selected],
  );

  function tone(a: RiskLevel, p: RiskLevel) {
    if (a === "high" || p === "high") return "--risk-high";
    if (a === "medium" || p === "medium") return "--risk-medium";
    return "--risk-low";
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div className="flex items-center">
            <p className="text-xs font-medium text-academic [writing-mode:vertical-rl] rotate-180">Academic risk</p>
          </div>
          <div>
            <div className="grid grid-cols-[52px_repeat(3,1fr)] gap-1.5">
              <span />
              {LEVELS.map((p) => (
                <span key={p} className="flex items-center justify-center gap-1 pb-1 text-xs text-ink-3">
                  <RiskGlyph level={p} /> {LEVEL_LABEL[p]}
                </span>
              ))}
              {LEVELS.map((a) => (
                <div key={a} className="contents">
                  <span className="flex items-center gap-1 text-xs text-ink-3">
                    <RiskGlyph level={a} /> {LEVEL_LABEL[a]}
                  </span>
                  {LEVELS.map((p) => {
                    const cell = matrix.find((m) => m.academic === a && m.placement === p)!;
                    const active = selected.a === a && selected.p === p;
                    const calm = a === "low" && p === "low";
                    const strength = calm ? 0 : 12 + (cell.students / max) * 50;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelected({ a, p })}
                        aria-pressed={active}
                        aria-label={`Academic ${a}, placement ${p}: ${cell.students} students`}
                        className={`pressable relative flex h-24 flex-col sm:h-28 items-center justify-center rounded-2xl ring-inset transition-shadow ${active ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-line-strong"}`}
                        style={{ backgroundColor: calm ? "var(--surface-2)" : `color-mix(in srgb, var(${tone(a, p)}) ${strength}%, var(--surface))` }}
                      >
                        <span className="tabular text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{cell.students}</span>
                        <span className="text-[11px] text-ink-2">{Math.round((cell.students / total) * 100)}%</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-xs font-medium text-placement">Placement risk</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-[340px] flex-col rounded-2xl border border-line bg-surface-2 p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${selected.a}-${selected.p}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <p className="text-[15px] font-semibold text-ink">
              {students.length} students: academic {selected.a}, placement {selected.p}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-3">{cellMeaning(selected.a, selected.p)}</p>
            <ul className="scroll-thin -mx-1 mt-3 max-h-[300px] flex-1 space-y-0.5 overflow-y-auto">
              {students.slice(0, 40).map((r) => (
                <li key={r.studentId}>
                  <Link href={`/students/${r.studentId}`} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface">
                    <Avatar name={r.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{r.name}</span>
                      <span className="block truncate text-[11px] text-ink-3">
                        {r.department}, sem {r.semester}, attendance {r.attendancePct}%
                      </span>
                    </span>
                    <span className="tabular text-sm font-semibold text-ink">{r.successScore}</span>
                    <ArrowUpRightIcon aria-hidden="true" className="h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
            {students.length > 40 ? (
              <Link
                href={`/students?academic=${selected.a}&placement=${selected.p}`}
                className="mt-3 text-[13px] font-medium text-ink-2 hover:text-ink"
              >
                See all {students.length} in the student list
              </Link>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
