/**
 * Business-card QR redirect + scan tracker (REVIEW cards).
 *
 * Background: 34 printed Smart Space "leave us a review" cards were
 * handed to stores. The customer scans the QR on the back of the card
 * and we want to know how many people actually scanned (and from where,
 * on which device, on which day) so Nigel can judge whether the card
 * distribution was worth the print run.
 *
 * Why a redirect endpoint instead of pointing the QR directly at the
 * Google review URL:
 *   - The Google review URL hands the customer straight to Google.
 *     Smart Space sees zero data.
 *   - Routing through smart-space.ie/r/card means we own the first hop:
 *     we log the scan to the existing Apps Script leads sheet, then 302
 *     to Google immediately. Customer UX is unchanged — one extra ~300ms
 *     server hop they will not notice.
 *
 * Endpoint contract:
 *   GET /r/card
 *   GET /r/card?s=<storeSlug>      — per-store tracking when the next
 *                                     print run uses one QR per store
 *                                     (e.g. /r/card?s=tesco-blanch)
 *   GET /r/card?v=<variantSlug>    — per-design tracking (v1/v2/v3)
 *
 * Response: 302 redirect to the Google Business Profile review URL.
 *
 * IMPORTANT — already-distributed cards (the original 34) point straight
 * to Google. Those scans are NOT tracked retroactively. Only cards
 * printed from PDFs regenerated AFTER 2026-06-05 route through here.
 *
 * Sister endpoint: /r/install handles the installer business cards.
 * Both share the trackQrScan helper in src/lib/qr-scan.ts.
 */

import { trackQrScan } from "@/lib/qr-scan";

const GOOGLE_REVIEW_URL =
  process.env.GBP_REVIEW_URL?.trim() ||
  "https://g.page/r/CRIzJuevqw9YEAE/review";

// Force dynamic — every scan is a unique event. No CDN/edge caching, ever.
export const dynamic = "force-dynamic";
// Node runtime (not Edge) so Vercel doesn't abandon the logLead fetch
// when the response returns — fire-and-forget lambdas drop ~30% of writes
// per the existing leads.ts post-mortem.
export const runtime = "nodejs";

export async function GET(request: Request) {
  return trackQrScan(request, {
    destination: GOOGLE_REVIEW_URL,
    source: "business-card:review",
    noteLabel: "Review-card QR scan",
  });
}
