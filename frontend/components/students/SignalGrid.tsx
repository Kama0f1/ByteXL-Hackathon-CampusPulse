import type { SignalBand, StudentSignal } from "@/lib/types";

const BAND: Record<SignalBand, { cell: string; label: string }> = {
  0: { cell: "bg-surface-3", label: "On track" },
  1: { cell: "bg-risk-medium/45", label: "Watch" },
  2: { cell: "bg-risk-medium hatch", label: "Concern" },
  3: { cell: "bg-risk-high", label: "Urgent" },
};

/** The student's early-warning chart: each data area, week by week, in four bands. */
export function SignalGrid({ signals, weeks }: { signals: StudentSignal[]; weeks: string[] }) {
  return (
    <div>
      <div className="scroll-thin relative overflow-x-auto pb-1">
        <table className="w-full min-w-[640px] border-separate border-spacing-[3px]">
          <caption className="sr-only">Weekly early-warning band for each data area</caption>
          <thead>
            <tr>
              <th scope="col" className="w-32 text-left text-[11px] font-medium text-ink-3">
                Area
              </th>
              {weeks.map((w) => (
                <th key={w} scope="col" className="text-center font-mono text-[10px] font-normal text-ink-3">
                  {w}
                </th>
              ))}
              <th scope="col" className="w-48 pl-3 text-left text-[11px] font-medium text-ink-3">
                Now
              </th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.key}>
                <th scope="row" className="pr-2 text-left text-[13px] font-medium text-ink-2">
                  {s.label}
                </th>
                {s.history.map((b, i) => (
                  <td key={i} title={`${s.label}, ${weeks[i]}: ${BAND[b].label}`} className={`h-7 rounded-[5px] ${BAND[b].cell}`}>
                    <span className="sr-only">{BAND[b].label}</span>
                  </td>
                ))}
                <td className="pl-3 text-xs text-ink-3">
                  <span className="tabular mr-1.5 font-semibold text-ink">{s.value}</span>
                  {s.evidence[0]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3" aria-label="Legend">
        {([0, 1, 2, 3] as SignalBand[]).map((b) => (
          <li key={b} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-3 w-3 rounded-[3px] ${BAND[b].cell}`} />
            {BAND[b].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
