import type { Metadata } from "next";
import { SegmentExplorer } from "@/components/segments/SegmentExplorer";
import { DemoFootnote } from "@/components/ui/DemoBadge";
import { InfoTip } from "@/components/ui/InfoTip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { getSegmentReport } from "@/lib/segments";

export const metadata: Metadata = {
  title: "Segments",
};

export default async function SegmentsPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const [{ focus }, { data: report }] = await Promise.all([searchParams, getSegmentReport()]);
  const initialFocus = report.segments.some((s) => s.segmentId === focus) ? focus : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segments"
        description="Students grouped by similar profiles, like strong academics with low placement readiness. Plan one session for a whole group instead of 100 separate ones."
      />
      <Panel
        index={1}
        title={
          <>
            Which groups share the same problem?{" "}
            <InfoTip align="left">{`Grouped automatically by ${report.method}. Group names are written by faculty from each cluster's profile.`}</InfoTip>
          </>
        }
        description="Pick a segment to see who is in it, how it compares with the campus and what to do."
      >
        <SegmentExplorer report={report} initialFocus={initialFocus} />
      </Panel>
      <DemoFootnote endpoint="GET /api/segments" />
    </div>
  );
}
