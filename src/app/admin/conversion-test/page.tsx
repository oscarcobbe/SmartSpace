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
 * URL: /admin/conversion-test  (auth enforced by src/app/admin/layout.tsx)
 */

import { useEffect, useState } from "react";
import { getAttribution } from "@/lib/attribution";

type FireResult = {
  at: string;
  type: string;
  sendTo: string;
  txnId: string;
  acked: boolean;
  error?: string;
};

type ServerFireResult = {
  at: string;
  type: string;
  label: string;
  adsStatus: number | null;
  adsBodyPreview: string | null;
  ga4Configured: boolean;
  ga4Status: number | null;
  ga4Body: string | null;
  usingFallback: boolean;
  envVar: string;
  txnId: string;
  error?: string;
};

const GADS_ACCOUNT = "AW-17978501655";
// .trim(), see src/components/ContactForm.tsx for the rationale.
// Without this, the diagnostic page would say "conversion fired" even
// when Google Ads rejected the label as malformed (trailing newline),
// silently misleading anyone using the test page to verify the pipeline.
const LEAD_TAG =
  process.env.NEXT_PUBLIC_GADS_LEAD_SEND_TO?.trim() ||
  `${GADS_ACCOUNT}/u8cHCNyipZocEJfU6PxC`;
const PAYMENT_TAG =
  process.env.NEXT_PUBLIC_GADS_PAYMENT_SEND_TO?.trim() ||
  `${GADS_ACCOUNT}/IofPCOiZuJkcEJfU6PxC`;
const FREE_CONSULT_TAG =
  process.env.NEXT_PUBLIC_GADS_FREE_CONSULT_SEND_TO?.trim() ||
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
  // window.google_tag_data.ics, undocumented but stable for years.
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
  const [gtagLoaded, setGtagLoaded] = useState(false);
  const [consent, setConsent] = useState<ConsentSnapshot | null>(null);
  const [attribution, setAttribution] = useState<ReturnType<typeof getAttribution> | null>(null);
  const [results, setResults] = useState<FireResult[]>([]);
  const [serverResults, setServerResults] = useState<ServerFireResult[]>([]);
  const [serverFiring, setServerFiring] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("test+conversion@smart-space.ie");
  const [testPhone, setTestPhone] = useState("+353871234567");

  // Auth is enforced by src/app/admin/layout.tsx. By the time this
  // component renders, the user is already authenticated.
  useEffect(() => {
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
  }, []);

  function fire(type: "lead" | "booking" | "purchase" | "free_consult") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.gtag !== "function") {
      setResults((r) => [
        { at: new Date().toLocaleTimeString(), type, sendTo: "-", txnId: "-", acked: false, error: "window.gtag not loaded" },
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

  /**
   * Server-side fire, hits /api/admin/test-conversion, which mirrors what
   * fireServerConversion() does in /api/contact + /api/webhooks/stripe but
   * captures the URL Google was hit with + Google's response status.
   *
   * Use this to confirm the SERVER path works independently of the gtag
   * one above. The gtag path is the optimistic best case (consent granted,
   * no adblocker, page survived), server path is what every real form
   * submit and Stripe purchase relies on.
   */
  async function fireServerSide(type: "lead" | "payment" | "free_consult" | "call") {
    setServerFiring(type);
    const adminKey = sessionStorage.getItem("admin_key") ?? "";
    const txnTag = `${type}-${Date.now()}`;
    try {
      const res = await fetch("/api/admin/test-conversion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          type,
          gclid: attribution?.gclid,
          email: testEmail,
          phone: testPhone,
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        setServerResults((r) => [
          {
            at: new Date().toLocaleTimeString(),
            type,
            label: "-",
            adsStatus: null,
            adsBodyPreview: null,
            ga4Configured: false,
            ga4Status: null,
            ga4Body: null,
            usingFallback: false,
            envVar: "(error)",
            txnId: txnTag,
            error: data?.error || `HTTP ${res.status}`,
          },
          ...r,
        ]);
        return;
      }
      setServerResults((r) => [
        {
          at: new Date().toLocaleTimeString(),
          type,
          label: data.label as string,
          adsStatus: data.adsPixel?.status ?? null,
          adsBodyPreview: data.adsPixel?.bodyPreview ?? null,
          ga4Configured: !!data.ga4?.configured,
          ga4Status: data.ga4?.status ?? null,
          ga4Body: data.ga4?.body ?? null,
          usingFallback: !!data.usingFallback,
          envVar: data.envVar as string,
          txnId: data.txnId as string,
        },
        ...r,
      ]);
    } catch (err) {
      setServerResults((r) => [
        {
          at: new Date().toLocaleTimeString(),
          type,
          label: "-",
          adsStatus: null,
          adsBodyPreview: null,
          ga4Configured: false,
          ga4Status: null,
          ga4Body: null,
          usingFallback: false,
          envVar: "(error)",
          txnId: txnTag,
          error: err instanceof Error ? err.message : String(err),
        },
        ...r,
      ]);
    } finally {
      setServerFiring(null);
    }
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
              <dt className="text-xs text-gray-500">Consent, ad_storage</dt>
              <dd className={`font-mono ${consent?.ad_storage === "granted" ? "text-emerald-600" : "text-amber-600"}`}>
                {consent?.ad_storage ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Consent, ad_user_data</dt>
              <dd className={`font-mono ${consent?.ad_user_data === "granted" ? "text-emerald-600" : "text-amber-600"}`}>
                {consent?.ad_user_data ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Consent, analytics_storage</dt>
              <dd className={`font-mono ${consent?.analytics_storage === "granted" ? "text-emerald-600" : "text-amber-600"}`}>
                {consent?.analytics_storage ?? "-"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Stored attribution (gclid + utm)</dt>
              <dd className="font-mono text-xs text-gray-700 break-all">
                {attribution
                  ? `gclid=${attribution.gclid ?? "-"} | utm_source=${attribution.utmSource ?? "-"} | utm_campaign=${attribution.utmCampaign ?? "-"} | landing=${attribution.landingPage ?? "-"}`
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

        {/* Server-side fire buttons, bypass gtag entirely, hit Google
            directly from our server. This is the path that /api/contact +
            Stripe webhook + /api/track/phone-click all use under the hood. */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border border-purple-100">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Fire SERVER-SIDE test conversion</h2>
          <p className="text-xs text-gray-500 mb-3">
            Mirrors what <code>/api/contact</code> + Stripe webhook + phone-click endpoint do.
            Shows the exact URL Google was hit with + Google&apos;s response code. Use this when
            forms/Stripe purchases aren&apos;t showing up in Google Ads, proves the server fire
            is reaching Google. (Auth: admin key, same as the leads dashboard.)
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => fireServerSide("lead")}
              disabled={!!serverFiring}
              className="bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
            >
              {serverFiring === "lead" ? "Firing…" : "Server: Lead (contact form)"}
            </button>
            <button
              onClick={() => fireServerSide("payment")}
              disabled={!!serverFiring}
              className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
            >
              {serverFiring === "payment" ? "Firing…" : "Server: Stripe Purchase (€299)"}
            </button>
            <button
              onClick={() => fireServerSide("free_consult")}
              disabled={!!serverFiring}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
            >
              {serverFiring === "free_consult" ? "Firing…" : "Server: Free Consultation"}
            </button>
            <button
              onClick={() => fireServerSide("call")}
              disabled={!!serverFiring}
              className="bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
            >
              {serverFiring === "call" ? "Firing…" : "Server: Phone Click"}
            </button>
          </div>
        </div>

        {/* Server fire results */}
        {serverResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Server fires this session</h2>
            <div className="space-y-3">
              {serverResults.map((r, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 font-mono text-xs">
                  <div className="flex flex-wrap gap-3 mb-2 text-gray-600">
                    <span>{r.at}</span>
                    <span className="text-gray-900 font-bold">{r.type}</span>
                    {r.usingFallback && (
                      <span className="text-amber-700">⚠ using hardcoded fallback ({r.envVar} not set)</span>
                    )}
                  </div>
                  {r.error ? (
                    <div className="text-red-600">✗ {r.error}</div>
                  ) : (
                    <>
                      <div className="mb-1">
                        <span className="text-gray-500">label:</span> <span className="text-gray-900">{r.label}</span>
                      </div>
                      <div className="mb-1">
                        <span className="text-gray-500">Google Ads pixel:</span>{" "}
                        <span className={r.adsStatus === 200 ? "text-emerald-700" : "text-red-700"}>
                          HTTP {r.adsStatus ?? "-"}
                        </span>
                        {r.adsBodyPreview && (
                          <span className="text-gray-500 ml-2">body: {r.adsBodyPreview}</span>
                        )}
                      </div>
                      <div className="mb-1">
                        <span className="text-gray-500">GA4 Measurement Protocol:</span>{" "}
                        {r.ga4Configured ? (
                          <span className={r.ga4Status === 204 || r.ga4Status === 200 ? "text-emerald-700" : "text-red-700"}>
                            HTTP {r.ga4Status ?? "-"}
                            {r.ga4Body && r.ga4Body.length > 0 && (
                              <span className="text-gray-500 ml-2">{r.ga4Body.slice(0, 60)}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-amber-700">
                            ⚠ not configured, set GA4_API_SECRET in Vercel to enable
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-[10px]">txn: {r.txnId}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              <strong>Important:</strong> Google&apos;s URL pixel ALWAYS returns 200, even if the
              conversion action is paused/deleted or set to &quot;don&apos;t include&quot;. A 200
              here only proves the ping reached Google, not that it was counted. Check Google Ads
              → Tools → Conversions → Diagnostics within 6-12 hours to confirm.
            </p>
          </div>
        )}

        {/* Recent fires */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Client gtag fires this session</h2>
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
              (no code redeploy needed, it&apos;s read at request time).
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
