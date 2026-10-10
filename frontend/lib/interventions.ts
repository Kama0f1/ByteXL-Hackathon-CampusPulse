import { withFallback } from "@/lib/api";
import { getDemoInterventionReport } from "@/lib/demo/campus";
import type { InterventionReport, DataResult } from "@/lib/types";

/** Interventions and outcomes: `GET /api/interventions`, or the demo campus if the backend is down. */
export async function getInterventionReport(): Promise<DataResult<InterventionReport>> {
  return withFallback("/api/interventions", getDemoInterventionReport);
}
