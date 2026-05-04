/**
 * Server-side conversion firing.
 *
 * Why: client-side gtag.js misses ~20-40% of conversions in production due to
 *   - Adblockers / privacy extensions silently dropping the pixel
 *   - Consent Mode default-deny (modeled, not full-fidelity)
 *   - SPA navigation killing the success page before the gtag fire completes
 *   - Mobile browsers throttling background JS on tab-switch
 *
 * This module fires conversions a second time from the server (the source of
 * truth — we only call it after the row has been confirmed paid / written to
 * the lead sheet), so Google Ads + GA4 see every real conversion.
 *
 * Two channels:
 *   1) GA4 Measurement Protocol — official, authenticated. Requires
 *      GA4_API_SECRET (create in GA4 Admin → Data Streams → Measurement
 *      Protocol API secrets). When GA4 is linked to Google Ads, server-fired
 *      events become importable Google Ads conversions.
 *   2) Google Ads conversion pixel — unauthenticated GET to the legacy
 *      googleadservices endpoint. Less reliable than the Conversions API but
 *      requires zero new credentials and acts as a backstop when (1) is not
 *      configured.
 *
 * Both are best-effort: failures are logged and never thrown. Customer flows
 * never break because tracking is having a bad day.
 */

import { createHash, randomUUID } from "crypto";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID; // e.g. G-JR2WXNSLEL
const GA4_API_SECRET = process.env.GA4_API_SECRET;
const GADS_ACCOUNT_ID = "17978501655"; // from AW-17978501655

/** Sha256 lowercase-trim — Google's Enhanced Conversions hashing format. */
function hashPii(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  if (!normalised) return undefined;
  return createHash("sha256").update(normalised).digest("hex");
}

export interface ServerConversionInput {
  /** Conversion label after the slash, e.g. `IofPCOiZuJkcEJfU6PxC`. */
  gadsLabel: string;
  /** Recommended GA4 event name: `purchase` | `generate_lead` | `book_appointment`. */
  ga4EventName: "purchase" | "generate_lead" | "book_appointment";
  value?: number;
  currency?: string;
  /** Stripe session id / order id — dedupes the conversion across retries. */
  transactionId?: string;
  /** Carried through from URL → localStorage → checkout metadata; null if user came from organic. */
  gclid?: string;
  /** Used both to dedupe and for Enhanced Conversions matching. */
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  /** Anything else worth landing in GA4 (e.g. `lead_source: 'contact_form'`). */
  extraParams?: Record<string, string | number | boolean>;
}

/**
 * Fire conversion through both channels concurrently. Awaits both with a
 * 4s ceiling so a hung Google endpoint can't pin the parent serverless
 * function. Always resolves — never throws.
 */
export async function fireServerConversion(input: ServerConversionInput): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];

  if (GA4_ID && GA4_API_SECRET) {
    tasks.push(fireGA4(input));
  } else if (!GA4_API_SECRET) {
    // Logged once per cold start so we know the safety net isn't installed.
    console.warn("[conv] GA4_API_SECRET not set — skipping server-side GA4 conversion fire");
  }

  // Always fire the Google Ads pixel — it has no setup requirements.
  tasks.push(fireGoogleAdsPixel(input));

  await Promise.race([
    Promise.allSettled(tasks),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

async function fireGA4(input: ServerConversionInput): Promise<void> {
  try {
    const userData: Record<string, unknown> = {};
    const sha_email = hashPii(input.email);
    const sha_phone = hashPii(input.phone);
    if (sha_email) userData.sha256_email_address = sha_email;
    if (sha_phone) userData.sha256_phone_number = sha_phone;
    if (input.firstName) userData.address = { ...(userData.address as object), sha256_first_name: hashPii(input.firstName) };
    if (input.lastName) userData.address = { ...(userData.address as object), sha256_last_name: hashPii(input.lastName) };

    const params: Record<string, string | number | boolean> = {
      ...(input.extraParams ?? {}),
    };
    if (typeof input.value === "number") params.value = input.value;
    if (input.currency) params.currency = input.currency;
    if (input.transactionId) params.transaction_id = input.transactionId;
    if (input.gclid) params.gclid = input.gclid;

    const body = {
      client_id: input.transactionId ?? randomUUID(),
      user_id: sha_email, // stable user_id for cross-device join when available
      user_data: Object.keys(userData).length ? userData : undefined,
      events: [
        {
          name: input.ga4EventName,
          params,
        },
      ],
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_ID}&api_secret=${GA4_API_SECRET}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[conv] GA4 MP responded ${res.status}: ${await res.text().catch(() => "")}`);
    } else {
      console.log(`[conv] GA4 MP fired ${input.ga4EventName} value=${input.value ?? 0} ${input.currency ?? ""}`);
    }
  } catch (err) {
    console.error("[conv] GA4 MP error:", err);
  }
}

async function fireGoogleAdsPixel(input: ServerConversionInput): Promise<void> {
  // Legacy pixel format: GET to googleadservices/pagead/conversion/<id>/
  // Accepts gclid for click attribution and value/currency for monetary.
  // Emails/phones can be appended as `em` and `pn` (sha256 hex) for ECfL.
  try {
    const params = new URLSearchParams();
    params.set("label", input.gadsLabel);
    if (typeof input.value === "number") params.set("value", input.value.toString());
    if (input.currency) params.set("currency_code", input.currency);
    if (input.transactionId) params.set("oid", input.transactionId);
    if (input.gclid) params.set("gclid", input.gclid);
    const sha_email = hashPii(input.email);
    const sha_phone = hashPii(input.phone);
    if (sha_email) params.set("em", sha_email);
    if (sha_phone) params.set("pn", sha_phone);

    const url = `https://www.googleadservices.com/pagead/conversion/${GADS_ACCOUNT_ID}/?${params.toString()}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    // The pixel always 200s with a 1x1 GIF — failure here usually means the
    // network blocked us, not that Google rejected the conversion.
    if (!res.ok) {
      console.error(`[conv] Google Ads pixel responded ${res.status}`);
    } else {
      console.log(`[conv] Google Ads pixel fired AW-${GADS_ACCOUNT_ID}/${input.gadsLabel} gclid=${input.gclid ? "yes" : "no"} email=${sha_email ? "hashed" : "no"}`);
    }
  } catch (err) {
    console.error("[conv] Google Ads pixel error:", err);
  }
}
