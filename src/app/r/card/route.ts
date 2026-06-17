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
 *     to Google immediately. Customer UX is unchanged, one extra ~300ms
 *     server hop they will not notice.
 *
 * Endpoint contract:
 *   GET /r/card
 *   GET /r/card?s=<storeSlug>    , per-store tracking when the next
 *                                     print run uses one QR per store
 *                                     (e.g. /r/card?s=tesco-blanch)
 *   GET /r/card?v=<variantSlug>  , per-design tracking (v1/v2/v3)
 *
 * Response: 302 redirect to the Google review form.
 *
 * REDIRECT-CHAIN FIX (2026-06-17): the destination used to be the short
 * link https://g.page/r/CRIzJuevqw9YEAE/review, which itself 302s twice
 * (adds a trailing slash, then forwards to search.google.com). That made
 * the scan chain 3 hops: /r/card -> g.page -> g.page/ -> writereview.
 * On iOS Safari / in-app QR browsers (low redirect caps + "Prevent
 * Cross-Site Tracking" triggering Google's consent bounce) the extra hops
 * tipped over into ERR_TOO_MANY_REDIRECTS. We now point straight at the
 * resolved review form, so the chain is a single hop: /r/card -> 302 ->
 * search.google.com/local/writereview (HTTP 200, zero further redirects).
 *
 * IMPORTANT, already-distributed cards (the original 34) point straight
 * to the OLD g.page link, so they still take the long chain; this fix
 * only helps cards printed from the current files. Nothing changes the
 * QR target itself (still smart-space.ie/r/card), so scan tracking and
 * the existing printed PNGs stay valid.
 *
 * Sister endpoint: /r/install handles the installer business cards.
 * Both share the trackQrScan helper in src/lib/qr-scan.ts.
 */

import { trackQrScan } from "@/lib/qr-scan";

// Direct Google review form for the GBP place ID (resolved from the old
// g.page short link). Returns HTTP 200 with no further redirects, so the
// scan lands in one hop. If GBP_REVIEW_URL is set in Vercel it overrides
// this, make sure that env (if used) is the search.google.com form, NOT
// the g.page short link, or the 3-hop chain comes back.
const GOOGLE_REVIEW_URL =
  process.env.GBP_REVIEW_URL?.trim() ||
  "https://search.google.com/local/writereview?placeid=ChIJh1_MIU27Z0gREjMm56-rD1g";

// Force dynamic, every scan is a unique event. No CDN/edge caching, ever.
export const dynamic = "force-dynamic";
// Node runtime (not Edge) so Vercel doesn't abandon the logLead fetch
// when the response returns, fire-and-forget lambdas drop ~30% of writes
// per the existing leads.ts post-mortem.
export const runtime = "nodejs";

export async function GET(request: Request) {
  return trackQrScan(request, {
    destination: GOOGLE_REVIEW_URL,
    source: "business-card:review",
    noteLabel: "Review-card QR scan",
  });
}
