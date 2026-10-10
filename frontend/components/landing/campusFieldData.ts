import type { RiskLevel } from "@/lib/types";

/** One student as a short tuple: [id, name, deptIdx, score, academic, placement, segmentIdx, academicReadiness, placementReadiness]. */
export type FieldRow = [string, string, number, number, number, number, number, number, number];

/** Compact form of the landing-page campus field. Sending 1,000 objects as props doubled the page size. */
export type FieldData = { departments: string[]; segments: { id: string; name: string }[]; rows: FieldRow[] };

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

export const LEVELS: RiskLevel[] = ["low", "medium", "high"];

const r1 = (n: number) => Math.round(n * 10) / 10;

export function packField(students: FieldStudent[], segments: { id: string; name: string }[]): FieldData {
  const departments = [...new Set(students.map((s) => s.department))];
  const segIndex = new Map(segments.map((s, i) => [s.id, i]));
  return {
    departments,
    segments,
    rows: students.map((s) => [
      s.id,
      s.name,
      departments.indexOf(s.department),
      r1(s.score),
      LEVELS.indexOf(s.academic),
      LEVELS.indexOf(s.placement),
      segIndex.get(s.segment) ?? -1,
      r1(s.academicReadiness),
      r1(s.placementReadiness),
    ]),
  };
}

export function unpackField(data: FieldData): FieldStudent[] {
  return data.rows.map(([id, name, dept, score, academic, placement, seg, ar, pr]) => ({
    id,
    name,
    department: data.departments[dept] ?? "",
    score,
    academic: LEVELS[academic] ?? "low",
    placement: LEVELS[placement] ?? "low",
    segment: data.segments[seg]?.id ?? "",
    academicReadiness: ar,
    placementReadiness: pr,
  }));
}
