import { BellRingingIcon, ChartLineDownIcon, ClockCountdownIcon, MonitorIcon, TargetIcon } from "@phosphor-icons/react/dist/ssr";
import type { AlertKind } from "@/lib/types";

export const ALERT_KIND: Record<AlertKind, { label: string; icon: typeof BellRingingIcon }> = {
  "attendance-threshold": { label: "Attendance below 75%", icon: ClockCountdownIcon },
  "new-high-risk": { label: "Newly high risk", icon: BellRingingIcon },
  "score-drop": { label: "Score dropping", icon: ChartLineDownIcon },
  "lms-drop": { label: "LMS activity drop", icon: MonitorIcon },
  "placement-prediction": { label: "Predicted to miss placement", icon: TargetIcon },
};

export function AlertIcon({ kind, severity }: { kind: AlertKind; severity: "high" | "medium" }) {
  const Icon = ALERT_KIND[kind].icon;
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${severity === "high" ? "bg-risk-high-soft text-risk-high-ink" : "bg-risk-medium-soft text-risk-medium-ink"}`}
    >
      <Icon aria-hidden="true" weight="duotone" className="h-[18px] w-[18px]" />
    </span>
  );
}
