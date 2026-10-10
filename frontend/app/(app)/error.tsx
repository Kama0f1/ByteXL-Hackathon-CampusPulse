"use client";

import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { buttonClass } from "@/components/ui/Button";

/** Shown when the backend is up but a page's data could not be loaded, instead of mixing in demo data. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-[24px] border border-line bg-surface p-8 text-center shadow-card">
      <WarningCircleIcon aria-hidden="true" className="mx-auto h-8 w-8 text-risk-high-ink" />
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">This page could not load its data</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        The analytics backend is running but returned an error for this page. Nothing was mixed in from the demo campus. Check the backend log, then try again.
      </p>
      <button type="button" onClick={reset} className={buttonClass("primary", "md", "mt-6")}>
        Try again
      </button>
    </div>
  );
}
