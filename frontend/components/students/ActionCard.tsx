"use client";

import { CheckIcon, LightningIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { createIntervention } from "@/lib/api-client";
import { DOMAIN_LABEL } from "@/lib/labels";
import type { StudentProfile } from "@/lib/types";

type ActionCardProps = {
  studentId: string;
  action: StudentProfile["suggestedAction"];
  mentor: string;
  mentors: string[];
  alreadyAssigned: boolean;
  /** Save the assignment to the backend (false on demo data). */
  live?: boolean;
};

/** The suggested next step, assignable in one click. Saved to the interventions board when live. */
export function ActionCard({ studentId, action, mentor, mentors, alreadyAssigned, live = false }: ActionCardProps) {
  const [owner, setOwner] = useState(mentor);
  const [assigned, setAssigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    if (!live) return setAssigned(true);
    setSaving(true);
    setError(null);
    try {
      await createIntervention({ studentId, label: action.label, domain: action.domain, owner, status: "assigned" });
      setAssigned(true);
    } catch {
      setError("Could not save. Is the backend running?");
    } finally {
      setSaving(false);
    }
  }
  const monitoring = action.id === "monitor";

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-[#0d1117] p-5 text-white shadow-pop sm:p-6">
      <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#c8f13c]/15 blur-3xl" />
      <div className="relative">
        <p className="flex items-center gap-2 text-xs font-medium text-white/60">
          <LightningIcon aria-hidden="true" weight="fill" className="h-3.5 w-3.5 text-[#c8f13c]" />
          Suggested next step
        </p>
        <p className="mt-2 text-xl font-semibold leading-snug tracking-[-0.02em]">{action.label}</p>
        <p className="mt-1.5 text-[13px] text-white/60">
          {monitoring ? action.reason : `${DOMAIN_LABEL[action.domain]} support. ${action.reason}.`}
        </p>

        {monitoring ? null : alreadyAssigned ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px]">
            <CheckIcon aria-hidden="true" weight="bold" className="h-3.5 w-3.5 text-[#c8f13c]" /> Already on the interventions board
          </p>
        ) : (
          <div className="mt-5">
            <AnimatePresence mode="wait" initial={false}>
              {assigned ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#c8f13c] px-3.5 py-2 text-[13px] font-semibold text-[#0d1117]">
                    <CheckIcon aria-hidden="true" weight="bold" className="h-4 w-4" /> Assigned to {owner}
                  </span>
                  {live ? null : (
                    <button type="button" onClick={() => setAssigned(false)} className="text-[13px] text-white/60 underline-offset-4 hover:text-white hover:underline">
                      Undo
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-2">
                  <label htmlFor="owner" className="sr-only">
                    Assign to
                  </label>
                  <select
                    id="owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="h-10 rounded-full border border-white/15 bg-white/5 px-3.5 text-[13px] text-white outline-none focus:border-white/40 [&>option]:text-[#0d1117]"
                  >
                    {mentors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={assign} disabled={saving} className={buttonClass("primary", "md", "!bg-white !text-[#0d1117] disabled:opacity-60")}>
                    {saving ? "Saving..." : "Assign follow-up"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <p role="status" className={`mt-3 text-[11px] ${error ? "text-[#ffb4a8]" : "text-white/45"}`}>
              {error ?? (live ? "Adds it to the interventions board." : "Demo: assignments are not saved.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
