"use client";

/**
 * Keeps the page current while a Pi is working.
 *
 * Every CRM page is drawn once on the server. While an instruction is with
 * the Pi, the reading would never appear without a reload, so this redraws
 * the page every few seconds until nothing is outstanding, and every minute
 * during a trial so the last hourly reading stays true. It pauses while the
 * tab is hidden.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Live({ seconds, label }: { seconds: number | null; label?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!seconds) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [seconds, router]);
  if (!seconds || !label) return null;
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-slate-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" aria-hidden="true" />
      {label}
    </p>
  );
}
