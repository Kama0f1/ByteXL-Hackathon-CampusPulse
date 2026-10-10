"use client";

import { CheckCircleIcon, FileCsvIcon, UploadSimpleIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

/** Expected columns per data area, matching the team's CSV exports in /data. */
const AREAS = [
  { key: "academics", label: "Academics", columns: ["cgpa", "backlogs", "semester"] },
  { key: "attendance", label: "Attendance", columns: ["attendance_pct", "classes_attended"] },
  { key: "lms", label: "LMS activity", columns: ["assignment_completion_pct", "lms_logins_30d", "quiz_avg"] },
  { key: "engagement", label: "Engagement", columns: ["clubs_participation_count", "events_attended_count"] },
  { key: "placement", label: "Placement readiness", columns: ["aptitude_score", "coding_score", "mock_interview_score", "placement_outcome"] },
  { key: "skills", label: "Skills", columns: ["technical_skill_score", "communication_score", "projects_count", "certifications_count"] },
  { key: "feedback", label: "Feedback", columns: ["satisfaction_score", "support_need_category"] },
] as const;

/** Valid range for every numeric column; anything outside (or not a number) is reported. */
const RANGES: Record<string, [number, number]> = {
  cgpa: [0, 10], backlogs: [0, 30], semester: [1, 8],
  attendance_pct: [0, 100], classes_attended: [0, 1000],
  assignment_completion_pct: [0, 100], lms_logins_30d: [0, 1000], quiz_avg: [0, 100],
  clubs_participation_count: [0, 50], events_attended_count: [0, 200],
  aptitude_score: [0, 100], coding_score: [0, 100], mock_interview_score: [0, 100],
  technical_skill_score: [0, 100], communication_score: [0, 100], projects_count: [0, 100], certifications_count: [0, 100],
  satisfaction_score: [0, 10],
};
const OUTCOMES = new Set(["placed", "not placed"]);

type Checked = {
  file: string;
  area: (typeof AREAS)[number] | null;
  rows: number;
  columns: string[];
  missingColumns: string[];
  emptyCells: number;
  duplicateIds: number;
  ids: Set<string>;
  /** Problems that make the file unsafe to load: blank IDs, bad values, missing columns, duplicates. */
  problems: string[];
  error?: string;
};

const isBlank = (v: string | undefined) => v === undefined || v === "" || v.toLowerCase() === "nan" || v.toLowerCase() === "null";

function splitLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function check(file: string, text: string): Checked {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const empty: Checked = { file, area: null, rows: 0, columns: [], missingColumns: [], emptyCells: 0, duplicateIds: 0, ids: new Set(), problems: [] };
  if (lines.length < 2) return { ...empty, error: "The file has no data rows." };

  const columns = splitLine(lines[0]).map((c) => c.toLowerCase());
  const idIndex = columns.findIndex((c) => c === "student_id" || c === "id");
  if (idIndex < 0) return { ...empty, columns, error: "No student_id column, so it cannot be joined to the other sources." };

  const scored = AREAS.map((a) => ({ a, hits: a.columns.filter((c) => columns.includes(c)).length })).sort((x, y) => y.hits - x.hits);
  const area = scored[0].hits > 0 ? scored[0].a : null;

  const ids = new Set<string>();
  let duplicateIds = 0;
  let emptyCells = 0;
  let blankIds = 0;
  let badValues = 0;
  const examples: string[] = [];
  for (const [n, line] of lines.slice(1).entries()) {
    const cells = splitLine(line);
    const id = cells[idIndex];
    if (isBlank(id)) {
      blankIds += 1;
    } else {
      if (ids.has(id)) duplicateIds += 1;
      ids.add(id);
    }
    columns.forEach((col, i) => {
      const v = cells[i];
      if (isBlank(v)) {
        if (i !== idIndex) emptyCells += 1;
        return;
      }
      const range = RANGES[col];
      const bad = range
        ? !(Number.isFinite(Number(v)) && Number(v) >= range[0] && Number(v) <= range[1])
        : col === "placement_outcome" && !OUTCOMES.has(v.toLowerCase());
      if (bad) {
        badValues += 1;
        if (examples.length < 3) examples.push(`${col} = ${v} (row ${n + 2})`);
      }
    });
  }

  const missingColumns = area ? area.columns.filter((c) => !columns.includes(c)) : [];
  const problems = [
    blankIds ? `${blankIds} row${blankIds === 1 ? "" : "s"} with no student_id` : "",
    duplicateIds ? `${duplicateIds} duplicate student_id${duplicateIds === 1 ? "" : "s"}` : "",
    badValues ? `${badValues} invalid value${badValues === 1 ? "" : "s"}, e.g. ${examples.join(", ")}` : "",
    missingColumns.length ? `missing column${missingColumns.length === 1 ? "" : "s"}: ${missingColumns.join(", ")}` : "",
  ].filter(Boolean);

  return {
    file,
    area,
    rows: lines.length - 1,
    columns,
    missingColumns,
    emptyCells,
    duplicateIds,
    ids,
    problems,
    error: area ? undefined : "Columns don't match any of the seven data areas.",
  };
}

/** Drop CSV exports to see how they map to the seven areas and how many students join. Runs in the browser only. */
export function CsvChecker() {
  const [files, setFiles] = useState<Checked[]>([]);
  const [dragging, setDragging] = useState(false);

  async function add(list: FileList | null) {
    if (!list) return;
    const checked = await Promise.all([...list].filter((f) => f.name.toLowerCase().endsWith(".csv")).map(async (f) => check(f.name, await f.text())));
    setFiles((prev) => [...prev.filter((p) => !checked.some((c) => c.file === p.file)), ...checked]);
  }

  const valid = files.filter((f) => f.area && !f.error);
  const union = new Set(valid.flatMap((f) => [...f.ids]));
  const inAll = valid.length ? [...union].filter((id) => valid.every((f) => f.ids.has(id))).length : 0;
  const covered = new Set(valid.map((f) => f.area!.key));
  const withProblems = valid.filter((f) => f.problems.length);

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-6 py-8 text-center transition-colors ${dragging ? "border-academic bg-academic-soft" : "border-line-strong bg-surface-2 hover:border-ink-3"}`}
      >
        <UploadSimpleIcon aria-hidden="true" className="h-7 w-7 text-ink-3" />
        <span className="text-sm font-semibold text-ink">Drop CSV exports here, or click to choose</span>
        <span className="text-xs text-ink-3">Try the seven files in the repo&apos;s data folder. Files stay in your browser; nothing is uploaded.</span>
        <input type="file" accept=".csv" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
      </label>

      {files.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="text-xs text-ink-3">Data areas covered</p>
              <p className="tabular mt-1 text-2xl font-semibold text-ink">
                {covered.size} <span className="text-base font-medium text-ink-3">/ 7</span>
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="text-xs text-ink-3">Unique students found</p>
              <p className="tabular mt-1 text-2xl font-semibold text-ink">{union.size.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="text-xs text-ink-3">Present in every file</p>
              <p className="tabular mt-1 text-2xl font-semibold text-ink">
                {inAll.toLocaleString("en-IN")}
                {union.size ? <span className="ml-1.5 text-base font-medium text-ink-3">{Math.round((inAll / union.size) * 100)}%</span> : null}
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {files.map((f) => (
                <motion.li
                  key={f.file}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-wrap items-start gap-3 rounded-2xl border border-line bg-surface p-3.5"
                >
                  <FileCsvIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono font-medium text-ink">{f.file}</span>
                      {f.area && !f.error && f.problems.length ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-risk-medium-soft px-2 py-0.5 text-xs font-medium text-risk-medium-ink">
                          <WarningCircleIcon aria-hidden="true" weight="fill" className="h-3.5 w-3.5" /> {f.area.label}, needs fixing
                        </span>
                      ) : f.area && !f.error ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-risk-low-soft px-2 py-0.5 text-xs font-medium text-risk-low-ink">
                          <CheckCircleIcon aria-hidden="true" weight="fill" className="h-3.5 w-3.5" /> {f.area.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-soft px-2 py-0.5 text-xs font-medium text-risk-high-ink">
                          <WarningCircleIcon aria-hidden="true" weight="fill" className="h-3.5 w-3.5" /> Not recognised
                        </span>
                      )}
                    </p>
                    {f.error ? (
                      <p className="mt-1 text-[13px] text-risk-high-ink">{f.error}</p>
                    ) : (
                      <>
                        <p className="mt-1 text-[13px] text-ink-2">
                          {f.rows.toLocaleString("en-IN")} rows, {f.ids.size.toLocaleString("en-IN")} students, {f.emptyCells} empty cells (filled when loaded).
                        </p>
                        {f.problems.map((p) => (
                          <p key={p} className="mt-0.5 text-[13px] text-risk-medium-ink">
                            {p.charAt(0).toUpperCase() + p.slice(1)}.
                          </p>
                        ))}
                      </>
                    )}
                    <p className="mt-1.5 flex flex-wrap gap-1">
                      {f.columns.map((c) => (
                        <code key={c} className="rounded-md bg-surface-3 px-1.5 py-px font-mono text-[10.5px] text-ink-2">
                          {c}
                        </code>
                      ))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles((all) => all.filter((x) => x.file !== f.file))}
                    aria-label={`Remove ${f.file}`}
                    className={buttonClass("ghost", "sm", "w-8 px-0")}
                  >
                    <XIcon aria-hidden="true" className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {covered.size < 7 ? (
            <p className="text-xs text-ink-3">
              Still missing: {AREAS.filter((a) => !covered.has(a.key)).map((a) => a.label).join(", ")}.
            </p>
          ) : withProblems.length ? (
            <p className="text-xs font-medium text-risk-medium-ink">
              All seven data areas are present, but {withProblems.length} file{withProblems.length === 1 ? " needs" : "s need"} fixing before they can be loaded.
            </p>
          ) : inAll === 0 ? (
            <p className="text-xs font-medium text-risk-medium-ink">All seven data areas are present, but no student appears in every file, so nothing joins.</p>
          ) : (
            <p className="text-xs font-medium text-risk-low-ink">
              All seven data areas present and valid; {inAll.toLocaleString("en-IN")} students join on student_id.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
