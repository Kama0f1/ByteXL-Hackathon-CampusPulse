"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react/dist/ssr";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Light/dark switch for the app. The choice is remembered on this device. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("cp-theme", next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`pressable grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-3 hover:text-ink ${className}`}
    >
      {theme === "dark" ? <SunIcon aria-hidden="true" className="h-[18px] w-[18px]" /> : <MoonIcon aria-hidden="true" className="h-[18px] w-[18px]" />}
    </button>
  );
}
