import type { InterventionStatus, RiskDomain, RiskLevel } from "@/lib/types";

export const DOMAIN_LABEL: Record<RiskDomain, string> = {
  academic: "Academic",
  placement: "Placement",
};

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const STATUS_LABEL: Record<InterventionStatus, string> = {
  suggested: "Suggested",
  assigned: "Assigned",
  "in-progress": "In progress",
  completed: "Completed",
};

export const LEVEL_ORDER: Record<RiskLevel, number> = { high: 2, medium: 1, low: 0 };
