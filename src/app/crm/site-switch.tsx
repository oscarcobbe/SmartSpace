"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
 */
export default function SiteSwitch({ site }: { site: Site }) {
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const choose = async (next: Site) => {
    setOpen(false);
    if (next === site) return;
    await fetch("/api/crm/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: next }),
    });
    /* refresh, not reload: every CRM page is server rendered from the session,
       so re-fetching the tree is enough and keeps the scroll position. */
    startTransition(() => router.refresh());
  };

  return (
    <div className="relative px-3 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={busy}
        className="flex min-h-[40px] w-full items-center gap-2 rounded-lg border border-slate-300 px-3 text-left text-sm font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-60"
      >
        <Building2 className="h-4 w-4 flex-none text-slate-500" aria-hidden="true" />
        <span className="truncate">{busy ? "Switching…" : LABEL[site]}</span>
        <ChevronsUpDown className="ml-auto h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-3 right-3 z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {(Object.keys(LABEL) as Site[]).map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={s === site}
                onClick={() => choose(s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
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
    </div>
  );
}
