"use client";

/**
 * How fresh the page is, and a way to make it fresher.
 *
 * Every CRM page is force-dynamic, so what is on screen was true when it
 * rendered and is never updated again. A tab left open on Monday still shows
 * Monday on Thursday, looking exactly like a tab showing Thursday. The dot and
 * the clock say when the figures were read, and the button reads them again.
 *
 * The clock is set on mount rather than on the server. A server timestamp
 * rendered into HTML is the moment the response was built, which differs from
 * the client's clock by however long the request took, and React fails
 * hydration on the mismatch.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshCrmData } from "./refresh-action";

const STALE_AFTER_MS = 10 * 60 * 1000;

function since(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
}

export default function Refresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [readAt, setReadAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const t = Date.now();
    setReadAt(t);
    setNow(t);
    const tick = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(tick);
  }, []);

  const refresh = useCallback(() => {
    start(async () => {
      /* Drop the cached feed first, then redraw. The other order redraws from
         the cache and reports it as fresh. */
      try { await refreshCrmData(); } catch { /* still worth redrawing */ }
      router.refresh();
      /* router.refresh resolves when the new tree has been applied, so the
         stamp is set inside the transition rather than optimistically. */
      setReadAt(Date.now());
      setNow(Date.now());
    });
  }, [router]);

  /* "r" anywhere that is not a field. The figure a person wants refreshed is
     usually the one they are already looking at, not one behind a click. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "r" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      refresh();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refresh]);

  const age = readAt !== null && now !== null ? now - readAt : 0;
  const stale = age > STALE_AFTER_MS;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {/* The ring only travels while the figures are worth trusting. A
              dashboard that pulses at the same rate whether it is a minute or
              a day old is decoration pretending to be a status light. */}
          {!stale && !pending && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              pending ? "bg-brand-500" : stale ? "bg-slate-300" : "bg-emerald-500"
            }`}
          />
        </span>
        <span className="tabular-nums" aria-live="polite">
          {pending ? "Reading again" : readAt === null ? "Live" : `Read ${since(age)}`}
        </span>
      </span>

      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        aria-label="Read the figures again"
        title="Read the figures again (r)"
        className="group inline-flex h-11 w-11 items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 sm:h-auto sm:min-h-[36px] sm:w-auto sm:border sm:border-slate-300 sm:bg-white sm:px-3 sm:shadow-sm sm:hover:border-slate-400 sm:hover:bg-white"
      >
        <RefreshCw
          className={`h-[18px] w-[18px] text-slate-500 transition-transform duration-300 motion-reduce:transition-none sm:h-4 sm:w-4 ${
            pending ? "animate-spin" : "group-hover:rotate-180"
          }`}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>
  );
}
