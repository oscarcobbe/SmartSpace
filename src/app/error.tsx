"use client";

/**
 * Root error boundary. Renders for any uncaught error in any route
 * (server OR client) below the root layout. Without this file, an
 * unhandled throw shows Next.js's default unbranded error page — paid
 * traffic that hits an error sees no recovery path, no contact info,
 * and bounces. With this file they get a branded fallback with a phone
 * tap-to-call (which still fires phone-conversion via PhoneClickTracker)
 * and a "back to home" button.
 *
 * Next.js triggers Error Boundary props: `error` (the thrown Error) and
 * `reset` (re-renders the failing route). We log the error to the
 * console + window.gtag (if loaded) so we can see the failure rate in
 * GA4 over time.
 */

import { useEffect } from "react";
import Link from "next/link";

const PHONE_DISPLAY = "01 513 0424";
const PHONE_TEL = "+35315130424";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx] Uncaught error caught by root boundary:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.gtag === "function") {
      w.gtag("event", "exception", {
        description: error.message?.slice(0, 200) || "unknown",
        fatal: false,
        digest: error.digest,
      });
    }
    // Forward to server-side alert sink. The sink filters known-noisy
    // patterns (chunk-load races, extension noise, gtag-blocked) and
    // rate-limits, so this isn't a spam vector. keepalive so the POST
    // still completes if the user navigates away mid-fire.
    try {
      const payload = JSON.stringify({
        message: error.message || "Unknown client error",
        stack: error.stack || "",
        url: typeof window !== "undefined" ? window.location.href : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        digest: error.digest,
      });
      fetch("/api/alerts/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch((err) => {
        // Best-effort — the user already sees the fallback UI. Logged so
        // a recurring failure (e.g. server down, CSP blocking) surfaces
        // in browser devtools rather than being completely invisible.
        console.warn("[error.tsx] failed to POST client-error alert:", err);
      });
    } catch {
      // JSON.stringify can throw on circular refs in obscure cases.
      // Ignore — the GA4 'exception' event above is the backup signal.
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-3">
          Something went wrong
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
          We hit a snag loading this page
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Try again in a second. If it keeps happening, give us a call &mdash;
          we&apos;ll book your install over the phone in two minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
          >
            Try again
          </button>
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex items-center justify-center bg-white border-2 border-gray-200 hover:border-brand-500 text-gray-900 hover:text-brand-700 font-semibold text-sm px-6 py-3 rounded-full transition-colors"
          >
            Call {PHONE_DISPLAY}
          </a>
        </div>
        <div className="mt-6 text-sm">
          <Link href="/" className="text-gray-500 hover:text-gray-900 underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
