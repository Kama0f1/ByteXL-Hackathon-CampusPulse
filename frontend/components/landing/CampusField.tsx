"use client";

import { useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import type { RiskLevel } from "@/lib/types";

export type FieldStudent = {
  id: string;
  name: string;
  department: string;
  score: number;
  academic: RiskLevel;
  placement: RiskLevel;
  segment: string;
  academicReadiness: number;
  placementReadiness: number;
};

type Mode = "risk" | "segments" | "map";

const W = 560;
const H = 400;
const rank: Record<RiskLevel, number> = { high: 2, medium: 1, low: 0 };

function severity(s: FieldStudent): RiskLevel {
  const r = Math.max(rank[s.academic], rank[s.placement]);
  return r === 2 ? "high" : r === 1 ? "medium" : "low";
}

const FILL: Record<RiskLevel, string> = {
  high: "var(--risk-high)",
  medium: "var(--risk-medium)",
  low: "rgb(255 255 255 / 0.28)",
};

type Layout = { pos: Map<string, [number, number]>; labels: { x: number; y: number; text: string; anchor?: "start" | "middle" }[] };

function gridLayout(students: FieldStudent[]): Layout {
  const groups: { level: RiskLevel; title: string }[] = [
    { level: "high", title: "High risk" },
    { level: "medium", title: "Medium" },
    { level: "low", title: "On track" },
  ];
  const cols = 34;
  const gap = 13.6;
  const pos = new Map<string, [number, number]>();
  const labels: Layout["labels"] = [];
  const left = (W - (cols - 1) * gap) / 2;
  let y = 26;
  for (const g of groups) {
    const members = students.filter((s) => severity(s) === g.level).sort((a, b) => a.score - b.score);
    labels.push({ x: left - 4, y: y - 10, text: `${g.title}  ${members.length}`, anchor: "start" });
    members.forEach((s, i) => pos.set(s.id, [left + (i % cols) * gap, y + Math.floor(i / cols) * gap + 2]));
    y += Math.ceil(members.length / cols) * gap + 30;
  }
  return { pos, labels };
}

function segmentLayout(students: FieldStudent[], segments: { id: string; name: string }[]): Layout {
  const pos = new Map<string, [number, number]>();
  const labels: Layout["labels"] = [];
  const cellW = W / 3;
  const cellH = H / 2;
  segments.forEach((seg, k) => {
    const members = students.filter((s) => s.segment === seg.id).sort((a, b) => rank[severity(b)] - rank[severity(a)] || a.score - b.score);
    const cx = (k % 3) * cellW + cellW / 2;
    const cy = Math.floor(k / 3) * cellH + cellH / 2 + 10;
    const cols = Math.ceil(Math.sqrt(members.length * 1.3));
    const gap = 9.5;
    const rows = Math.ceil(members.length / cols);
    members.forEach((s, i) => pos.set(s.id, [cx - ((cols - 1) * gap) / 2 + (i % cols) * gap, cy - ((rows - 1) * gap) / 2 + Math.floor(i / cols) * gap]));
    const short = seg.name.length > 26 ? `${seg.name.slice(0, 24)}…` : seg.name;
    labels.push({ x: cx, y: cy - (rows * gap) / 2 - 10, text: short, anchor: "middle" });
  });
  return { pos, labels };
}

function mapLayout(students: FieldStudent[]): Layout {
  const pos = new Map<string, [number, number]>();
  students.forEach((s) => pos.set(s.id, [30 + (s.academicReadiness / 100) * (W - 50), H - 30 - (s.placementReadiness / 100) * (H - 50)]));
  return {
    pos,
    labels: [
      { x: W - 110, y: 24, text: "Ready on both", anchor: "start" },
      { x: W / 2, y: H - 6, text: "Academic readiness →", anchor: "middle" },
      { x: 30, y: 24, text: "↑ Placement readiness", anchor: "start" },
    ],
  };
}

/** The whole simulated campus as dots. Switch views to watch the same 640 students regroup. */
export function CampusField({ students, segments }: { students: FieldStudent[]; segments: { id: string; name: string }[] }) {
  const [mode, setMode] = useState<Mode>("risk");
  const [hover, setHover] = useState<FieldStudent | null>(null);
  const reduce = useReducedMotion();

  const layouts = useMemo(
    () => ({ risk: gridLayout(students), segments: segmentLayout(students, segments), map: mapLayout(students) }),
    [students, segments],
  );
  const layout = layouts[mode];
  const hoverPos = hover ? layout.pos.get(hover.id) : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Arrange students"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "risk", label: "By risk" },
            { value: "segments", label: "By segment" },
            { value: "map", label: "Readiness map" },
          ]}
        />
        <ul className="flex gap-3 text-[11px] text-white/60" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-risk-high" /> High
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-risk-medium" /> Medium
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-white/30" /> On track
          </li>
        </ul>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${students.length} simulated students arranged ${mode === "risk" ? "by risk level" : mode === "segments" ? "by segment" : "by academic and placement readiness"}.`}>
          {layout.labels.map((l) => (
            <text key={`${mode}-${l.text}`} x={l.x} y={l.y} textAnchor={l.anchor ?? "start"} className="fill-white/55 text-[11px] font-medium">
              {l.text}
            </text>
          ))}
          {students.map((s, i) => {
            const [x, y] = layout.pos.get(s.id) ?? [0, 0];
            const level = severity(s);
            return (
              <circle
                key={s.id}
                r={hover?.id === s.id ? 6 : 4}
                cx={0}
                cy={0}
                fill={FILL[level]}
                onPointerEnter={() => setHover(s)}
                onPointerLeave={() => setHover(null)}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: reduce ? "none" : `transform 900ms cubic-bezier(0.77, 0, 0.175, 1) ${(i % 40) * 6}ms, r 150ms ease`,
                }}
              />
            );
          })}
        </svg>
        {hover && hoverPos ? (
          <div
            className="pointer-events-none absolute z-10 w-52 -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-[#121418]/95 px-3 py-2 text-xs text-white shadow-pop backdrop-blur"
            style={{ left: `${(hoverPos[0] / W) * 100}%`, top: `calc(${(hoverPos[1] / H) * 100}% - 12px)` }}
          >
            <p className="font-semibold">{hover.name}</p>
            <p className="text-white/60">
              {hover.department}, score {hover.score}
            </p>
            <p className="mt-1 text-white/80">
              Academic {hover.academic}, placement {hover.placement}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
