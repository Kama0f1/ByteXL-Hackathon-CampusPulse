import { withFallback } from "@/lib/api";
import { getDemoSegmentReport } from "@/lib/demo/campus";
import type { SegmentReport, DataResult } from "@/lib/types";

/** Student segments: `GET /api/segments`, or the demo campus if the backend is down. */
export async function getSegmentReport(): Promise<DataResult<SegmentReport>> {
  return withFallback("/api/segments", getDemoSegmentReport);
}
