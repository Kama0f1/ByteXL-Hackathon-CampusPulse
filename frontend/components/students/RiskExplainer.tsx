"use client";

import { BriefcaseIcon, GraduationCapIcon } from "@phosphor-icons/react/dist/ssr";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { formatPercent, lowerLabel } from "@/lib/format";
import { DOMAIN_LABEL } from "@/lib/labels";
import type { ExplainedRisk, RiskDomain } from "@/lib/types";

/** Opacity steps of the domain colour, strongest factor first. */
const STEPS = ["opacity-100", "opacity-70", "opacity-45", "opacity-25"];

function sentence(risk: ExplainedRisk, domain: RiskDomain) {
  if (risk.factors.length === 0) return `No factor is pulling ${domain} readiness down right now.`;
  const parts = risk.factors.slice(0, 3).map((f) => `${formatPercent(f.share)} from ${lowerLabel(f.factor)}`);
  const list = parts.length === 1 ? `all from ${lowerLabel(risk.factors[0].factor)}` : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return risk.level === "low" ? `Not flagged. The small gaps that remain: ${list}.` : `This risk comes ${list}.`;
}

/** One risk track (academic or placement) with the share each factor contributes. */
export function RiskExplainer({ domain, risk }: { domain: RiskDomain; risk: ExplainedRisk }) {
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const color = domain === "academic" ? "bg-academic" : "bg-placement";
  const Icon = domain === "academic" ? GraduationCapIcon : BriefcaseIcon;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-xl ${domain === "academic" ? "bg-academic-soft text-academic" : "bg-placement-soft text-placement"}`}>
            <Icon aria-hidden="true" weight="duotone" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">{DOMAIN_LABEL[domain]} risk</h3>
            <p className="text-xs text-ink-3">
              Risk index <span className="tabular font-semibold text-ink-2">{risk.index}</span> / 100
            </p>
          </div>
        </div>
        <RiskBadge level={risk.level} size="md" />
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{sentence(risk, domain)}</p>

      {risk.factors.length ? (
        <>
          <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Factor shares: ${risk.factors.map((f) => `${f.factor} ${formatPercent(f.share)}`).join(", ")}`}>
            {risk.factors.map((f, i) => (
              <motion.div
                key={f.factor}
                className={`h-full ${color} ${STEPS[i] ?? "opacity-20"} ${active !== null && active !== i ? "!opacity-15" : ""} transition-opacity`}
                style={{ width: `${f.share * 100}%`, originX: 0 }}
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.23, 1, 0.32, 1] }}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-1">
            {risk.factors.map((f, i) => (
              <li
                key={f.factor}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                className={`flex gap-3 rounded-xl px-2.5 py-2 transition-colors ${active === i ? "bg-surface-2" : ""}`}
              >
                <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm ${color} ${STEPS[i] ?? "opacity-20"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium text-ink">{f.factor}</span>
                    <span className="tabular text-sm font-semibold text-ink">{formatPercent(f.share)}</span>
                  </span>
                  <span className="block text-xs leading-relaxed text-ink-3">{f.evidence}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 rounded-xl bg-risk-low-soft px-3 py-2.5 text-[13px] text-risk-low-ink">On track. Nothing to explain this week.</p>
      )}
    </div>
  );
}
