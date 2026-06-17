/**
 * QR scan tracker, receives a sendBeacon ping from the QrScanTracker
 * client component on the landing page and logs a single "QR Scan" row
 * to the leads sheet.
 *
 * Why this exists (vs the /r/* redirect endpoints used for the review
 * card): the installer business card QR points DIRECTLY at the
 * installation-only landing page. There is no Smart Space intermediate
 * URL, customer sees the real page URL in their QR preview and lands
 * on the real page when they tap. To count scans we hook the landing
 * itself, not a redirect.
 *
 * Endpoint contract:
 *   POST /api/track/qr-scan
 *   Body: { source: string, page?: string }
 *   Returns: 204 (no body), designed to be ignored by the client because
 *           it sends via navigator.sendBeacon and isn't waiting for a reply.
 *
 * Designed to NEVER throw. The customer's page render does not depend
 * on this endpoint succeeding.
 */

import { NextResponse } from "next/server";
import { logLead } from "@/lib/leads";

// Force dynamic, every scan is a unique event. No caching, ever.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface QrScanBody {
  source?: string;
  page?: string;
}

export async function POST(request: Request) {
  let body: QrScanBody = {};
  try {
    // sendBeacon sends Blob with text/plain by default; JSON.parse handles
    // both that and a normal application/json POST.
    const raw = await request.text();
    if (raw) body = JSON.parse(raw) as QrScanBody;
  } catch (parseErr) {
    // sendBeacon failures land here. Don't 4xx, the customer's page
    // has already rendered. Just log and move on.
    console.warn("[qr-scan] body parse failed:", parseErr);
  }

  const source = (body.source || "unknown-qr").trim();
  const page = (body.page || "/").trim();

  try {
    await logLead({
      type: "QR Scan",
      source,
      notes: `QR scan landed on ${page}`,
    });
  } catch (err) {
    // logLead swallows errors internally, but belt-and-braces.
    console.error("[qr-scan] lead log threw (should not happen):", err);
  }

  // 204 No Content, sendBeacon doesn't read the response. Cache-Control:
  // no-store stops CDNs from collapsing repeated calls into one (every
  // scan is a real event).
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// Reject GETs cleanly, this endpoint is POST-only.
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed, POST /api/track/qr-scan with JSON body" },
    { status: 405 }
  );
}
