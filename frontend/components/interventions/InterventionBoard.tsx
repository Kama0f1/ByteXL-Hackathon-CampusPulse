"use client";

import { ArrowRightIcon, ArrowUpRightIcon, MagnifyingGlassIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { formatSignedInt } from "@/lib/format";
import { DOMAIN_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { Intervention, InterventionStatus, RiskDomain } from "@/lib/types";

const COLUMNS: { status: InterventionStatus; hint: string; dot: string }[] = [
  { status: "suggested", hint: "Matched to a flagged student. Not yet owned.", dot: "bg-ink-3" },
  { status: "assigned", hint: "A mentor owns it.", dot: "bg-academic" },
  { status: "in-progress", hint: "Sessions under way.", dot: "bg-risk-medium" },
  { status: "completed", hint: "Done. Score change since the start.", dot: "bg-risk-low" },
];

const NEXT: Partial<Record<InterventionStatus, InterventionStatus>> = {
  suggested: "assigned",
  assigned: "in-progress",
  "in-progress": "completed",
};

const STEP = 6;

/** Kanban of follow-ups. Drag a card or use its move button. Demo: changes are not saved. */
export function InterventionBoard({ initial }: { initial: Intervention[] }) {
  const [items, setItems] = useState(initial);
  const [domain, setDomain] = useState<"all" | RiskDomain>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<Record<InterventionStatus, number>>({ suggested: STEP, assigned: STEP, "in-progress": STEP, completed: STEP });
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<InterventionStatus | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) => (domain === "all" || i.domain === domain) && (!q || i.studentName.toLowerCase().includes(q) || i.label.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q)),
    );
  }, [items, domain, query]);

  function move(id: string, status: InterventionStatus) {
    setItems((list) => list.map((i) => (i.interventionId === id ? { ...i, status } : i)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">Search by student, action or mentor</span>
          <MagnifyingGlassIcon aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, action or mentor"
            className="h-9 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-academic"
          />
        </label>
        <Segmented
          label="Track"
          value={domain}
          onChange={setDomain}
          options={[
            { value: "all", label: "Both tracks" },
            { value: "academic", label: "Academic" },
            { value: "placement", label: "Placement" },
          ]}
        />
        <p className="text-xs text-ink-3 sm:ml-auto">Drag cards between columns. Demo: changes are not saved.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const cards = filtered.filter((i) => i.status === col.status);
          const visible = cards.slice(0, shown[col.status]);
          return (
            <section
              key={col.status}
              aria-label={STATUS_LABEL[col.status]}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.status);
              }}
              onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, col.status);
                setOver(null);
                setDragging(null);
              }}
              className={`flex min-w-0 flex-col rounded-[20px] border p-3 transition-colors ${over === col.status ? "border-academic bg-academic-soft" : "border-line bg-surface-2/70"}`}
            >
              <header className="mb-3 px-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${col.dot}`} />
                  {STATUS_LABEL[col.status]}
                  <span className="tabular rounded-full bg-surface px-2 py-px font-mono text-[11px] font-normal text-ink-3 ring-1 ring-line">{cards.length}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-3">{col.hint}</p>
              </header>

              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {visible.map((card) => {
                    const delta = card.scoreNow - card.scoreBefore;
                    const next = NEXT[card.status];
                    return (
                      <motion.li
                        key={card.interventionId}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: dragging === card.interventionId ? 0.4 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", card.interventionId);
                            setDragging(card.interventionId);
                          }}
                          onDragEnd={() => setDragging(null)}
                          className="group cursor-grab rounded-2xl border border-line bg-surface p-3 shadow-card active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link href={`/students/${card.studentId}`} className="min-w-0 text-[13px] font-semibold text-ink hover:underline">
                              {card.studentName}
                            </Link>
                            <span className={`shrink-0 rounded-full px-2 py-px text-[10px] font-medium ${card.domain === "academic" ? "bg-academic-soft text-academic" : "bg-placement-soft text-placement"}`}>
                              {DOMAIN_LABEL[card.domain]}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] leading-snug text-ink-2">{card.label}</p>
                          <p className="mt-1 text-[11px] leading-snug text-ink-3">{card.reason}</p>
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2 text-[11px] text-ink-3">
                            <span className="truncate">
                              {card.owner}, {card.startedWeek}
                            </span>
                            {card.status === "completed" ? (
                              <span className={`inline-flex items-center gap-0.5 font-mono font-semibold ${delta > 0 ? "text-risk-low-ink" : delta < 0 ? "text-risk-high-ink" : "text-ink-3"}`}>
                                {delta > 0 ? <TrendUpIcon aria-hidden="true" weight="bold" /> : delta < 0 ? <TrendDownIcon aria-hidden="true" weight="bold" /> : null}
                                {formatSignedInt(delta)} pts
                              </span>
                            ) : next ? (
                              <button
                                type="button"
                                onClick={() => move(card.interventionId, next)}
                                className="pressable inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 font-medium text-ink-2 hover:bg-inverse hover:text-on-inverse"
                              >
                                {card.status === "suggested" ? "Assign" : card.status === "assigned" ? "Start" : "Complete"}
                                <ArrowRightIcon aria-hidden="true" className="h-3 w-3" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>

              {cards.length === 0 ? <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-3">Nothing here. Drop a card to move it.</p> : null}
              {cards.length > visible.length ? (
                <button
                  type="button"
                  onClick={() => setShown((s) => ({ ...s, [col.status]: s[col.status] + STEP * 2 }))}
                  className="mt-2 inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-xs font-medium text-ink-2 hover:bg-surface hover:text-ink"
                >
                  Show {Math.min(STEP * 2, cards.length - visible.length)} more of {cards.length - visible.length}
                  <ArrowUpRightIcon aria-hidden="true" className="h-3 w-3 rotate-90" />
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
