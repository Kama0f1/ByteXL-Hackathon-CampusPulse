"use client";

import { ArrowUpRightIcon, CaretDownIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DOMAIN_LABEL } from "@/lib/labels";
import type { AttentionStudent, RiskDomain } from "@/lib/types";

function scoreTone(score: number) {
  return score < 45 ? "text-risk-high-ink" : score < 60 ? "text-risk-medium-ink" : "text-ink";
}

/** Priority queue: click a student to see why they were flagged, then open their profile. */
export function AttentionList({ students }: { students: AttentionStudent[] }) {
  const [open, setOpen] = useState<string | null>(students[0]?.studentId ?? null);

  if (students.length === 0) {
    return <p className="text-sm text-ink-3">No students currently need attention.</p>;
  }

  return (
    <ul className="-mx-2 space-y-1">
      {students.map((s) => {
        const expanded = open === s.studentId;
        return (
          <li key={s.studentId} className={`rounded-2xl transition-colors ${expanded ? "bg-surface-2 ring-1 ring-line" : "hover:bg-surface-2/70"}`}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : s.studentId)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-3 px-3 py-3 text-left"
            >
              <Avatar name={s.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                <span className="block truncate text-xs text-ink-3">
                  {s.department}, semester {s.semester}
                </span>
              </span>
              <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                <RiskBadge domain="academic" level={s.academicRisk.level} />
                <RiskBadge domain="placement" level={s.placementRisk.level} />
              </span>
              <span className={`tabular w-10 text-right text-lg font-semibold tracking-tight ${scoreTone(s.successScore)}`} title="Success score">
                {s.successScore}
              </span>
              <CaretDownIcon aria-hidden="true" className={`h-4 w-4 text-ink-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-4 px-3 pb-4 pt-1 sm:grid-cols-2 lg:pl-[60px]">
                    {(["academic", "placement"] as RiskDomain[]).map((domain) => {
                      const risk = domain === "academic" ? s.academicRisk : s.placementRisk;
                      return (
                        <div key={domain} className="min-w-0">
                          <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-3 sm:hidden">
                            <RiskBadge domain={domain} level={risk.level} />
                          </p>
                          <p className="text-xs font-medium text-ink-3">{DOMAIN_LABEL[domain]}: why</p>
                          {risk.drivers.length ? (
                            <ul className="mt-1.5 space-y-1 text-[13px] leading-snug text-ink-2">
                              {risk.drivers.map((d) => (
                                <li key={d} className="flex gap-2">
                                  <span aria-hidden="true" className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${domain === "academic" ? "bg-academic" : "bg-placement"}`} />
                                  {d}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1.5 text-[13px] text-ink-3">No current concerns.</p>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 sm:col-span-2">
                      <p className="text-[13px] text-ink-2">
                        <span className="text-ink-3">Suggested: </span>
                        <span className="font-medium text-ink">{s.suggestedAction.label}</span>
                      </p>
                      <Link
                        href={`/students/${s.studentId}`}
                        className="pressable inline-flex items-center gap-1 rounded-full bg-inverse px-3 py-1.5 text-xs font-medium text-on-inverse hover:opacity-90"
                      >
                        Open profile <ArrowUpRightIcon aria-hidden="true" weight="bold" className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
