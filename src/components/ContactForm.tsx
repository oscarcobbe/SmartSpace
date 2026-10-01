"use client";

import { useState, FormEvent } from "react";
import { Send, Check } from "lucide-react";
import { getAttribution, consentRecord } from "@/lib/attribution";
import { fireLeadConversion } from "@/lib/lead-conversion";
import FoundUsField from "@/components/FoundUsField";

/*
 * The conversion fire that lived here is src/lib/lead-conversion.ts now, the
 * one the callback form already used. It was the same code, and the header of
 * that file says why one copy matters: a label that lives in two places will
 * eventually differ in one of them. Keeping two copies would also have meant
 * adding the phone's E.164 form and the ChatGPT ads lead to both.
 */

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    // `homepage_url` is the honeypot field, hidden from real users via CSS,
    // skipped by screen readers via aria-hidden, ignored by browser autofill
    // via autocomplete=off + non-standard name. Bots that scrape every input
    // and fill it indiscriminately will leave a non-empty value here, which
    // the server uses as a "drop silently" signal.
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      subject: (form.elements.namedItem("subject") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      homepage_url: (form.elements.namedItem("homepage_url") as HTMLInputElement | null)?.value ?? "",
      found_us: (form.elements.namedItem("found_us") as HTMLSelectElement | null)?.value ?? "",
      found_us_detail: (form.elements.namedItem("found_us_detail") as HTMLInputElement | null)?.value ?? "",
      attribution: getAttribution() ?? undefined,
      consent: consentRecord(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; conversionId?: string };

      if (!res.ok) {
        setError(json.error ?? "Failed to send message. Please try again.");
        return;
      }
      setSubmitted(true);
      fireLeadConversion(data.email, data.phone, json.conversionId, "contact_form");
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 text-green-500 rounded-full mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
        <p className="text-gray-500">Thanks for getting in touch. We&apos;ll get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {/*
        Honeypot, hidden anti-spam field. Real users never see or interact
        with it (off-screen, tab-skip, screen-reader-skip, no autofill). Bots
        that fill every input on the page will leave a non-empty value here,
        which the /api/contact route treats as a drop signal.
      */}
      <input
        type="text"
        name="homepage_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        defaultValue=""
        style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            autoComplete="name"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
            placeholder="John Murphy"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
          placeholder="01 513 0424"
        />
        <p className="mt-1.5 text-xs text-gray-500">We&apos;ll call you back within one business day.</p>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
          Subject
        </label>
        {/* Reordered to put Installation Enquiry first, that's what
            the majority of paid clicks are. "Support Request" removed:
            paid leads aren't existing customers needing help, and
            existing customers should call directly (the option was
            steering real leads into the wrong bucket). */}
        <select
          id="subject"
          name="subject"
          required
          defaultValue="installation"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
        >
          <option value="installation">Installation Enquiry</option>
          <option value="product">Product Question</option>
          <option value="general">General Enquiry</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50 resize-none"
          placeholder="Tell us about your home security needs..."
        />
      </div>

      <FoundUsField
        id="found_us"
        labelClassName="block text-sm font-semibold text-gray-700 mb-2"
        selectClassName="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-base sm:text-sm bg-gray-50"
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-4 rounded-xl transition-all shadow-lg shadow-brand-500/25 text-base disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
