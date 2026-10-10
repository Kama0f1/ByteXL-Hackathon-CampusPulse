"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/components/ui/Logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#explain", label: "Explainable scores" },
  { href: "#features", label: "Features" },
  { href: "#story", label: "Example" },
];

/** Floating pill navigation that tightens once the page scrolls. */
export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <motion.nav
        aria-label="Landing page"
        animate={{ paddingTop: scrolled ? 6 : 8, paddingBottom: scrolled ? 6 : 8 }}
        className={`flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border px-2 pl-3 transition-colors duration-300 ${scrolled ? "border-white/10 bg-[#0d1117]/80 shadow-pop backdrop-blur-xl" : "border-white/5 bg-white/[0.03] backdrop-blur-md"}`}
      >
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-white">
          <LogoMark className="h-7 w-7" />
          CampusPulse
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-3 py-1.5 text-[13px] text-white/65 transition-colors hover:bg-white/5 hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className="pressable group inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-[13px] font-semibold text-[#0d1117] hover:bg-[#c8f13c]"
        >
          Open the demo
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0d1117] text-white transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-0.5">
            <ArrowUpRightIcon aria-hidden="true" weight="bold" className="h-3 w-3" />
          </span>
        </Link>
      </motion.nav>
    </div>
  );
}
