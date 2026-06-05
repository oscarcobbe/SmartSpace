/**
 * Business-card QR redirect + scan tracker.
 *
 * Background: 34 printed Smart Space review cards were handed to stores.
 * The customer scans the QR on the back of the card and we want to know
 * how many people actually scanned (and ideally from where, on which
 * device, on which day) so Nigel can judge whether the card distribution
 * was worth the print run.
 *
 * Why a redirect endpoint instead of pointing the QR directly at the
 * Google review URL:
 *   - The Google review URL (https://g.page/r/CRIzJuevqw9YEAE/review)
 *     hands the customer straight to Google. Smart Space sees zero data.
 *   - Routing through smart-space.ie/r/card means we own the first hop:
 *     we log the scan to the existing Apps Script leads sheet, then 302
 *     to Google immediately. The customer's UX is unchanged — one extra
 *     ~200ms server hop they will not notice.
 *   - Adblockers cannot block first-party redirects.
 *
 * Endpoint contract:
 *   GET /r/card
 *   GET /r/card?s=<storeSlug>      — optional: per-store tracking when
 *                                     the next print run uses one QR per
 *                                     store (e.g. /r/card?s=tesco-blanch)
 *   GET /r/card?v=<variantSlug>    — optional: per-design tracking (v1/v2/v3)
 *
 * Response: 302 redirect to the Google Business Profile review URL.
 *
 * Designed to NEVER throw. If the lead-log Sheet write fails we still
 * redirect — the customer is mid-review, we cannot break their flow.
 *
 * IMPORTANT — already-distributed cards: the 34 cards handed out before
 * this endpoint existed point straight to Google. Those scans are NOT
 * tracked retroactively. Only cards printed from PDFs regenerated AFTER
 * the QR target was swapped (see ad-assets/business-card/_build_review_cards.py)
 * route through this endpoint.
 */

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { logLead } from "@/lib/leads";

// The actual destination — Smart Space's Google Business Profile review form.
// Pulled from env so it can be rotated without a code deploy if Google ever
// changes the URL shape. Fallback is the literal URL we verified in the QR
// decode test (2026-06-04).
const GOOGLE_REVIEW_URL =
  process.env.GBP_REVIEW_URL?.trim() ||
  "https://g.page/r/CRIzJuevqw9YEAE/review";

// Force dynamic — every scan is a unique event. No CDN/edge caching, ever.
// A cached redirect would still work, but we would miss the scan log.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = url.searchParams.get("s")?.trim() || null;
  const variant = url.searchParams.get("v")?.trim() || null;

  // Vercel injects these headers on every request — free, no extra calls.
  // See https://vercel.com/docs/edge-network/headers for the full list.
  const headers = request.headers;
  const ua = headers.get("user-agent") || "(no user-agent)";
  const referer = headers.get("referer") || "";
  const country = headers.get("x-vercel-ip-country") || "";
  const city = headers.get("x-vercel-ip-city") || "";
  const region = headers.get("x-vercel-ip-country-region") || "";
  const latitude = headers.get("x-vercel-ip-latitude") || "";
  const longitude = headers.get("x-vercel-ip-longitude") || "";
  const timezone = headers.get("x-vercel-ip-timezone") || "";
  const acceptLanguage = headers.get("accept-language") || "";

  // Daily-salted IP hash — gives us same-day repeat-scan dedupe without
  // storing raw IPs. The salt rotates every UTC midnight so longitudinal
  // tracking past 24h is impossible. We hash both x-forwarded-for and
  // x-real-ip if either is present.
  const rawIp =
    (headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "";
  const ipFingerprint = rawIp ? dailyHash(rawIp) : "(no ip)";

  // Parse UA into browser + OS so the sheet has cleanly-filterable columns
  // beyond just "iPhone" vs "Android". The full UA string is also kept for
  // forensic detail in case the parse misses something.
  const deviceClass = inferDevice(ua);
  const browser = inferBrowser(ua);
  const os = inferOs(ua);

  // Dublin-local timestamp so Nigel can read scan times at a glance without
  // doing UTC arithmetic. ISO-Z timestamp is already added by logLead.
  const dublinTime = new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  // Compose the notes string so the Sheet row is self-contained for skim
  // reading. Apps Script writes the rest into existing columns (type,
  // source, timestamp, etc.).
  const geoStr =
    [city, region, country].filter(Boolean).join(", ") || "(unknown location)";
  const latLng =
    latitude && longitude ? `${latitude},${longitude}` : "(no lat/lng)";
  const noteParts = [
    `Business-card QR scan`,
    `dublin-time=${dublinTime}`,
    store ? `store=${store}` : `store=(none, aggregate)`,
    variant ? `variant=${variant}` : `variant=(none)`,
    `device=${deviceClass}`,
    `browser=${browser}`,
    `os=${os}`,
    `geo=${geoStr}`,
    `latlng=${latLng}`,
    `tz=${timezone || "(none)"}`,
    `lang=${(acceptLanguage || "(none)").split(",")[0]}`,
    `ip-fingerprint=${ipFingerprint}`,
    referer ? `referer=${referer}` : `referer=(direct)`,
    `ua=${ua.slice(0, 200)}`,
  ];

  // Await the log so we guarantee delivery — Vercel kills lambdas the
  // moment the response returns, which silently drops ~30% of fire-and-
  // forget Apps Script writes (see leads.ts comment). A ~300-800ms server
  // hop is imperceptible to a customer mid-QR-scan.
  try {
    await logLead({
      type: "QR Scan",
      source: store ? `business-card:${store}` : "business-card",
      // Use the address field to surface the Dublin-readable location at a
      // glance in /admin/leads, since that column is otherwise unused for
      // QR scans (no postal address on a scan).
      address: geoStr === "(unknown location)" ? undefined : geoStr,
      notes: noteParts.join(" | "),
    });
  } catch (err) {
    // logLead swallows errors internally, but belt-and-braces: never let
    // a logging failure break the customer's review flow.
    console.error("[r/card] lead log threw (should not be possible):", err);
  }

  return NextResponse.redirect(GOOGLE_REVIEW_URL, {
    status: 302,
    headers: {
      // The redirect itself must not be cached — every scan must hit our
      // server so it counts. Without no-store, mobile browsers and CDNs
      // happily memoize a redirect for hours.
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}

/**
 * SHA-256 of (raw IP + today's UTC date) — first 12 hex chars.
 * Lets Nigel dedupe scans from the same source within a single day
 * without storing PII. After 24h the salt rotates and the same IP
 * produces a different fingerprint, so we cannot reconstruct a longer
 * trail.
 */
function dailyHash(raw: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  return createHash("sha256").update(`${raw}|smart-space|${today}`).digest("hex").slice(0, 12);
}

/**
 * Map a user-agent string to a coarse device class for the leads sheet.
 * Not perfect, not security-critical — purely to give Nigel a quick read
 * of "is everyone scanning on iPhone or are Androids in the mix too?"
 */
function inferDevice(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes("iphone")) return "iPhone";
  if (s.includes("ipad")) return "iPad";
  if (s.includes("android")) {
    // Android can be a phone or tablet. "Mobile" in the UA → phone;
    // its absence on Android usually → tablet.
    return s.includes("mobile") ? "Android phone" : "Android tablet";
  }
  if (s.includes("macintosh") || s.includes("mac os x")) return "Mac";
  if (s.includes("windows")) return "Windows";
  if (s.includes("linux")) return "Linux";
  return "Other/unknown";
}

/** Coarse browser detection — good enough for "Safari vs Chrome split". */
function inferBrowser(ua: string): string {
  const s = ua.toLowerCase();
  // Order matters: Edge spoofs Chrome which spoofs Safari. Test most-
  // specific first.
  if (s.includes("samsungbrowser")) return "Samsung Internet";
  if (s.includes("edg/")) return "Edge";
  if (s.includes("opr/") || s.includes("opera")) return "Opera";
  if (s.includes("firefox")) return "Firefox";
  if (s.includes("chrome")) return "Chrome";
  // Safari is whatever's left on Apple devices.
  if (s.includes("safari")) return "Safari";
  return "Other";
}

/** OS + version when we can extract it cleanly. */
function inferOs(ua: string): string {
  // iOS — "iPhone OS 17_1_2" → "iOS 17.1.2"
  const ios = ua.match(/iPhone OS (\d+)[_\.](\d+)(?:[_\.](\d+))?/);
  if (ios) return `iOS ${ios[1]}.${ios[2]}${ios[3] ? `.${ios[3]}` : ""}`;
  // iPad — "CPU OS 17_1 like Mac OS X"
  const ipad = ua.match(/CPU OS (\d+)[_\.](\d+)/);
  if (ipad && ua.includes("iPad")) return `iPadOS ${ipad[1]}.${ipad[2]}`;
  // Android — "Android 14"
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return `Android ${android[1]}`;
  // macOS — "Mac OS X 10_15_7"
  const mac = ua.match(/Mac OS X (\d+)[_\.](\d+)(?:[_\.](\d+))?/);
  if (mac) return `macOS ${mac[1]}.${mac[2]}${mac[3] ? `.${mac[3]}` : ""}`;
  // Windows — "Windows NT 10.0"
  if (ua.includes("Windows NT 10.0")) return "Windows 10/11";
  if (ua.includes("Windows NT 6.3")) return "Windows 8.1";
  if (ua.includes("Windows NT 6.1")) return "Windows 7";
  if (ua.includes("Linux")) return "Linux";
  return "Other/unknown";
}
