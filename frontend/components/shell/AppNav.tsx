"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/shell/NavIcon";
import { NAV_GROUPS, type NavCounts } from "@/components/shell/nav";

type AppNavProps = {
  counts: NavCounts;
  /** Distinguishes the sidebar and drawer instances so their indicators animate separately. */
  instance: string;
  onNavigate?: () => void;
};

/** Grouped app navigation with a sliding active indicator and live counts. */
export function AppNav({ counts, instance, onNavigate }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[11px] font-medium text-ink-3">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`pressable group relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-sm ${active ? "font-medium text-ink" : "text-ink-2 hover:bg-surface-3/60 hover:text-ink"}`}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`nav-active-${instance}`}
                        className="absolute inset-0 rounded-xl bg-surface shadow-card ring-1 ring-line"
                        transition={{ type: "spring", duration: 0.4, bounce: 0.12 }}
                      />
                    ) : null}
                    <span className="relative flex flex-1 items-center gap-2.5">
                      <NavIcon name={item.key} active={active} />
                      {item.label}
                    </span>
                    {item.count ? (
                      <span
                        className={`tabular relative rounded-full px-1.5 py-px font-mono text-[11px] ${item.count === "flagged" ? "bg-risk-high-soft text-risk-high-ink" : "text-ink-3"}`}
                      >
                        {counts[item.count]}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
