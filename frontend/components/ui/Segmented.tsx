"use client";

import { motion } from "motion/react";
import { useId } from "react";

type Option<T extends string> = { value: T; label: React.ReactNode };

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  label: string;
  size?: "sm" | "md";
};

/** Pill segmented control with a sliding selection. */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md" }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-surface-2 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`pressable relative shrink-0 rounded-full font-medium ${size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3.5 text-[13px]"} ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-surface shadow-card ring-1 ring-line"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
