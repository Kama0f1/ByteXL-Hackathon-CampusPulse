import { InfoIcon } from "@phosphor-icons/react/dist/ssr";

/** A quiet one-line note about where a page's numbers come from. */
export function DataNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rise flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-ink-3 shadow-card sm:w-fit">
      <InfoIcon aria-hidden="true" weight="bold" className="mt-px h-3.5 w-3.5 shrink-0 text-ink-3" />
      <span>{children}</span>
    </p>
  );
}
