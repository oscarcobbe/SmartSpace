"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import type { Site } from "@/lib/crm/db";

const LABEL: Record<Site, string> = {
  "smart-space": "Smart Space",
  smartcareliving: "SmartCare Living",
};

/**
 * Which business the CRM is showing, and how to change it.
 *
 * Nigel runs both. Before this there was one deployment hard-wired to Smart
 * Space and SmartCare Living's half of the CRM could not be reached at all.
 *
 * ── WHY THERE ARE TWO OF THESE ON A PAGE ─────────────────────────
 *
 * It lived only in the desktop sidebar, which is hidden below 1024 pixels. On
 * his phone, where Nigel actually reads the CRM, there was no way to reach
 * SmartCare Living at all, and the mobile check still passed because it
 * clicked the hidden desktop button through script. The compact variant sits
 * in the phone header.
 */
export default function SiteSwitch({ site, compact = false }: { site: Site; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  /* Closes on a tap anywhere else and on Escape, which is what a menu does
     everywhere else on the phone. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const choose = async (next: Site) => {
    setOpen(false);
    setError(null);
    if (next === site) return;
    setSending(true);
    try {
      const res = await fetch("/api/crm/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: next }),
      });
      /* It used to ignore the answer and refresh anyway, so a refused switch
         redrew the same business and looked like the button did nothing. */
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `The switch did not go through (${res.status}).`);
        return;
      }
    } catch {
      setError("The switch did not go through: the server could not be reached.");
      return;
    } finally {
      setSending(false);
    }
    /* refresh, not reload: every CRM page is server rendered from the session,
       so re-fetching the tree is enough and keeps the scroll position. */
    startTransition(() => router.refresh());
  };

  const working = busy || sending;

  return (
    <div ref={box} className={compact ? "relative min-w-0" : "relative px-3 pt-3"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Showing ${LABEL[site]}. Switch business`}
        disabled={working}
        className={compact
          ? "flex min-h-[44px] min-w-0 max-w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold tracking-tight text-slate-900 hover:bg-slate-100 disabled:opacity-60"
          : "flex min-h-[40px] w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-60"}
      >
        {compact
          ? <span className="h-2.5 w-2.5 flex-none rounded-full bg-brand-500" aria-hidden="true" />
          : <Building2 className="h-4 w-4 flex-none text-slate-500" aria-hidden="true" />}
        <span className="truncate">{working ? "Switching" : LABEL[site]}</span>
        <ChevronsUpDown className={`h-4 w-4 flex-none text-slate-400 ${compact ? "" : "ml-auto"}`} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Business"
          className={`crm-pop absolute z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ${
            compact ? "left-0 w-60" : "left-3 right-3"
          }`}
        >
          {(Object.keys(LABEL) as Site[]).map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={s === site}
                onClick={() => choose(s)}
                className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm text-slate-800 hover:bg-slate-50"
              >
                {s === site
                  ? <Check className="h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
                  : <span className="h-4 w-4 flex-none" />}
                {LABEL[s]}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className={`mt-1.5 text-xs font-medium text-rose-700 ${compact ? "absolute left-0 top-full w-64 rounded-lg border border-rose-200 bg-white p-2 shadow" : "px-1"}`}>
          {error}
        </p>
      )}
    </div>
  );
}
