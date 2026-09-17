/**
 * The QR code on the van.
 *
 * A van sits in traffic, on a driveway, and outside the house of a neighbour
 * who has been meaning to get a doorbell fitted. The code turns that into a
 * page, and the scan into a number, so "was the signage worth it" stops being
 * a matter of opinion.
 *
 * Unlike the review card, this one sends people to the site rather than to
 * Google: somebody scanning a van has not bought anything yet and has nothing
 * to review. They land on the installation page with the source attached, so
 * anything they go on to do carries it.
 *
 *   GET /r/van                  the van, wherever it is
 *   GET /r/van?s=<reg>          which van, when there is more than one
 *   GET /r/van?v=<placement>    where on it: rear, side, tailgate
 *
 * Node runtime rather than Edge, because Vercel abandons a fire-and-forget
 * write the moment the response returns and that drops about a third of them.
 * The scan is logged before the redirect goes out.
 */

import { trackQrScan } from "@/lib/qr-scan";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://smart-space.ie").trim().replace(/\/$/, "");

/* utm_source rather than a bare query flag, so the visit is attributed in GA4
   the same way every other campaign is and needs no special handling there. */
const DESTINATION =
  `${SITE}/ring-installation?utm_source=van&utm_medium=qr&utm_campaign=van-signage`;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return trackQrScan(request, {
    destination: DESTINATION,
    source: "van",
    noteLabel: "Van QR scan",
  });
}
