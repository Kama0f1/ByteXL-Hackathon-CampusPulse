import { CountUp } from "@/components/ui/CountUp";
import { Sparkline } from "@/components/ui/Sparkline";

type StatTileProps = {
  label: React.ReactNode;
  value: number;
  decimals?: number;
  suffix?: string;
  /** Short supporting line under the value. */
  detail?: React.ReactNode;
  trend?: number[];
  trendClassName?: string;
  icon?: React.ReactNode;
  index?: number;
};

export function StatTile({ label, value, decimals = 0, suffix, detail, trend, trendClassName, icon, index = 0 }: StatTileProps) {
  return (
    <div
      className="rise group relative flex min-w-0 flex-col justify-between rounded-[20px] border border-line bg-surface p-5 shadow-card"
      style={{ "--i": index } as React.CSSProperties}
    >
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        {icon}
        {label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="tabular text-[34px] font-semibold leading-none tracking-[-0.04em] text-ink">
          <CountUp value={value} decimals={decimals} />
          {suffix ? <span className="ml-0.5 text-lg font-medium text-ink-3">{suffix}</span> : null}
        </p>
        {trend ? <Sparkline values={trend} strokeClassName={trendClassName} /> : null}
      </div>
      {detail ? <div className="mt-2 text-[13px] text-ink-3">{detail}</div> : null}
    </div>
  );
}
