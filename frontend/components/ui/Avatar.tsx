import { initials } from "@/lib/format";

/** Initials avatar. Neutral on purpose: colour is reserved for data. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-16 w-16 text-xl" };
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-surface-3 font-semibold tracking-tight text-ink-2 ring-1 ring-line ${sizes[size]}`}
    >
      {initials(name)}
    </span>
  );
}
