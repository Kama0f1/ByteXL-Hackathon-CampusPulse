import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { DemoLoginForm } from "@/components/landing/DemoLoginForm";
import { Logo } from "@/components/ui/Logo";
import { DEMO_ACCOUNT, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

const HIGHLIGHTS = [
  "Who needs help this week, most urgent first",
  "Academic and placement risk, kept separate",
  "The reasons behind every flag",
  "A suggested follow-up for each student",
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(Array.isArray(next) ? next[0] : next);

  return (
    <main id="main-content" className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <section data-theme="dark" className="relative m-2 hidden overflow-hidden rounded-[28px] bg-canvas p-10 text-ink lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="dot-field absolute inset-0" />
        <div aria-hidden="true" className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-academic/25 blur-[110px]" />
        <div aria-hidden="true" className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[#c8f13c]/10 blur-[110px]" />

        <div className="relative">
          <Logo tone="light" />
        </div>

        <div className="relative max-w-md">
          <h1 className="text-[44px] font-semibold leading-[1.04] tracking-[-0.04em] text-white">
            Every student signal, <span className="text-white/45">one calm view.</span>
          </h1>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-white/75">
                <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#c8f13c] text-[#0d1117]">
                  <CheckIcon weight="bold" className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">Demo environment with simulated students. No real records.</p>
      </section>

      <section className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
            <ArrowLeftIcon aria-hidden="true" className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-ink">Sign in</h2>
            <p className="mt-2 text-[15px] text-ink-2">Faculty access to CampusPulse. The demo details are filled in, so just press the button.</p>

            <div className="mt-8">
              <DemoLoginForm next={nextPath} />
            </div>

            <p className="mt-8 flex items-center gap-2 border-t border-line pt-5 text-xs text-ink-3">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-risk-low" />
              Signing in as {DEMO_ACCOUNT.name}, {DEMO_ACCOUNT.role.toLowerCase()}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
