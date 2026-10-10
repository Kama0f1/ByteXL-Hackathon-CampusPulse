import { QuestionIcon } from "@phosphor-icons/react/dist/ssr";
import { useId } from "react";

type InfoTipProps = {
  /** Plain-language explanation of a term. */
  children: React.ReactNode;
  label?: string;
  align?: "left" | "center" | "right";
};

/** Small "?" that explains a term on hover or keyboard focus. */
export function InfoTip({ children, label = "What does this mean?", align = "center" }: InfoTipProps) {
  const id = useId();
  const position = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span className="group/tip relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="grid h-4 w-4 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink focus-visible:text-ink"
      >
        <QuestionIcon aria-hidden="true" weight="bold" className="h-3.5 w-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute top-full z-40 mt-2 hidden w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-ink-2 shadow-pop group-hover/tip:block group-focus-within/tip:block ${position}`}
      >
        {children}
      </span>
    </span>
  );
}
