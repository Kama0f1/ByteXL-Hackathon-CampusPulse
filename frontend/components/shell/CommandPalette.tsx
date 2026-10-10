"use client";

import { ArrowRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavIcon } from "@/components/shell/NavIcon";
import { NAV_ITEMS } from "@/components/shell/nav";
import { Avatar } from "@/components/ui/Avatar";
import { RiskGlyph } from "@/components/ui/RiskBadge";
import type { RiskLevel } from "@/lib/types";

export type PaletteStudent = {
  studentId: string;
  name: string;
  department: string;
  semester: number;
  successScore: number;
  academicRisk: RiskLevel;
  placementRisk: RiskLevel;
};

type Result =
  | { kind: "page"; id: string; href: string; label: string; hint: string; nav: (typeof NAV_ITEMS)[number] }
  | { kind: "student"; id: string; href: string; student: PaletteStudent };

type CommandPaletteProps = {
  students: PaletteStudent[];
  /** Students shown before typing, e.g. the attention queue. */
  suggested: PaletteStudent[];
};

/** Cmd/Ctrl+K search across pages and every student. */
export function CommandPalette({ students, suggested }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    // Platform hint for the shortcut label; read once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: Result[] = NAV_ITEMS.filter((item) => !q || item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q)).map(
      (item) => ({ kind: "page", id: `page-${item.key}`, href: item.href, label: item.label, hint: item.hint, nav: item }),
    );
    const pool = q ? students.filter((s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)) : suggested;
    const people: Result[] = pool.slice(0, 7).map((s) => ({ kind: "student", id: s.studentId, href: `/students/${s.studentId}`, student: s }));
    return q ? [...people, ...pages] : [...pages, ...people];
  }, [query, students, suggested]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function go(result: Result | undefined) {
    if (!result) return;
    close();
    router.push(result.href);
  }

  function onInputKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    } else if (event.key === "Escape") {
      close();
    }
  }

  const pageResults = results.filter((r) => r.kind === "page");
  const studentResults = results.filter((r) => r.kind === "student");
  const indexOf = (r: Result) => results.indexOf(r);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable flex h-9 w-full max-w-[340px] items-center gap-2 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-3 shadow-card hover:border-line-strong hover:text-ink-2"
      >
        <MagnifyingGlassIcon aria-hidden="true" className="h-4 w-4" />
        <span className="flex-1 truncate text-left">Search students or pages</span>
        <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 py-px font-mono text-[11px] text-ink-3 sm:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
            <motion.div
              className="absolute inset-0 bg-[#0d1117]/30 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search CampusPulse"
              className="relative w-full max-w-[600px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-pop"
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-center gap-3 border-b border-line px-4">
                <MagnifyingGlassIcon aria-hidden="true" className="h-5 w-5 text-ink-3" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onInputKey}
                  placeholder="Type a name, student ID or page"
                  aria-label="Search"
                  aria-controls="palette-results"
                  aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
                  className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
                />
                <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-px font-mono text-[11px] text-ink-3">Esc</kbd>
              </div>

              <div id="palette-results" role="listbox" className="scroll-thin max-h-[56vh] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="px-3 py-10 text-center text-sm text-ink-3">No students or pages match &ldquo;{query}&rdquo;.</p>
                ) : null}

                {(query
                  ? [
                      { title: "Students", items: studentResults },
                      { title: "Pages", items: pageResults },
                    ]
                  : [
                      { title: "Pages", items: pageResults },
                      { title: "Needs attention", items: studentResults },
                    ]
                ).map((group) =>
                    group.items.length ? (
                      <div key={group.title} className="mb-1">
                        <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-ink-3">{group.title}</p>
                        {group.items.map((result) => {
                          const i = indexOf(result);
                          const selected = i === active;
                          return (
                            <div
                              key={result.id}
                              id={`palette-${result.id}`}
                              role="option"
                              aria-selected={selected}
                              onMouseMove={() => setActive(i)}
                              onClick={() => go(result)}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${selected ? "bg-surface-3" : ""}`}
                            >
                              {result.kind === "page" ? (
                                <>
                                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-ink-2 ring-1 ring-line">
                                    <NavIcon name={result.nav.key} className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-ink">{result.label}</span>
                                    <span className="block truncate text-xs text-ink-3">{result.hint}</span>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Avatar name={result.student.name} size="sm" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-ink">{result.student.name}</span>
                                    <span className="block truncate font-mono text-[11px] text-ink-3">
                                      {result.student.studentId}, {result.student.department} sem {result.student.semester}
                                    </span>
                                  </span>
                                  <span className="flex items-center gap-1.5" title="Academic and placement risk">
                                    <RiskGlyph level={result.student.academicRisk} />
                                    <RiskGlyph level={result.student.placementRisk} />
                                  </span>
                                  <span className="tabular w-8 text-right text-sm font-semibold text-ink">{result.student.successScore}</span>
                                </>
                              )}
                              <ArrowRightIcon aria-hidden="true" className={`h-4 w-4 text-ink-3 transition-opacity ${selected ? "opacity-100" : "opacity-0"}`} />
                            </div>
                          );
                        })}
                      </div>
                    ) : null,
                  )}
              </div>

              <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
                <span>
                  <kbd className="font-mono">↑ ↓</kbd> to move
                </span>
                <span>
                  <kbd className="font-mono">Enter</kbd> to open
                </span>
                <span className="ml-auto">{students.length} students searchable</span>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
