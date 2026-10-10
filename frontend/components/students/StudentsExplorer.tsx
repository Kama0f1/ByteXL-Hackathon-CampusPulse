"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretLeftIcon,
  CaretRightIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Segmented } from "@/components/ui/Segmented";
import { formatSignedInt } from "@/lib/format";
import { LEVEL_ORDER } from "@/lib/labels";
import type { StudentRow } from "@/lib/types";

export type RiskFilter = "all" | "any-high" | "academic-high" | "placement-high" | "both-high";
type SortKey = "name" | "successScore" | "scoreChange" | "academicRisk" | "placementRisk" | "placementProbability" | "attendancePct" | "cgpa";

const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "any-high", label: "Any high" },
  { value: "academic-high", label: "Academic high" },
  { value: "placement-high", label: "Placement high" },
  { value: "both-high", label: "Both high" },
];

const PAGE_SIZE = 20;

type QuickKey = "attendance" | "final-year" | "dropping";

const QUICK_FILTERS: { key: QuickKey; label: string; test: (r: StudentRow) => boolean }[] = [
  { key: "attendance", label: "Attendance under 75%", test: (r) => r.attendancePct < 75 },
  { key: "final-year", label: "Final year", test: (r) => r.semester >= 7 },
  { key: "dropping", label: "Score dropped 3+ points", test: (r) => r.scoreChange <= -3 },
];

type StudentsExplorerProps = {
  rows: StudentRow[];
  departments: string[];
  segments: { segmentId: string; name: string }[];
  initialRisk?: RiskFilter;
  initialSegment?: string;
};

function matchesRisk(row: StudentRow, risk: RiskFilter) {
  switch (risk) {
    case "any-high":
      return row.academicRisk === "high" || row.placementRisk === "high";
    case "academic-high":
      return row.academicRisk === "high";
    case "placement-high":
      return row.placementRisk === "high";
    case "both-high":
      return row.academicRisk === "high" && row.placementRisk === "high";
    default:
      return true;
  }
}

export function StudentsExplorer({ rows, departments, segments, initialRisk = "all", initialSegment = "all" }: StudentsExplorerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [risk, setRisk] = useState<RiskFilter>(initialRisk);
  const [segment, setSegment] = useState(initialSegment);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "successScore", dir: "asc" });
  const [page, setPage] = useState(0);
  const [quick, setQuick] = useState<QuickKey[]>([]);

  const segmentName = useMemo(() => new Map(segments.map((s) => [s.segmentId, s.name])), [segments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q)) &&
        (department === "all" || r.department === department) &&
        (segment === "all" || r.segmentId === segment) &&
        matchesRisk(r, risk) &&
        quick.every((key) => QUICK_FILTERS.find((f) => f.key === key)!.test(r)),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const k = sort.key;
      if (k === "name") return a.name.localeCompare(b.name) * dir;
      if (k === "academicRisk" || k === "placementRisk") return (LEVEL_ORDER[a[k]] - LEVEL_ORDER[b[k]]) * dir || a.successScore - b.successScore;
      return (a[k] - b[k]) * dir;
    });
  }, [rows, query, department, segment, risk, sort, quick]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const filtersActive = query || department !== "all" || risk !== "all" || segment !== "all" || quick.length > 0;

  function update<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  }

  function exportCsv() {
    const header = ["student_id", "name", "department", "semester", "mentor", "success_score", "score_change_4wk", "academic_risk", "placement_risk", "segment", "cgpa", "attendance_pct", "lms_completion_pct", "coding_score", "placement_probability"];
    const lines = filtered.map((r) =>
      [r.studentId, r.name, r.department, r.semester, r.mentor, r.successScore, r.scoreChange, r.academicRisk, r.placementRisk, segmentName.get(r.segmentId) ?? r.segmentId, r.cgpa, r.attendancePct, r.lmsCompletionPct, r.codingScore, r.placementProbability]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campuspulse-students-${filtered.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sortHeader(k: SortKey, children: React.ReactNode, align: "left" | "right" = "left") {
    const activeSort = sort.key === k;
    return (
      <th key={k} scope="col" aria-sort={activeSort ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1 rounded-md hover:text-ink ${activeSort ? "text-ink" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}
        >
          {children}
          {activeSort ? (
            sort.dir === "asc" ? <ArrowUpIcon aria-hidden="true" className="h-3 w-3" /> : <ArrowDownIcon aria-hidden="true" className="h-3 w-3" />
          ) : null}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rise flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3 shadow-card" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search by name or student ID</span>
            <MagnifyingGlassIcon aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => update(setQuery)(e.target.value)}
              placeholder="Search by name or student ID"
              className="h-10 w-full rounded-full border border-line bg-surface-2 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-academic focus:bg-surface"
            />
          </label>
          <Segmented
            label="Department"
            value={department}
            onChange={update(setDepartment)}
            options={[{ value: "all", label: "All" }, ...departments.map((d) => ({ value: d, label: d }))]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick filters">
          <span className="mr-1 text-xs font-medium text-ink-3">Quick filters</span>
          {QUICK_FILTERS.map((f) => {
            const on = quick.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setQuick((q) => (on ? q.filter((k) => k !== f.key) : [...q, f.key]));
                  setPage(0);
                }}
                className={`pressable inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${on ? "border-inverse bg-inverse text-on-inverse" : "border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink"}`}
              >
                {on ? <XIcon aria-hidden="true" className="h-3 w-3" /> : null}
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Risk" size="sm" value={risk} onChange={update(setRisk)} options={RISK_OPTIONS} />
          <label className="sr-only" htmlFor="segment-filter">
            Segment
          </label>
          <select
            id="segment-filter"
            value={segment}
            onChange={(e) => update(setSegment)(e.target.value)}
            className="h-8 rounded-full border border-line bg-surface-2 px-3 text-xs font-medium text-ink-2 outline-none focus:border-academic"
          >
            <option value="all">All segments</option>
            {segments.map((s) => (
              <option key={s.segmentId} value={s.segmentId}>
                {s.name}
              </option>
            ))}
          </select>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDepartment("all");
                setRisk("all");
                setSegment("all");
                setQuick([]);
                setPage(0);
              }}
              className={buttonClass("ghost", "sm")}
            >
              <XIcon aria-hidden="true" className="h-3.5 w-3.5" /> Clear
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-3">
            <p className="text-[13px] text-ink-3" aria-live="polite">
              <span className="tabular font-semibold text-ink">{filtered.length}</span> of {rows.length} students
            </p>
            <button type="button" onClick={exportCsv} className={buttonClass("secondary", "sm")} disabled={filtered.length === 0}>
              <DownloadSimpleIcon aria-hidden="true" className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="rise overflow-hidden rounded-[20px] border border-line bg-surface shadow-card" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="scroll-thin relative overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs text-ink-3">
              <tr>
                {sortHeader("name", "Student")}
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Department
                </th>
                {sortHeader("successScore", "Score", "right")}
                {sortHeader("scoreChange", "4-week change", "right")}
                {sortHeader("academicRisk", "Academic")}
                {sortHeader("placementRisk", "Placement")}
                {sortHeader("placementProbability", "Placement chance", "right")}
                {sortHeader("attendancePct", "Attendance", "right")}
                {sortHeader("cgpa", "CGPA", "right")}
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Segment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((r) => (
                <tr
                  key={r.studentId}
                  onClick={() => router.push(`/students/${r.studentId}`)}
                  className="group cursor-pointer transition-colors hover:bg-surface-2"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/students/${r.studentId}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink group-hover:underline">
                          {r.name}
                        </Link>
                        <span className="font-mono text-[11px] text-ink-3">{r.studentId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-ink-2">
                    {r.department} <span className="text-ink-3">sem {r.semester}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-surface-3 md:block" aria-hidden="true">
                        <div
                          className={`h-full rounded-full ${r.successScore < 45 ? "bg-risk-high" : r.successScore < 60 ? "bg-risk-medium" : "bg-ink-2"}`}
                          style={{ width: `${r.successScore}%` }}
                        />
                      </div>
                      <span className="tabular w-7 text-right font-semibold text-ink">{r.successScore}</span>
                    </div>
                  </td>
                  <td className={`tabular px-3 py-2.5 text-right font-mono text-xs ${r.scoreChange <= -3 ? "text-risk-high-ink" : r.scoreChange >= 3 ? "text-risk-low-ink" : "text-ink-3"}`}>
                    {formatSignedInt(r.scoreChange)}
                  </td>
                  <td className="px-3 py-2.5">
                    <RiskBadge level={r.academicRisk} />
                  </td>
                  <td className="px-3 py-2.5">
                    <RiskBadge level={r.placementRisk} />
                  </td>
                  <td className={`tabular px-3 py-2.5 text-right ${r.placementProbability < 0.4 ? "font-semibold text-risk-high-ink" : "text-ink-2"}`}>
                    {Math.round(r.placementProbability * 100)}%
                  </td>
                  <td className={`tabular px-3 py-2.5 text-right ${r.attendancePct < 75 ? "font-semibold text-risk-high-ink" : "text-ink-2"}`}>
                    {r.attendancePct}%
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-ink-2">{r.cgpa.toFixed(1)}</td>
                  <td className="max-w-48 truncate px-3 py-2.5 text-xs text-ink-3">{segmentName.get(r.segmentId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-ink">No students match these filters</p>
            <p className="mt-1 text-[13px] text-ink-3">Try a different department or clear the risk filter.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-ink-3">
            <p>
              Showing <span className="tabular text-ink-2">{current * PAGE_SIZE + 1}</span>-
              <span className="tabular text-ink-2">{Math.min(filtered.length, (current + 1) * PAGE_SIZE)}</span> of {filtered.length}. Attendance below 75% is
              highlighted.
            </p>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className={buttonClass("ghost", "sm", "w-8 px-0")}>
                <CaretLeftIcon aria-hidden="true" className="h-4 w-4" />
              </button>
              <span className="tabular px-2">
                {current + 1} / {pageCount}
              </span>
              <button type="button" aria-label="Next page" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} className={buttonClass("ghost", "sm", "w-8 px-0")}>
                <CaretRightIcon aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
