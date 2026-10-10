"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import type { NavCounts } from "@/components/shell/nav";
import { Logo } from "@/components/ui/Logo";

/** Slide-in navigation drawer for small screens. */
export function MobileNav({ counts, footer }: { counts: NavCounts; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="pressable grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-3 lg:hidden"
      >
        <ListIcon aria-hidden="true" className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-[#0d1117]/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-canvas p-4 shadow-pop"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%", transition: { duration: 0.2 } }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="mb-6 flex items-center justify-between">
                <Logo href="/dashboard" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="pressable grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-3"
                >
                  <XIcon aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <AppNav counts={counts} instance="drawer" onNavigate={() => setOpen(false)} />
              </div>
              {footer}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
