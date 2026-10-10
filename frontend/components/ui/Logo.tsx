import Link from "next/link";

type LogoProps = {
  href?: string;
  /** Hide the wordmark, e.g. in a collapsed rail. */
  compact?: boolean;
  className?: string;
  /** "light" for use on dark backgrounds. */
  tone?: "dark" | "light";
};

/** CampusPulse mark: a pulse line on an ink tile, with a signal-lime beat. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative grid shrink-0 place-items-center rounded-[10px] bg-[#0d1117] ring-1 ring-white/10 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12.5h4l2.2-5.5 3.6 11 2.4-5.5h6.8" stroke="white" strokeWidth={2} />
        <circle cx="19.5" cy="12.5" r="2.1" fill="#c8f13c" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", compact = false, className = "", tone = "dark" }: LogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.02em] ${tone === "light" ? "text-white" : "text-ink"} ${className}`}>
      <LogoMark />
      {compact ? <span className="sr-only">CampusPulse</span> : <span>CampusPulse</span>}
    </Link>
  );
}
