"use client";

import { ArrowRightIcon, BellIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertIcon } from "@/components/alerts/alertMeta";
import type { CampusAlert } from "@/lib/types";

/** Top-bar bell: this week's alerts at a glance. */
export function AlertsBell({ alerts, total }: { alerts: CampusAlert[]; total: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${total} new alerts this week`}
        className="pressable relative grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-3 hover:text-ink"
      >
        <BellIcon aria-hidden="true" className="h-[18px] w-[18px]" />
        {total ? (
          <span className="tabular absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-risk-high px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-11 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-line bg-surface shadow-pop"
          >
            <p className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
              This week <span className="font-normal text-ink-3">{total} alerts</span>
            </p>
            <ul className="scroll-thin max-h-[360px] overflow-y-auto p-1.5">
              {alerts.map((a) => (
                <li key={a.alertId}>
                  <Link href={`/students/${a.studentId}`} onClick={() => setOpen(false)} className="flex gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2">
                    <AlertIcon kind={a.kind} severity={a.severity} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink">{a.title}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {a.studentName}, {a.department}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] font-medium text-ink hover:bg-surface-2"
            >
              See all alerts <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
