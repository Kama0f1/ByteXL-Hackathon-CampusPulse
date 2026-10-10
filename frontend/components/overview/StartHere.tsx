import { ArrowRightIcon, HandshakeIcon, UsersThreeIcon, WarningDiamondIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

type StartHereProps = {
  flagged: number;
  newlyFlagged: number;
  unassigned: number;
  segments: number;
};

/** The three things a faculty member should do this week, in order. */
export function StartHere({ flagged, newlyFlagged, unassigned, segments }: StartHereProps) {
  const steps = [
    {
      href: "/risks",
      icon: WarningDiamondIcon,
      tone: "bg-risk-high-soft text-risk-high-ink",
      title: `Review ${flagged} flagged students`,
      body: `${newlyFlagged} were flagged for the first time this month.`,
    },
    {
      href: "/interventions",
      icon: HandshakeIcon,
      tone: "bg-academic-soft text-academic",
      title: `Assign ${unassigned} suggested follow-ups`,
      body: "Each one is matched to the reason the student was flagged.",
    },
    {
      href: "/segments",
      icon: UsersThreeIcon,
      tone: "bg-placement-soft text-placement",
      title: `Plan support for ${segments} groups`,
      body: "One session can help a whole segment at once.",
    },
  ];

  return (
    <section aria-label="Start here" className="rise grid gap-3 md:grid-cols-3" style={{ "--i": 1 } as React.CSSProperties}>
      {steps.map((step, i) => (
        <Link
          key={step.href}
          href={step.href}
          className="pressable group flex items-start gap-4 rounded-[20px] border border-line bg-surface p-4 shadow-card hover:border-line-strong"
        >
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${step.tone}`}>
            <step.icon aria-hidden="true" weight="duotone" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[11px] font-medium text-ink-3">Step {i + 1}</span>
            <span className="mt-0.5 block text-[15px] font-semibold leading-snug text-ink">{step.title}</span>
            <span className="mt-1 block text-[13px] leading-snug text-ink-3">{step.body}</span>
          </span>
          <ArrowRightIcon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      ))}
    </section>
  );
}
