import { getDemoRiskReport } from "@/lib/demo/campus";
import type { DataResult, RiskReport } from "@/lib/types";

/** Campus risk report. Proposed endpoint: `GET /api/risks`. Currently demo data. */
export async function getRiskReport(): Promise<DataResult<RiskReport>> {
  return { origin: "demo", data: getDemoRiskReport() };
}
