import { getDemoAlerts } from "@/lib/demo/campus";
import type { AlertReport, DataResult } from "@/lib/types";

/** Early-warning alerts. Proposed endpoint: `GET /api/alerts`. Currently demo data. */
export async function getAlerts(): Promise<DataResult<AlertReport>> {
  return { origin: "demo", data: getDemoAlerts() };
}
