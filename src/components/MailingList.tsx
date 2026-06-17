"use client";

import { useState, FormEvent, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function MailingList() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Honeypot, see hidden input below. Bots fill every field; real
  // users can't see this one. /api/subscribe drops any submission where
  // this value is non-empty.
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !consent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass `consent: true` along with the email, required by the
        // /api/subscribe route under GDPR. The button is disabled if
        // the consent box is unchecked, so this should always be true,
        // but we send it explicitly for transparency.
        body: JSON.stringify({
          email: email.trim(),
          consent: true,
          homepage_url: honeypotRef.current?.value ?? "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Previously this `catch` swallowed every error and showed a
        // false "Thanks for subscribing!", users thought they were
        // signed up when the request had actually failed. Now we
        // surface the real reason.
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
      // GA4 recommended signup event
      const w = window as unknown as { gtag?: (...args: unknown[]) => void };
      if (typeof w.gtag === "function") {
        w.gtag("event", "sign_up", { method: "newsletter" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-10 lg:py-28 bg-cream">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-premium p-8 sm:p-10 text-center border border-gray-100">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-5">
            Newsletter
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3 tracking-[-0.03em]">
            Stay in the loop
          </h2>
          <p className="text-ink-soft text-sm sm:text-base mb-7">
            Get the latest Ring deals and smart home tips. No spam.
          </p>

          {submitted ? (
            <div
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 font-semibold text-sm px-5 py-3 rounded-full"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Thanks for subscribing!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Honeypot, hidden anti-spam field. Mirrors the pattern in
                  ContactForm.tsx: off-screen, tab-skip, screen-reader-skip,
                  no autofill. /api/subscribe treats any non-empty value
                  here as a bot submission and drops it. */}
              <input
                ref={honeypotRef}
                type="text"
                name="homepage_url"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                defaultValue=""
                style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, opacity: 0 }}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 px-5 py-3.5 rounded-full border border-gray-200 bg-cream text-sm focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !consent}
                  className="btn-sheen inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-7 py-3.5 rounded-full transition-all shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 whitespace-nowrap"
                  aria-busy={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Subscribing…" : "Subscribe"}
                </button>
              </div>

              {/* GDPR / ePrivacy: explicit consent must be captured for
                  marketing emails to EU residents. Pre-checked boxes
                  and implied consent are non-compliant. */}
              <label className="flex items-start gap-2 text-left text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span>
                  I&apos;d like to receive Ring deals and smart-home tips by email. I can unsubscribe anytime. See our{" "}
                  <a href="/privacy" className="underline text-brand-700 hover:text-brand-800">privacy policy</a>.
                </span>
              </label>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
