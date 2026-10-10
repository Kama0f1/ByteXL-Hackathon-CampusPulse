import type { Metadata } from "next";
import { StudentsExplorer, type RiskCell, type RiskFilter } from "@/components/students/StudentsExplorer";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSegmentReport } from "@/lib/segments";
import { getStudents } from "@/lib/students";

export const metadata: Metadata = {
  title: "Students",
};

const RISK_FILTERS: RiskFilter[] = ["all", "any-high", "academic-high", "placement-high", "both-high"];
const LEVELS = ["high", "medium", "low"] as const;
const isLevel = (v?: string): v is RiskCell["academic"] => LEVELS.includes(v as RiskCell["academic"]);

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ risk?: string; segment?: string; academic?: string; placement?: string }> }) {
  const [{ risk, segment, academic, placement }, { data: rows, origin }, { data: segments }] = await Promise.all([searchParams, getStudents(), getSegmentReport()]);
  const departments = [...new Set(rows.map((r) => r.department))];
  const initialRisk = RISK_FILTERS.includes(risk as RiskFilter) ? (risk as RiskFilter) : "all";
  const initialSegment = segments.segments.some((s) => s.segmentId === segment) ? segment : "all";
  const initialCell = isLevel(academic) && isLevel(placement) ? { academic, placement } : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="All students"
        description="Every student's combined record: one Success Score, academic and placement risk side by side. Click a row for the full explanation."
      />
      <StudentsExplorer
        rows={rows}
        departments={departments}
        segments={segments.segments.map((s) => ({ segmentId: s.segmentId, name: s.name }))}
        initialRisk={initialRisk}
        initialSegment={initialSegment}
        initialCell={initialCell}
      />
      <DemoFootnote endpoint="GET /api/students" origin={origin} />
    </div>
  );
}
