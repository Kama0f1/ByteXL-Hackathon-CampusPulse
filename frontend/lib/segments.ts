import { getDemoSegmentReport } from "@/lib/demo/campus";
import type { DataResult, SegmentReport } from "@/lib/types";

/** Student segments. Proposed endpoint: `GET /api/segments`. Currently demo data. */
export async function getSegmentReport(): Promise<DataResult<SegmentReport>> {
  return { origin: "demo", data: getDemoSegmentReport() };
}
