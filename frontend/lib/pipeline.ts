import { withFallback } from "@/lib/api";
import { getDemoPipeline } from "@/lib/demo/campus";
import type { PipelineReport, DataResult } from "@/lib/types";

/** Data integration status: `GET /api/pipeline`, or the demo campus if the backend is down. */
export async function getPipelineReport(): Promise<DataResult<PipelineReport>> {
  return withFallback("/api/pipeline", getDemoPipeline);
}
