"use client";

/**
 * The one form on the Wi-Fi pages. On a report it asks for the report by email
 * and carries the report with it; on a package page it is a plain enquiry about
 * that package. Either way it posts to /api/wifi-check, which regrades the
 * report from its readings rather than trusting anything the page says about it.
 *
 * Same honeypot field name and the same consent and attribution capture as the
 * site's other forms, so a Wi-Fi enquiry is recorded the way every other
 * enquiry is.
 */

import { useState, type FormEvent } from "react";
import { Check, Send } from "lucide-react";
import { getAttribution, consentRecord } from "@/lib/attribution";
import { fireLeadConversion, WIFI_LEAD_VALUE } from "@/lib/lead-conversion";
import type { PackageSlug } from "@/lib/wifi-check/grade";

const field =
  "w-full min-h-11 rounded-xl border border-gray-300 px-3.5 text-base sm:text-sm text-gray-900 bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export default function WifiEnquiryForm({
  report,
  pkg,
  title,
  blurb,
  button,
  emailsReport = false,
}: {
  /** The report's r parameter, when the form sits on a report. */
  report?: string;
  pkg?: PackageSlug | null;
  title: string;
  blurb: string;
  button: string;
  /** Whether the customer's copy of the report is emailed, which waits on
      Nigel's sign-off; the thank-you must not promise an email that is not
      sent. */
  emailsReport?: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | { email: string; dryRun: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = e.target as HTMLFormElement;
    const value = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "").trim();
    const payload = {
      name: value("name"),
      email: value("email"),
      phone: value("phone"),
      eircode: value("eircode"),
      report: report ?? null,
      package: pkg ?? null,
      page: typeof window !== "undefined" ? window.location.pathname : null,
      homepage_url: value("homepage_url"),
      attribution: getAttribution() ?? undefined,
      consent: consentRecord(),
    };
    try {
      const res = await fetch("/api/wifi-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; dryRun?: boolean; conversionId?: string };
      if (!res.ok) {
        setError(json.error ?? "That did not send. Please try again, or ring us on 01 513 0424.");
        return;
      }
      /* Only a lead the server recorded carries an id, so a dry run or a
         honeypot hit fires nothing (src/lib/lead-conversion.ts). GA4's
         lead_source says which form it was, as the server's copy does. */
      fireLeadConversion(payload.email, payload.phone, json.conversionId, report ? "wifi_check" : "wifi_enquiry", WIFI_LEAD_VALUE);
      setDone({ email: payload.email, dryRun: Boolean(json.dryRun) });
    } catch {
      setError("That did not send. Please try again, or ring us on 01 513 0424.");
    } finally {
      setSending(false);
    }
  }

  /* Test mode (the pages are an unlisted draft and the route sends nothing):
     anyone who finds the page by its link is told so, and given the number. */
  if (done?.dryRun) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <p className="font-bold text-gray-900">This form is not switched on yet, so nothing was sent.</p>
        <p className="mt-1 text-sm text-gray-700">To reach us now, ring 01 513 0424.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3">
          <Check className="w-6 h-6" />
        </div>
        <p className="font-bold text-gray-900">{report && emailsReport
            ? `Your report is on its way to ${done.email}.`
            : report
              ? "Thanks, we have your report and your details."
              : "Thanks, we have your details."}</p>
        <p className="mt-1 text-sm text-gray-600">We will ring you to talk it through.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-8 shadow-premium text-left">
      <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-[-0.02em]">{title}</h2>
      <p className="mt-2 text-sm text-ink-soft">{blurb}</p>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <input
        type="text"
        name="homepage_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        defaultValue=""
        style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="wf-name" className="block text-xs font-medium text-gray-700 mb-1">Your name</label>
          <input id="wf-name" name="name" required autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="wf-phone" className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input id="wf-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" className={field} />
        </div>
        <div>
          <label htmlFor="wf-email" className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input id="wf-email" name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
        </div>
        <div>
          <label htmlFor="wf-eircode" className="block text-xs font-medium text-gray-700 mb-1">
            Eircode <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input id="wf-eircode" name="eircode" autoComplete="postal-code" className={`${field} uppercase`} maxLength={8} />
        </div>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="btn-sheen mt-5 w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-6 shadow-[0_10px_30px_-8px_rgba(242,130,34,0.55)] transition-all"
      >
        <Send className="relative z-10 w-4 h-4" />
        <span className="relative z-10">{sending ? "Sending" : button}</span>
      </button>
      <p className="mt-2 text-[0.7rem] leading-snug text-gray-400 text-center">
        {report ? "Used to send your report and ring you about it. Nothing else." : "Used to ring you about this enquiry. Nothing else."}
      </p>
    </form>
  );
}
