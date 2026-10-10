import { withFallback } from "@/lib/api";
import { getDemoRiskReport } from "@/lib/demo/campus";
import type { RiskReport, DataResult } from "@/lib/types";

/** Campus risk report: `GET /api/risks`, or the demo campus if the backend is down. */
export async function getRiskReport(): Promise<DataResult<RiskReport>> {
  return withFallback("/api/risks", getDemoRiskReport);
}
