import { withFallback } from "@/lib/api";
import { getDemoAlerts } from "@/lib/demo/campus";
import type { AlertReport, DataResult } from "@/lib/types";

/** Early-warning alerts: `GET /api/alerts`, or the demo campus if the backend is down. */
export async function getAlerts(): Promise<DataResult<AlertReport>> {
  return withFallback("/api/alerts", getDemoAlerts);
}
