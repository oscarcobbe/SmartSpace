"use client";

/**
 * When a CRM page throws, say so in words and offer the way back.
 *
 * Without this a throw anywhere under /crm replaced the whole screen with
 * Next's bare "Application error: a server-side exception has occurred", with
 * the sidebar gone and no way to tell whether the data was lost or only the
 * page. The navigation stays, because this renders inside the layout.
 */
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function CrmError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[crm] page failed:", error);
  }, [error]);

  return (
    <div className="crm-enter mx-auto max-w-xl py-10">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-amber-950">This page could not be shown</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-900">
              Something it reads did not answer as expected. Nothing you saved has been lost. Trying again usually
              works; if it keeps happening, the reference below tells Oscar where to look.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-amber-800 [overflow-wrap:anywhere]">Reference {error.digest}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:min-h-[38px]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/crm"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[38px]"
          >
            Back to the overview
          </Link>
        </div>
      </div>
    </div>
  );
}
