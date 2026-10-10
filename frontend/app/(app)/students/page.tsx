import type { Metadata } from "next";
import { StudentsExplorer, type RiskFilter } from "@/components/students/StudentsExplorer";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSegmentReport } from "@/lib/segments";
import { getStudents } from "@/lib/students";

export const metadata: Metadata = {
  title: "Students",
};

const RISK_FILTERS: RiskFilter[] = ["all", "any-high", "academic-high", "placement-high", "both-high"];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ risk?: string; segment?: string }> }) {
  const [{ risk, segment }, { data: rows }, { data: segments }] = await Promise.all([searchParams, getStudents(), getSegmentReport()]);
  const departments = [...new Set(rows.map((r) => r.department))];
  const initialRisk = RISK_FILTERS.includes(risk as RiskFilter) ? (risk as RiskFilter) : "all";
  const initialSegment = segments.segments.some((s) => s.segmentId === segment) ? segment : "all";

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
      />
      <DemoFootnote endpoint="GET /api/students" />
    </div>
  );
}
