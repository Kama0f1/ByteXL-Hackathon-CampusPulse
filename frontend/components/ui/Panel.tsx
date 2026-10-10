import { useId } from "react";

type PanelProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Optional header content on the right, e.g. a link, legend or control. */
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Stagger index for the entrance animation. */
  index?: number;
  children: React.ReactNode;
};

/** Standard surface for every app section. */
export function Panel({ title, description, action, className = "", bodyClassName = "", index = 0, children }: PanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`rise flex min-w-0 flex-col rounded-[20px] border border-line bg-surface shadow-card ${className}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <h2 id={headingId} className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-ink-3">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={`min-w-0 flex-1 px-5 pb-5 sm:px-6 ${title ? "pt-4" : "pt-5"} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
