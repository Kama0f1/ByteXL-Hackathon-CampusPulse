type ChartTooltipProps = {
  /** Left position in px within the chart container (clamped by the caller). */
  left: number;
  top?: number;
  title: React.ReactNode;
  rows: { label: React.ReactNode; value: React.ReactNode; swatch?: string }[];
};

/** Floating value card used by every chart's hover layer. Text stays in ink colours. */
export function ChartTooltip({ left, top = 0, title, rows }: ChartTooltipProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop"
      style={{ left, top }}
    >
      <p className="font-semibold text-ink">{title}</p>
      {rows.map((row, i) => (
        <p key={i} className="mt-1 flex items-center gap-2 text-ink-2">
          {row.swatch ? <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${row.swatch}`} /> : null}
          <span className="flex-1">{row.label}</span>
          <span className="tabular font-semibold text-ink">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Legend row shown above multi-series charts. */
export function ChartLegend({ items }: { items: { label: string; swatch: string; shape?: "line" | "dot" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className={`${item.shape === "dot" ? "h-2 w-2 rounded-full" : "h-[3px] w-4 rounded-full"} ${item.swatch}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
