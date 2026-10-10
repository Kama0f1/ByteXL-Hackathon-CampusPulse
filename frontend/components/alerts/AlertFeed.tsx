"use client";

import { ArrowUpRightIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ALERT_KIND, AlertIcon } from "@/components/alerts/alertMeta";
import { buttonClass } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { DOMAIN_LABEL } from "@/lib/labels";
import type { AlertKind, CampusAlert } from "@/lib/types";

type Filter = "all" | AlertKind;

/** Week-by-week alert feed with type filters and a "handled" toggle. Demo: handled state is not saved. */
export function AlertFeed({ alerts, currentWeek }: { alerts: CampusAlert[]; currentWeek: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showHandled, setShowHandled] = useState(false);
  const [handled, setHandled] = useState<string[]>([]);

  const counts = useMemo(() => {
    const c = new Map<AlertKind, number>();
    alerts.forEach((a) => c.set(a.kind, (c.get(a.kind) ?? 0) + 1));
    return c;
  }, [alerts]);

  const visible = alerts.filter((a) => (filter === "all" || a.kind === filter) && (showHandled || !handled.includes(a.alertId)));
  const weeks = [...new Set(visible.map((a) => a.week))];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Alert type"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${alerts.length}` },
            ...(Object.keys(ALERT_KIND) as AlertKind[])
              .filter((k) => counts.get(k))
              .map((k) => ({ value: k, label: `${ALERT_KIND[k].label} ${counts.get(k)}` })),
          ]}
        />
        <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} className="h-4 w-4 accent-[var(--academic)]" />
          Show handled ({handled.length})
        </label>
      </div>

      {weeks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-ink-3">Nothing left here. Every alert of this type has been handled.</p>
      ) : null}

      {weeks.map((week) => {
        const items = visible.filter((a) => a.week === week);
        return (
          <section key={week} aria-label={`Alerts from ${week}`}>
            <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-ink">
              {week === `W${currentWeek.replace(/\D/g, "")}` ? "This week" : `Week ${week.slice(1)}`}
              <span className="text-xs font-normal text-ink-3">{items.length} alerts</span>
            </h3>
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((a) => {
                  const done = handled.includes(a.alertId);
                  return (
                    <motion.li
                      key={a.alertId}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: done ? 0.55 : 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      className="flex flex-wrap items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card sm:flex-nowrap"
                    >
                      <AlertIcon kind={a.kind} severity={a.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">
                          {a.title}
                          <span className="ml-2 text-xs font-normal text-ink-3">
                            {DOMAIN_LABEL[a.domain]} track
                          </span>
                        </p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{a.detail}</p>
                        <Link href={`/students/${a.studentId}`} className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-ink hover:underline">
                          {a.studentName}
                          <span className="font-mono text-[11px] font-normal text-ink-3">
                            {a.studentId}, {a.department}
                          </span>
                          <ArrowUpRightIcon aria-hidden="true" className="h-3 w-3" />
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHandled((h) => (done ? h.filter((x) => x !== a.alertId) : [...h, a.alertId]))}
                        className={buttonClass(done ? "ghost" : "secondary", "sm", "shrink-0")}
                      >
                        {done ? (
                          "Undo"
                        ) : (
                          <>
                            <CheckIcon aria-hidden="true" weight="bold" className="h-3.5 w-3.5" /> Handled
                          </>
                        )}
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
      <p className="text-xs text-ink-3">Demo: marking an alert as handled is not saved.</p>
    </div>
  );
}
