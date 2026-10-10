import { getDemoInterventionReport } from "@/lib/demo/campus";
import type { DataResult, InterventionReport } from "@/lib/types";

/** Interventions and outcomes. Proposed endpoint: `GET /api/interventions`. Currently demo data. */
export async function getInterventionReport(): Promise<DataResult<InterventionReport>> {
  return { origin: "demo", data: getDemoInterventionReport() };
}
