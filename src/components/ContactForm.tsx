"use client";

import { useState, FormEvent } from "react";
import { Send, Check } from "lucide-react";
import { getAttribution } from "@/lib/attribution";

// Mirrors the pattern in booking/page.tsx — direct window.gtag fire is
// reliable; the prior <Script> + conditional render approach silently
// dropped the call after page hydration had finished.
//
// `conversionId` comes from the API response (server-generated UUID).
// Sending it as `transaction_id` lets Google Ads dedupe this client-side
// fire against the matching server-side fire — same id → counted once.
function fireContactConversion(email: string, phone: string, conversionId?: string) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;
  // Enhanced Conversions — Google hashes these client-side. Use
  // `email_address` (not bare `email`) per Google's user_data schema.
  gtag("set", "user_data", { email_address: email, phone_number: phone });
  gtag("event", "conversion", {
    send_to: "AW-17978501655/u8cHCNyipZocEJfU6PxC",
    value: 10.0,
    currency: "EUR",
    transaction_id: conversionId,
    user_data: { email_address: email, phone_number: phone },
  });
  gtag("event", "generate_lead", {
    currency: "EUR",
    value: 10,
    lead_source: "contact_form",
    transaction_id: conversionId,
  });
  console.log("[gtag] contact form conversion + lead fired", { conversionId });
}

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      subject: (form.elements.namedItem("subject") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      attribution: getAttribution() ?? undefined,
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
      fireContactConversion(data.email, data.phone, json.conversionId);
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
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
          placeholder="01 5130424"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          required
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
        >
          <option value="">Select a topic...</option>
          <option value="general">General Enquiry</option>
          <option value="installation">Installation Enquiry</option>
          <option value="product">Product Question</option>
          <option value="support">Support Request</option>
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
