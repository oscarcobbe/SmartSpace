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
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-3">
          Stay in the loop
        </h2>
        <p className="text-[#666] text-sm mb-6">
          Get the latest Ring deals and smart home tips.
        </p>

        {submitted ? (
          <p className="text-brand-500 font-semibold text-sm">
            Thanks for subscribing!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 px-4 py-3 rounded-full border border-[#ddd] text-sm focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors whitespace-nowrap"
            >
              {loading ? "..." : "Subscribe"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
