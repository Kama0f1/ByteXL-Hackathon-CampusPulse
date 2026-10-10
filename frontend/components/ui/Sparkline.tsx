type SparklineProps = {
  values: number[];
  /** Tailwind stroke class, e.g. "stroke-academic". */
  strokeClassName?: string;
  className?: string;
  /** Fill a soft area under the line. */
  area?: boolean;
};

/** Tiny trend line for stat tiles. Decorative: the tile states the value in text. */
export function Sparkline({ values, strokeClassName = "stroke-ink", className = "h-9 w-24", area = true }: SparklineProps) {
  if (values.length < 2) return null;
  const w = 100;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`overflow-visible ${className}`}>
      {area ? <path d={`${line} L${w},${h} L0,${h} Z`} className={`${strokeClassName} opacity-[0.08]`} style={{ fill: "currentColor", stroke: "none" }} /> : null}
      <path d={line} fill="none" className={strokeClassName} strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.6} className={`${strokeClassName} fill-surface`} strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
