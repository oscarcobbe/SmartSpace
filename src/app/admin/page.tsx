"use client";

/**
 * Admin hub — single landing page for every internal Smart Space tool.
 *
 * Lives at /admin and replaces the "remember the URL" friction with a
 * gated menu. The same admin key used by /admin/leads is also used here
 * (sessionStorage["admin_key"]); once entered it carries across to every
 * admin sub-page in the same tab. Every admin sub-page also shows a
 * small "← Admin home" link in its top-left so you can jump back here
 * without retyping the URL.
 *
 * Adding a new admin tool? Drop a card into the TOOLS array below.
 * Anything matching `/admin/*` is already excluded from indexing via
 * robots.ts, and the AdminLayout hides the site chrome.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const TOOLS: { href: string; title: string; blurb: string; tone: "blue" | "amber" | "emerald" | "indigo" }[] = [
  {
    href: "/admin/leads",
    title: "Leads dashboard",
    blurb:
      "Bookings, contact form submissions, and paid orders in one view. Upcoming jobs, route planner, revenue split (in-Stripe vs. paid-out vs. booked work value).",
    tone: "blue",
  },
  {
    href: "/admin/conversion-test",
    title: "Conversion test",
    blurb:
      "Fire test conversions to Google Ads (Lead, Booking, Free Consult, Paid Order) and verify the pipeline ack-by-ack. Live view of consent state, gtag load status, gclid attribution, and every send_to URL.",
    tone: "amber",
  },
];

const TONE_CLASSES: Record<string, { bar: string; iconBg: string; iconText: string }> = {
  blue: { bar: "border-blue-500", iconBg: "bg-blue-50", iconText: "text-blue-600" },
  amber: { bar: "border-amber-500", iconBg: "bg-amber-50", iconText: "text-amber-600" },
  emerald: { bar: "border-emerald-500", iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
  indigo: { bar: "border-indigo-500", iconBg: "bg-indigo-50", iconText: "text-indigo-600" },
};

export default function AdminHubPage() {
  const [authed, setAuthed] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_key");
    if (stored) {
      setAuthed(true);
    }
    setLoading(false);
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      setError("Enter the admin key");
      return;
    }
    sessionStorage.setItem("admin_key", key.trim());
    setAuthed(true);
    setError("");
  }

  function clearKey() {
    sessionStorage.removeItem("admin_key");
    setAuthed(false);
    setKey("");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <form onSubmit={handleAuth} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Smart Space Admin</h1>
          <p className="text-xs text-gray-500 mb-4">Enter the admin key to access internal tools.</p>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin key"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Space Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Internal tools. Bookmark this page; everything else is one click from here.</p>
          </div>
          <button
            onClick={clearKey}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >
            Sign out
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => {
            const t = TONE_CLASSES[tool.tone];
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 border-l-4 ${t.bar} group`}
              >
                <h2 className="text-base font-bold text-gray-900 group-hover:text-gray-700 transition-colors mb-1.5">
                  {tool.title}
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">{tool.blurb}</p>
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-gray-700 group-hover:gap-1.5 transition-all">
                  Open <span aria-hidden>→</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-xs text-gray-400 leading-relaxed">
          <p>
            <strong className="text-gray-500">Adding a tool?</strong> Drop a new entry into the
            {" "}<code>TOOLS</code> array in{" "}
            <code>src/app/admin/page.tsx</code> — anything under <code>/admin/*</code> is already
            blocked from search engines via robots.ts and inherits the gate from this page.
          </p>
        </div>
      </div>
    </div>
  );
}
