import { cache } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { DataResult } from "@/lib/types";

export { API_BASE_URL };

export type HealthResponse = { status: string; students?: number };

export class NotFoundError extends Error {}

/** GET a backend payload. Never cached: scores and interventions can change between requests. */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (response.status === 404) throw new NotFoundError(path);
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status})`);
  return response.json();
}

/** Whether the backend is up, checked once per page render so every payload on a page agrees. */
const backendUp = cache(async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return response.ok;
  } catch {
    return false;
  }
});

/**
 * Live data from the backend, or the simulated demo campus when the backend is down.
 * The choice is made once per render, so a page never mixes live students with demo ones:
 * if the backend is up but one endpoint fails, the error is raised (shown by app/(app)/error.tsx).
 */
export async function withFallback<T>(path: string, demo: () => T): Promise<DataResult<T>> {
  if (!(await backendUp())) {
    console.warn(`[CampusPulse] backend unavailable at ${API_BASE_URL}, showing demo data.`);
    return { origin: "demo", data: demo() };
  }
  return { origin: "api", data: await apiGet<T>(path) };
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/api/health");
}
