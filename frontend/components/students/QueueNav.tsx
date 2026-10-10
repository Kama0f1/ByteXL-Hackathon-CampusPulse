"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/Button";

/** Previous / next flagged student, also on the J and K keys. */
export function QueueNav({ previousId, nextId }: { previousId: string | null; nextId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "j" && nextId) router.push(`/students/${nextId}`);
      if (event.key === "k" && previousId) router.push(`/students/${previousId}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, nextId, previousId]);

  return (
    <div className="flex items-center gap-1.5">
      {previousId ? (
        <Link href={`/students/${previousId}`} className={buttonClass("secondary", "sm")} title="Previous flagged student (K)">
          <CaretLeftIcon aria-hidden="true" className="h-3.5 w-3.5" /> Previous
        </Link>
      ) : null}
      {nextId ? (
        <Link href={`/students/${nextId}`} className={buttonClass("secondary", "sm")} title="Next flagged student (J)">
          Next flagged <CaretRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
