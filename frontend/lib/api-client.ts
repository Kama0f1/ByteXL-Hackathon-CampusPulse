import { API_BASE_URL } from "@/lib/config";
import type { InterventionStatus, RiskDomain } from "@/lib/types";

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

export function markAlertHandled(alertId: string, handled: boolean) {
  return send<{ alertId: string; handled: boolean }>("POST", `/api/alerts/${encodeURIComponent(alertId)}/handled`, { handled });
}

export function planGroupSession(segmentId: string, planned: boolean) {
  return send<{ segmentId: string; planned: boolean }>("POST", `/api/segments/${encodeURIComponent(segmentId)}/plan`, { planned });
}

export function createIntervention(body: { studentId: string; label?: string; domain?: RiskDomain; owner?: string; status?: InterventionStatus }) {
  return send<{ interventionId: string; status: InterventionStatus }>("POST", "/api/interventions", body);
}
