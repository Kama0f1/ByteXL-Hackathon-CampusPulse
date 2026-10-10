import { RiskGlyph } from "@/components/ui/RiskBadge";

/** Always-visible reminder of what the colours and shapes mean. */
export function ColourKey() {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/70 p-3 text-xs text-ink-2">
      <p className="mb-2 font-medium text-ink">How to read the colours</p>
      <ul className="space-y-1.5">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-4 rounded-full bg-academic" /> Academic track
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-4 rounded-full bg-placement" /> Placement track
        </li>
        <li className="flex items-center gap-3 pt-1">
          <span className="flex items-center gap-1">
            <RiskGlyph level="high" /> High
          </span>
          <span className="flex items-center gap-1">
            <RiskGlyph level="medium" /> Medium
          </span>
          <span className="flex items-center gap-1">
            <RiskGlyph level="low" /> Low
          </span>
        </li>
      </ul>
      <p className="mt-2.5 border-t border-line pt-2 text-[11px] text-ink-3">
        Press <kbd className="rounded border border-line bg-surface px-1 font-mono">Ctrl K</kbd> to find any student.
      </p>
    </div>
  );
}
