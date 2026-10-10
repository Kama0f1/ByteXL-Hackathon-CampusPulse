import type { DataResult, InterventionStatus, RiskDomain } from "@/lib/types";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export type HealthResponse = { status: string; students?: number };

export class NotFoundError extends Error {}

/** GET a backend payload. Never cached: scores and interventions can change between requests. */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (response.status === 404) throw new NotFoundError(path);
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status})`);
  return response.json();
}

/**
 * Live data from the backend, or the simulated demo campus if the backend is unreachable.
 * The `origin` tells the UI which one it is showing.
 */
export async function withFallback<T>(path: string, demo: () => T): Promise<DataResult<T>> {
  try {
    return { origin: "api", data: await apiGet<T>(path) };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.warn(`[CampusPulse] ${path}: backend unavailable, showing demo data.`, error instanceof Error ? error.message : error);
    return { origin: "demo", data: demo() };
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/api/health");
}

/* Browser-side writes. Only called when the page is showing live data. */

async function send<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status})`);
  return response.json();
}

export function moveIntervention(interventionId: string, status: InterventionStatus) {
  return send<{ interventionId: string; status: InterventionStatus }>("PATCH", `/api/interventions/${encodeURIComponent(interventionId)}`, { status });
}

export function createIntervention(body: { studentId: string; label?: string; domain?: RiskDomain; owner?: string; status?: InterventionStatus }) {
  return send<{ interventionId: string; status: InterventionStatus }>("POST", "/api/interventions", body);
}
