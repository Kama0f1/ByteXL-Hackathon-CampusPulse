type ScoreRingProps = {
  /** Student Success Score from the backend, 0–100. */
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
};

function tone(score: number) {
  if (score < 45) return "stroke-risk-high";
  if (score < 60) return "stroke-risk-medium";
  return "stroke-risk-low";
}

/** Circular 0–100 meter. The number in the middle is the accessible value. */
export function ScoreRing({ score, size = 132, stroke = 10, label = "Success score", className = "" }: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className={`relative grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-surface-3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={`${tone(score)} [transition:stroke-dashoffset_900ms_var(--ease-out-strong)]`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
        />
      </svg>
      <div className="text-center">
        <p className="tabular font-semibold leading-none tracking-[-0.04em] text-ink" style={{ fontSize: size * 0.3 }}>
          {score}
        </p>
        <p className="mt-1 text-[11px] text-ink-3">of 100</p>
      </div>
    </div>
  );
}
