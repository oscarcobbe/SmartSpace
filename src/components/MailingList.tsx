"use client";

import { useState, FormEvent } from "react";

export default function MailingList() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
      // GA4 recommended signup event
      const w = window as unknown as { gtag?: (...args: unknown[]) => void };
      if (typeof w.gtag === "function") {
        w.gtag("event", "sign_up", { method: "newsletter" });
      }
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 lg:py-28 bg-cream">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-premium p-8 sm:p-10 text-center border border-gray-100">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-5">
            Newsletter
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3 tracking-[-0.03em]">
            Stay in the loop
          </h2>
          <p className="text-ink-soft text-sm sm:text-base mb-7">
            Get the latest Ring deals and smart home tips — no spam, promise.
          </p>

          {submitted ? (
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 font-semibold text-sm px-5 py-3 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Thanks for subscribing!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 px-5 py-3.5 rounded-full border border-gray-200 bg-cream text-sm focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 transition-all"
              />
              <button
                type="submit"
                className="btn-sheen bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-semibold text-sm px-7 py-3.5 rounded-full transition-all shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 whitespace-nowrap"
              >
                {loading ? "..." : "Subscribe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
