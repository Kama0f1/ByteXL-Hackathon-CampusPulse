"use client";

import { useFormStatus } from "react-dom";
import { signIn } from "@/app/actions/auth";
import { DEMO_ACCOUNT } from "@/lib/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-inverse px-4 text-[15px] font-semibold text-on-inverse hover:opacity-90 disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? (
        <>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Signing in…
        </>
      ) : (
        <>
          Sign in to the demo
          <span aria-hidden="true">→</span>
        </>
      )}
    </button>
  );
}

const inputClass =
  "mt-1.5 block h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink outline-none transition-colors focus:border-academic";

/** Pre-filled demo form: one click signs in. No credentials are checked. */
export function DemoLoginForm({ next }: { next: string }) {
  return (
    <form action={signIn} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink-2">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="off" defaultValue={DEMO_ACCOUNT.email} className={inputClass} />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="text-sm font-medium text-ink-2">
            Password
          </label>
          <span className="text-xs text-ink-3">Pre-filled for the demo</span>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="off"
          defaultValue={DEMO_ACCOUNT.password}
          className={inputClass}
        />
      </div>
      <SubmitButton />
    </form>
  );
}
