type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  /** Right-aligned controls or meta, e.g. term, export button. */
  actions?: React.ReactNode;
  /** Small line above the title, e.g. a breadcrumb. */
  kicker?: React.ReactNode;
};

export function PageHeader({ title, description, actions, kicker }: PageHeaderProps) {
  return (
    <header className="rise flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        {kicker ? <div className="mb-3 text-[13px] text-ink-3">{kicker}</div> : null}
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[34px]">{title}</h1>
        {description ? <p className="mt-2.5 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
