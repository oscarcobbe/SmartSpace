"use client";

/**
 * Conversion diagnostic page (admin-only).
 *
 * The hard part of paid-ad tracking is invisible failures: the gtag fires,
 * the network ping goes out, Google's endpoint returns 200, but the
 * conversion never appears in Google Ads. This page surfaces the things
 * that are normally invisible:
 *
 *   1. Is window.gtag actually loaded?
 *   2. What is the current Consent Mode state?
 *   3. Which conversion send_to URLs are we configured to use?
 *   4. Do gclid + utm params survive the page navigation?
 *   5. When we manually fire a conversion, does Google's endpoint ack it?
 *
 * Use this page to send a test conversion to each Google Ads action
 * (Lead, Booking, Paid Order, Free Consultation) and then check Google
 * Ads → Tools → Conversions in 6-12 hours. If the test conversion
 * appears, the wiring is correct; the volume issue is upstream
 * (auto-tagging off, GA4 link broken, etc). If the test conversion
 * does NOT appear, the wiring is wrong and the page tells you what to
 * check.
 *
 * URL: /admin/conversion-test  (gated via the /admin hub — same admin
 * key. If no key is in sessionStorage we send the user to /admin to
 * authenticate, then they come back here.)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAttribution } from "@/lib/attribution";

type FireResult = {
  at: string;
  type: string;
  sendTo: string;
  txnId: string;
  acked: boolean;
  error?: string;
};

const GADS_ACCOUNT = "AW-17978501655";
const LEAD_TAG =
  process.env.NEXT_PUBLIC_GADS_LEAD_SEND_TO ||
  `${GADS_ACCOUNT}/u8cHCNyipZocEJfU6PxC`;
const PAYMENT_TAG =
  process.env.NEXT_PUBLIC_GADS_PAYMENT_SEND_TO ||
  `${GADS_ACCOUNT}/IofPCOiZuJkcEJfU6PxC`;
const FREE_CONSULT_TAG =
  process.env.NEXT_PUBLIC_GADS_FREE_CONSULT_SEND_TO ||
  `${GADS_ACCOUNT}/fH4ZCMHv7ZocEJfU6PxC`;

type ConsentSnapshot = {
  ad_storage: string;
  ad_user_data: string;
  ad_personalization: string;
  analytics_storage: string;
};

function readConsent(): ConsentSnapshot | null {
  if (typeof window === "undefined") return null;
  // gtag/Google's tag stores the current consent state on
  // window.google_tag_data.ics — undocumented but stable for years.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gd = (window as any).google_tag_data;
  if (!gd?.ics?.entries) return null;
  const e = gd.ics.entries;
  const get = (k: string) => (e[k]?.default ?? "unknown") as string;
  return {
    ad_storage: get("ad_storage"),
    ad_user_data: get("ad_user_data"),
    ad_personalization: get("ad_personalization"),
    analytics_storage: get("analytics_storage"),
  };
}

export default function ConversionTestPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [gtagLoaded, setGtagLoaded] = useState(false);
  const [consent, setConsent] = useState<ConsentSnapshot | null>(null);
  const [attribution, setAttribution] = useState<ReturnType<typeof getAttribution> | null>(null);
  const [results, setResults] = useState<FireResult[]>([]);
  const [testEmail, setTestEmail] = useState("test+conversion@smart-space.ie");
  const [testPhone, setTestPhone] = useState("+353871234567");

  // Gate the page behind the admin hub's key. If missing, bounce to
  // /admin which will prompt for the key and let the user navigate back.
  useEffect(() => {
    const stored = sessionStorage.getItem("admin_key");
    if (!stored) {
      setAuthed(false);
      router.replace("/admin");
      return;
    }
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    if (!authed) return;
    const tick = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      setGtagLoaded(typeof w.gtag === "function");
      setConsent(readConsent());
      setAttribution(getAttribution());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [authed]);

  if (authed === null || authed === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  function fire(type: "lead" | "booking" | "purchase" | "free_consult") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.gtag !== "function") {
      setResults((r) => [
        { at: new Date().toLocaleTimeString(), type, sendTo: "—", txnId: "—", acked: false, error: "window.gtag not loaded" },
        ...r,
      ]);
      return;
    }

    const txnId = `test-${type}-${Date.now()}`;
    const sendTo =
      type === "purchase" ? PAYMENT_TAG :
      type === "free_consult" ? FREE_CONSULT_TAG :
      LEAD_TAG;
    const value = type === "purchase" ? 299 : type === "free_consult" ? 50 : 10;

    // Set user_data for Enhanced Conversions matching
    w.gtag("set", "user_data", {
      email_address: testEmail,
      phone_number: testPhone,
    });

    let acked = false;
    w.gtag("event", "conversion", {
      send_to: sendTo,
      value,
      currency: "EUR",
      transaction_id: txnId,
      transport_type: "beacon",
      event_callback: () => {
        acked = true;
        setResults((r) => r.map((row) => row.txnId === txnId ? { ...row, acked: true } : row));
      },
    });

    // Also fire the matching GA4 event so we can see it in GA4 DebugView
    const ga4Event =
      type === "purchase" ? "purchase" :
      type === "booking" ? "book_appointment" :
      "generate_lead";
    w.gtag("event", ga4Event, {
      currency: "EUR",
      value,
      transaction_id: txnId,
      lead_source: `conversion_test_${type}`,
      transport_type: "beacon",
    });

    setResults((r) => [
      { at: new Date().toLocaleTimeString(), type, sendTo, txnId, acked },
      ...r,
    ]);
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Conversion test</h1>
        <p className="text-sm text-gray-500 mb-6">
          Fire a test conversion to each Google Ads action, then check Google Ads → Tools → Conversions in
          6-12 hours. If the test conversion appears under the matching action, your wiring is correct.
        </p>

        {/* Runtime state */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Runtime state</h2>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">window.gtag</dt>
              <dd className={`font-mono ${gtagLoaded ? "text-emerald-600" : "text-red-600"}`}>
                {gtagLoaded ? "✓ loaded" : "✗ NOT loaded"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Consent — ad_storage</dt>
              <dd className={`font-mono ${consent?.ad_storage === "granted" ? "text-emerald-600" : "text-amber-600"}`}>
                {consent?.ad_storage ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Consent — ad_user_data</dt>
              <dd className={`font-mono ${consent?.ad_user_data === "granted" ? "text-emerald-600" : "text-amber-600"}`}>
                {consent?.ad_user_data ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Consent — analytics_storage</dt>
              <dd className={`font-mono ${consent?.analytics_storage === "granted" ? "text-emerald-600" : "text-amber-600"}`}>
                {consent?.analytics_storage ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Stored attribution (gclid + utm)</dt>
              <dd className="font-mono text-xs text-gray-700 break-all">
                {attribution
                  ? `gclid=${attribution.gclid ?? "—"} | utm_source=${attribution.utmSource ?? "—"} | utm_campaign=${attribution.utmCampaign ?? "—"} | landing=${attribution.landingPage ?? "—"}`
                  : "no attribution stored (visit the site via a paid-ad URL with ?gclid=… to test capture)"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Send-to config */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Configured send_to URLs</h2>
          <p className="text-xs text-gray-500 mb-3">
            Override any of these with the matching <code>NEXT_PUBLIC_GADS_*_SEND_TO</code> env var in
            Vercel if your Google Ads conversion labels differ from the historical defaults.
          </p>
          <ul className="space-y-2 text-xs font-mono">
            <li><span className="text-gray-500">Lead (contact + booking):</span> <span className="text-gray-900">{LEAD_TAG}</span></li>
            <li><span className="text-gray-500">Paid Order (Stripe):</span> <span className="text-gray-900">{PAYMENT_TAG}</span></li>
            <li><span className="text-gray-500">Free Consultation:</span> <span className="text-gray-900">{FREE_CONSULT_TAG}</span></li>
          </ul>
        </div>

        {/* Test inputs */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Enhanced-conversion test data</h2>
          <p className="text-xs text-gray-500 mb-3">
            Used as <code>user_data.email_address</code> and <code>user_data.phone_number</code> on each
            test fire. Use a real email so Enhanced Conversion matching can find the click.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="email"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="phone (E.164)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Fire buttons */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Fire test conversion</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => fire("lead")}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              Fire Lead (contact form)
            </button>
            <button
              onClick={() => fire("booking")}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              Fire Booking (book_appointment)
            </button>
            <button
              onClick={() => fire("free_consult")}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              Fire Free Consultation
            </button>
            <button
              onClick={() => fire("purchase")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              Fire Purchase (€299)
            </button>
          </div>
        </div>

        {/* Recent fires */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Fires this session</h2>
          {results.length === 0 ? (
            <p className="text-xs text-gray-400">No fires yet. Click a button above.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="py-1">Time</th>
                  <th>Type</th>
                  <th>send_to</th>
                  <th>txn_id</th>
                  <th>Acked</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1.5">{r.at}</td>
                    <td>{r.type}</td>
                    <td className="text-gray-700 break-all">{r.sendTo}</td>
                    <td className="text-gray-600">{r.txnId}</td>
                    <td className={r.acked ? "text-emerald-600" : "text-amber-600"}>
                      {r.acked ? "✓" : r.error ? `✗ ${r.error}` : "pending…"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* What to check */}
        <div className="bg-white rounded-xl shadow-sm p-5 text-sm text-gray-700 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">If a test fire doesn&apos;t show up in Google Ads…</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs">
            <li>
              <strong>Auto-tagging on?</strong> Google Ads → Tools → Tracking → Auto-tagging → must be ON.
              If off, ad clicks have no <code>gclid</code> and conversions can&apos;t attribute.
            </li>
            <li>
              <strong>Conversion action exists?</strong> Google Ads → Tools → Conversions → check the
              action with the label shown above. If the label was recreated, copy the new label and
              paste it into the matching <code>NEXT_PUBLIC_GADS_*_SEND_TO</code> env var in Vercel
              (no code redeploy needed — it&apos;s read at request time).
            </li>
            <li>
              <strong>GA4 ↔ Google Ads link active?</strong> Google Ads → Tools → Linked accounts →
              GA4. If broken, GA4 events (which we ALSO fire as a backup) won&apos;t reach Ads.
            </li>
            <li>
              <strong>Conversion action set to count?</strong> Each action has an &quot;Include in
              Conversions&quot; toggle. If off, the action fires but doesn&apos;t count toward the
              optimisation goal.
            </li>
            <li>
              <strong>Consent denied?</strong> If the four <code>Consent</code> rows above show
              &quot;denied&quot;, only modeled conversions arrive. Click &quot;Accept all&quot; on the
              cookie banner to test the granted path.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
