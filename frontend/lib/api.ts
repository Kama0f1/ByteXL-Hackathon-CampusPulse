import type { CampusOverview } from "@/lib/types";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export type HealthResponse = { status: string };

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed (${response.status})`);
  }
  return response.json();
}

/**
 * PROPOSED endpoint — `GET /api/overview` does not exist in the backend yet.
 * Not called anywhere until the backend implements it; see `lib/overview.ts`.
 */
export async function fetchCampusOverview(): Promise<CampusOverview> {
  const response = await fetch(`${API_BASE_URL}/api/overview`);
  if (!response.ok) {
    throw new Error(`Overview request failed (${response.status})`);
  }
  return response.json();
}
