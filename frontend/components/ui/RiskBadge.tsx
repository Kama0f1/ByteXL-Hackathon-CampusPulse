import { DOMAIN_LABEL, LEVEL_LABEL } from "@/lib/labels";
import type { RiskDomain, RiskLevel } from "@/lib/types";

const levelStyles: Record<RiskLevel, { className: string; icon: React.ReactNode }> = {
  high: {
    className: "bg-risk-high-soft text-risk-high-ink",
    icon: <path d="M8 2 14.5 13.5h-13L8 2Z" className="fill-risk-high" />,
  },
  medium: {
    className: "bg-risk-medium-soft text-risk-medium-ink",
    icon: <rect x="2.5" y="2.5" width="11" height="11" rx="2" className="fill-risk-medium" />,
  },
  low: {
    className: "bg-risk-low-soft text-risk-low-ink",
    icon: <circle cx="8" cy="8" r="5.5" className="fill-risk-low" />,
  },
};

type RiskBadgeProps = {
  level: RiskLevel;
  /** When set, the badge reads e.g. "Academic · High". */
  domain?: RiskDomain;
  size?: "sm" | "md";
};

/** Risk level shown with a shape and a text label, never colour alone. */
export function RiskBadge({ level, domain, size = "sm" }: RiskBadgeProps) {
  const style = levelStyles[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${style.className} ${size === "md" ? "px-3 py-1 text-[13px]" : "px-2 py-0.5 text-xs"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"}>
        {style.icon}
      </svg>
      {domain ? <span className="opacity-75">{DOMAIN_LABEL[domain]}</span> : null}
      {LEVEL_LABEL[level]}
    </span>
  );
}

/** Just the risk glyph, for dense tables and charts. */
export function RiskGlyph({ level, className = "h-2.5 w-2.5" }: { level: RiskLevel; className?: string }) {
  return (
    <svg role="img" aria-label={`${LEVEL_LABEL[level]} risk`} viewBox="0 0 16 16" className={className}>
      {levelStyles[level].icon}
    </svg>
  );
}
