import { getDemoOverview } from "@/lib/demo/campus";
import type { CampusOverview, DataResult } from "@/lib/types";

/**
 * Data source for the overview dashboard: the single place to switch from demo data
 * to the backend.
 *
 * Proposed backend endpoint (NOT implemented yet): `GET /api/overview`, returning a
 * `CampusOverview` (see `lib/types.ts`). When it exists, fetch it here with
 * `fetchCampusOverview()` from `lib/api.ts` and return `{ origin: "api", data }`.
 */
export async function getCampusOverview(): Promise<DataResult<CampusOverview>> {
  return { origin: "demo", data: getDemoOverview() };
}
