/**
 * Server-side conversion diagnostic endpoint (admin only).
 *
 * Why this exists: when Google Ads says "0 conversions" but the contact form
 * and Stripe webhook both have working `fireServerConversion` calls (and the
 * logs confirm fires happen), there are only three places the conversion can
 * be silently dropped between us and the Conversions column in Google Ads:
 *
 *   1. The legacy URL pixel endpoint
 *      (`googleadservices.com/pagead/conversion/<id>/`) accepts the request
 *      and 200s with a 1x1 GIF — but if the conversion ACTION corresponding
 *      to the label is paused, deleted, or set to "Don't include in
 *      'Conversions'", the pixel is silently dropped.
 *   2. The GA4 Measurement Protocol endpoint requires `GA4_API_SECRET`.
 *      Without it, `fireServerConversion` skips the GA4 fire entirely — and
 *      the only confirmation is a `[conv] GA4_API_SECRET not set` line in
 *      Vercel logs that nobody reads.
 *   3. Auto-tagging off → no `gclid` → the conversion is received by Google
 *      but can't attribute back to a paid click, so it's classified as
 *      "Other" instead of counting under the campaign.
 *
 * The existing `/admin/conversion-test` page tests only CLIENT-side gtag
 * fires. This endpoint mirrors that for the SERVER-side path: it picks the
 * matching label from env, builds the exact same URL `fireGoogleAdsPixel`
 * would, fires it, and reports back the URL + Google response status. If
 * GA4 is configured, it also fires the GA4 MP event and reports that
 * separately. The admin can copy the URL, paste it in a browser, and watch
 * Google's response in real time.
 *
 * POST /api/admin/test-conversion
 *   Headers: Authorization: Bearer <ADMIN_KEY>
 *   Body:    { type: "lead" | "payment" | "free_consult" | "call",
 *              gclid?: string, email?: string, phone?: string }
 *   Returns: { adsPixel: { url, status, label }, ga4: { configured, status?, body? } }
 *
 * Nothing here writes to the leads sheet or fires CRM — this is a pure
 * diagnostic. Real conversions go through /api/contact, /api/webhooks/stripe,
 * /api/track/phone-click, etc.
 */

import { NextResponse } from "next/server";
import { randomUUID, createHash, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const GADS_ACCOUNT_ID = "17978501655"; // from AW-17978501655

function safeEqual(a: string, b: string): boolean {
  // Constant-time comparison to defeat timing-attack key probing.
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function hashPii(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  if (!normalised) return undefined;
  return createHash("sha256").update(normalised).digest("hex");
}

/**
 * Pull the right label out of env for the conversion type the admin wants
 * to test. Mirrors the env-var precedence used by /api/contact (lead),
 * the Stripe webhook (payment), /api/checkout/free (free_consult), and
 * src/components/PhoneClickTracker.tsx (call).
 */
function labelForType(type: string): { label: string; envVar: string; fallback: string } {
  switch (type) {
    case "lead":
      return {
        label:
          (process.env.NEXT_PUBLIC_GADS_LEAD_SEND_TO || "")
            .trim()
            .replace(/^AW-\d+\//, "") || "u8cHCNyipZocEJfU6PxC",
        envVar: "NEXT_PUBLIC_GADS_LEAD_SEND_TO",
        fallback: "u8cHCNyipZocEJfU6PxC",
      };
    case "payment":
      return {
        label:
          (process.env.NEXT_PUBLIC_GADS_PAYMENT_SEND_TO || "")
            .trim()
            .replace(/^AW-\d+\//, "") || "IofPCOiZuJkcEJfU6PxC",
        envVar: "NEXT_PUBLIC_GADS_PAYMENT_SEND_TO",
        fallback: "IofPCOiZuJkcEJfU6PxC",
      };
    case "free_consult":
      return {
        label:
          (process.env.NEXT_PUBLIC_GADS_FREE_CONSULT_SEND_TO || "")
            .trim()
            .replace(/^AW-\d+\//, "") || "fH4ZCMHv7ZocEJfU6PxC",
        envVar: "NEXT_PUBLIC_GADS_FREE_CONSULT_SEND_TO",
        fallback: "fH4ZCMHv7ZocEJfU6PxC",
      };
    case "call":
      return {
        label: (process.env.NEXT_PUBLIC_GADS_CALL_LABEL || "").trim() || "HWS2CL2y4ZgcEJfU6PxC",
        envVar: "NEXT_PUBLIC_GADS_CALL_LABEL",
        fallback: "HWS2CL2y4ZgcEJfU6PxC",
      };
    default:
      return { label: "", envVar: "(unknown)", fallback: "" };
  }
}

export async function POST(request: Request) {
  // ── Auth ──
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const submittedKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!submittedKey || !safeEqual(submittedKey, adminKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──
  let body: { type?: string; gclid?: string; email?: string; phone?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = (body.type ?? "").trim();
  if (!["lead", "payment", "free_consult", "call"].includes(type)) {
    return NextResponse.json(
      { error: 'type must be one of "lead", "payment", "free_consult", "call"' },
      { status: 400 }
    );
  }

  const { label, envVar, fallback } = labelForType(type);
  const value = type === "payment" ? 299 : type === "free_consult" ? 50 : type === "call" ? 30 : 10;
  const txnId = `test-${type}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const gclid = body.gclid?.trim();
  const email = body.email?.trim();
  const phone = body.phone?.trim();

  // ── 1. Fire the Google Ads URL pixel (legacy endpoint, accepts modern labels) ──
  const adsParams = new URLSearchParams();
  adsParams.set("label", label);
  adsParams.set("value", String(value));
  adsParams.set("currency_code", "EUR");
  adsParams.set("oid", txnId);
  if (gclid) adsParams.set("gclid", gclid);
  const sha_email = hashPii(email);
  const sha_phone = hashPii(phone);
  if (sha_email) adsParams.set("em", sha_email);
  if (sha_phone) adsParams.set("pn", sha_phone);

  const adsUrl = `https://www.googleadservices.com/pagead/conversion/${GADS_ACCOUNT_ID}/?${adsParams.toString()}`;

  let adsStatus: number | null = null;
  let adsBodyPreview: string | null = null;
  let adsError: string | null = null;
  try {
    const res = await fetch(adsUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    adsStatus = res.status;
    // The Ads pixel responds with a 1x1 GIF for valid hits. Empty body
    // (Content-Length: 0) means Google rejected something (often a missing
    // gclid + missing user_data — Google needs SOMETHING to attribute).
    const raw = await res.text().catch(() => "");
    adsBodyPreview = raw ? raw.slice(0, 100) : "(empty body — Google likely received but dropped silently)";
  } catch (err) {
    adsError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  // ── 2. Fire GA4 Measurement Protocol (only if API secret is set) ──
  const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const ga4Secret = process.env.GA4_API_SECRET;
  type Ga4Result =
    | { configured: false; reason: string }
    | { configured: true; url: string; status: number | null; body: string | null; error: string | null };
  let ga4Result: Ga4Result = {
    configured: false,
    reason: !ga4Id ? "NEXT_PUBLIC_GA4_MEASUREMENT_ID not set" : "GA4_API_SECRET not set",
  };
  if (ga4Id && ga4Secret) {
    const ga4Event =
      type === "payment"
        ? "purchase"
        : type === "free_consult"
        ? "book_appointment"
        : "generate_lead";
    const ga4Body = {
      client_id: txnId,
      events: [
        {
          name: ga4Event,
          params: {
            value,
            currency: "EUR",
            transaction_id: txnId,
            lead_source: `conversion_test_${type}`,
            ...(gclid ? { gclid } : {}),
          },
        },
      ],
    };
    const ga4Url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4Id}&api_secret=${ga4Secret}`;
    let ga4Status: number | null = null;
    let ga4ResponseBody: string | null = null;
    let ga4Error: string | null = null;
    try {
      const res = await fetch(ga4Url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ga4Body),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      ga4Status = res.status;
      ga4ResponseBody = (await res.text().catch(() => "")).slice(0, 200);
    } catch (err) {
      ga4Error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
    ga4Result = {
      configured: true,
      url: ga4Url.replace(/api_secret=[^&]+/, "api_secret=***"),
      status: ga4Status,
      body: ga4ResponseBody,
      error: ga4Error,
    };
  }

  return NextResponse.json({
    type,
    txnId,
    label,
    envVar,
    usingFallback: label === fallback,
    adsPixel: {
      url: adsUrl,
      status: adsStatus,
      bodyPreview: adsBodyPreview,
      error: adsError,
      note:
        "Google Ads URL pixel ALWAYS returns 200 for well-formed requests, even if the conversion action is paused/deleted/excluded. A 200 here does NOT prove the conversion was recorded — only that Google received the ping. Verify in Google Ads → Tools → Conversions → Diagnostics within 6-12 hours.",
    },
    ga4: ga4Result,
    nextStep:
      "Wait 6-12 hours, then check Google Ads → Tools & Settings → Conversions. Find the action with the label shown above. The 'Recent activity' column should now show 1 conversion from this test fire. If it doesn't, the action is paused, deleted, or not set to 'Include in Conversions'.",
  });
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Method not allowed. POST /api/admin/test-conversion with Authorization: Bearer <ADMIN_KEY> and body {type, gclid?, email?, phone?}",
    },
    { status: 405 }
  );
}
