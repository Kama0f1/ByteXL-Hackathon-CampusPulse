import { withFallback } from "@/lib/api";
import { getDemoOverview } from "@/lib/demo/campus";
import type { CampusOverview, DataResult } from "@/lib/types";

/** Overview dashboard: `GET /api/overview`, or the demo campus if the backend is down. */
export async function getCampusOverview(): Promise<DataResult<CampusOverview>> {
  return withFallback("/api/overview", getDemoOverview);
}
