/**
 * Shared QR-scan tracker.
 *
 * Used by every Smart Space tracked-QR redirect endpoint
 * (/r/card for review cards, /r/install for installer business cards,
 * and any future /r/* short links — flyers, posters, vehicle decals).
 *
 * The flow is always the same: customer scans a QR → hits /r/<name> on
 * smart-space.ie → we log everything we can capture server-side without
 * any customer interaction → 302 redirect to the actual destination.
 *
 * Each call costs one Apps Script write (~300-800ms) and produces one
 * row in the leads sheet as type="QR Scan" with the source field
 * distinguishing which QR was scanned.
 */

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { logLead } from "@/lib/leads";

export interface TrackQrScanOptions {
  /**
   * The URL we 302-redirect the customer to after logging. Customer
   * never sees Smart Space — they tap the QR and end up here.
   */
  destination: string;
  /**
   * Stable identifier for this QR's purpose. Lands in the leads sheet
   * Source column. Examples: "business-card:review", "business-card:installer",
   * "flyer:dl", "vehicle-decal".
   */
  source: string;
  /**
   * Short human-readable prefix that goes into the Notes field at the
   * front, so Nigel sees at a glance which QR was scanned. Examples:
   * "Review-card QR scan", "Installer-card QR scan".
   */
  noteLabel: string;
}

/**
 * Handle a QR scan request: log everything we can capture, then redirect.
 *
 * Designed to NEVER throw. If the Sheet write fails we still redirect —
 * the customer is mid-journey, we cannot break their flow.
 *
 * Reads optional query params from the request URL:
 *   ?s=<storeSlug>      — per-store tracking for multi-batch print runs
 *   ?v=<variantSlug>    — per-design tracking (v1 vs v2 etc)
 */
export async function trackQrScan(
  request: Request,
  { destination, source, noteLabel }: TrackQrScanOptions
): Promise<Response> {
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
  // tracking past 24h is impossible.
  const rawIp =
    (headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "";
  const ipFingerprint = rawIp ? dailyHash(rawIp) : "(no ip)";

  // Parse UA into clean device class + browser + OS columns so Nigel can
  // filter by these in the sheet.
  const deviceClass = inferDevice(ua);
  const browser = inferBrowser(ua);
  const os = inferOs(ua);

  // Dublin-local timestamp so scan times are readable at a glance. The
  // ISO-Z timestamp is already added by logLead.
  const dublinTime = new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const geoStr =
    [city, region, country].filter(Boolean).join(", ") || "(unknown location)";
  const latLng =
    latitude && longitude ? `${latitude},${longitude}` : "(no lat/lng)";
  const noteParts = [
    noteLabel,
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
      source: store ? `${source}:${store}` : source,
      // Address column shows the city-region-country at a glance in
      // /admin/leads, since QR scans never have a postal address.
      address: geoStr === "(unknown location)" ? undefined : geoStr,
      notes: noteParts.join(" | "),
    });
  } catch (err) {
    // logLead swallows errors internally, but belt-and-braces: never let
    // a logging failure break the customer's redirect.
    console.error(`[qr-scan ${source}] lead log threw (should not happen):`, err);
  }

  return NextResponse.redirect(destination, {
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
  return createHash("sha256")
    .update(`${raw}|smart-space|${today}`)
    .digest("hex")
    .slice(0, 12);
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
