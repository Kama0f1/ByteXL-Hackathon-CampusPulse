import { getDemoPipeline } from "@/lib/demo/campus";
import type { DataResult, PipelineReport } from "@/lib/types";

/** Data integration status. Proposed endpoint: `GET /api/pipeline`. Currently demo data. */
export async function getPipelineReport(): Promise<DataResult<PipelineReport>> {
  return { origin: "demo", data: getDemoPipeline() };
}
