/**
 * Business-card QR redirect + scan tracker (INSTALLER cards).
 *
 * The installer business cards are Nigel's contact cards — phone, email,
 * "Smart Security Installation Specialist", "From €139", etc. They have
 * a QR on the back captioned "Scan: Book Installation". Up until now the
 * QR pointed direct to smart-space.ie/services/free-consultation, so we
 * had zero data on how many of the cards Nigel handed out actually
 * resulted in someone reaching for their phone.
 *
 * Same architecture as the sister /r/card endpoint for review cards:
 * customer scans -> /r/install -> log scan -> 302 redirect to the
 * free-consultation booking page. Customer never sees Smart Space, never
 * fills in anything, never waits beyond a sub-second server hop.
 *
 * Logs land in the leads sheet as type="QR Scan", source="business-card:installer"
 * — distinct from /r/card scans (source="business-card:review") so the
 * /admin/leads dashboard can tell them apart.
 *
 * Endpoint contract:
 *   GET /r/install
 *   GET /r/install?s=<storeSlug>     — per-store tracking when the next
 *                                       print run uses one QR per store
 *   GET /r/install?v=<variantSlug>   — per-design tracking (v1/v2/v3/...)
 *
 * Response: 302 redirect to the consultation booking page.
 *
 * Configurable via env: BOOKING_URL (optional). Defaults to
 * https://smart-space.ie/services/free-consultation, matching the
 * destination the installer-card QR has always pointed at.
 */

import { trackQrScan } from "@/lib/qr-scan";

const BOOKING_URL =
  process.env.BOOKING_URL?.trim() ||
  "https://smart-space.ie/services/free-consultation";

// Force dynamic — every scan is a unique event. No CDN/edge caching, ever.
export const dynamic = "force-dynamic";
// Node runtime (not Edge) so Vercel doesn't abandon the logLead fetch
// when the response returns.
export const runtime = "nodejs";

export async function GET(request: Request) {
  return trackQrScan(request, {
    destination: BOOKING_URL,
    source: "business-card:installer",
    noteLabel: "Installer-card QR scan",
  });
}
