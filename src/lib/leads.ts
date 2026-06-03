/**
 * Lead tracking — POSTs every booking, order, and enquiry to a Google Apps
 * Script webhook, which appends a row to the "Smart Space Leads" sheet.
 *
 * Requires env var:
 *   GOOGLE_SHEET_WEBHOOK_URL — the deployed Apps Script web-app URL
 *
 * The expected payload shape matches google-apps-script.js (doPost).
 */
import { alertTo } from "@/lib/business-constants";

export interface AttributionRecord {
  gclid?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface LeadRecord {
  type: "Free Consultation" | "Paid Order" | "Contact Enquiry" | "Newsletter Signup" | "Booking Reminder";
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  product?: string;
  amount?: number;
  currency?: string;
  bookingDate?: string;
  bookingSlot?: string;
  orderId?: string;
  source?: string;
  notes?: string;
  attribution?: AttributionRecord;
}

/**
 * Last-resort alert email when the Apps Script Sheet write fails. Without
 * this, a failed `logLead` is completely silent — the customer's flow
 * continues, the order/contact succeeds, but Nigel's dashboard never
 * shows the lead. Resend is also our only push channel, so this stops
 * "lead vanished entirely" from being possible.
 */
async function sendLeadLogFailureAlert(record: LeadRecord, reason: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = alertTo();
  if (!apiKey || !from) return; // can't alert if mail isn't wired up

  // Best-effort. We don't await chain into the caller's flow — the customer
  // already got their success page; this is purely Nigel-facing.
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const payloadJson = JSON.stringify(record, null, 2);
    await resend.emails.send({
      from,
      to: [to],
      subject: `[ALERT] Lead-log write failed — ${record.type} from ${record.name ?? record.email ?? "(unknown)"}`,
      text:
        `The Sheet write FAILED. The customer's flow still completed — they got their confirmation — but the dashboard will NOT show this lead unless you add it manually.\n\n` +
        `Reason: ${reason}\n\n` +
        `Lead payload (paste this into the Sheet by hand if needed):\n${payloadJson}`,
      html: `
        <h2 style="color:#b91c1c">⚠️ Lead-log write failed</h2>
        <p>The customer's flow still completed — they got their confirmation — but the dashboard will NOT show this lead unless you add it manually.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Most likely causes:</strong> Apps Script daily quota exceeded, deployment URL changed, or Sheet renamed.</p>
        <hr/>
        <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-family:monospace;font-size:12px;white-space:pre-wrap">${payloadJson.replace(/[<>&]/g, (c) => ({"<":"&lt;",">":"&gt;","&":"&amp;"}[c] || c))}</pre>
      `,
    });
  } catch (err) {
    // If the alert email itself fails, we've truly run out of channels
    // — log loudly so it's at least in Vercel runtime logs.
    console.error("[leads] CRITICAL: lead-log alert email also failed:", err);
  }
}

/**
 * Log a lead/order via the Apps Script webhook.
 *
 * Internally swallows all errors (logs to console + emails Nigel an alert
 * on failure) so callers can safely `await` it without a try/catch — the
 * user flow will not break if the Apps Script is slow or down. Awaiting
 * matters: in Vercel serverless functions, fire-and-forget fetches are
 * abandoned when the response returns, which silently drops ~30% of
 * contact-form rows.
 */
export async function logLead(record: LeadRecord): Promise<void> {
  // .trim() defends against trailing-newline contamination of the env var
  // (the same class of bug as the GADS_CALL_LABEL post-mortem) — without
  // it, a copy-paste newline in Vercel would 404 the Apps Script endpoint
  // and every lead would silently fail to log.
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn("[leads] GOOGLE_SHEET_WEBHOOK_URL not set — skipping lead log");
    await sendLeadLogFailureAlert(record, "GOOGLE_SHEET_WEBHOOK_URL env var not set");
    return;
  }

  // Flatten attribution fields onto the top-level payload so the Apps Script
  // can map each into its own column. gclid remains a top-level key for
  // backwards compatibility with the older script that only knew about it.
  const { attribution, ...rest } = record;
  const payload = {
    ...rest,
    timestamp: new Date().toISOString(),
    gclid: attribution?.gclid ?? undefined,
    landingPage: attribution?.landingPage,
    referrer: attribution?.referrer,
    utmSource: attribution?.utmSource,
    utmMedium: attribution?.utmMedium,
    utmCampaign: attribution?.utmCampaign,
    utmContent: attribution?.utmContent,
    utmTerm: attribution?.utmTerm,
  };
  const bodyString = JSON.stringify(payload);

  // Single fetch attempt with a hard timeout. Apps Script cold-start runs
  // can routinely take 8–12s; the previous 8s timeout was clipping every
  // first-of-the-day write. Bumped to 12s here. The Stripe webhook (the
  // hottest caller of logLead) is allowed up to 30s by Stripe so this fits.
  async function attempt(timeoutMs: number): Promise<{ ok: true } | { ok: false; reason: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyString,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        const respBody = await res.text().catch(() => "");
        return {
          ok: false,
          reason: `Apps Script returned HTTP ${res.status} ${res.statusText} — ${respBody.slice(0, 200)}`,
        };
      }
      return { ok: true };
    } catch (err) {
      const reason =
        err instanceof Error
          ? `${err.name}: ${err.message}` +
            (err.name === "AbortError" ? ` (Apps Script took >${timeoutMs / 1000}s — likely cold start or quota issue)` : "")
          : String(err);
      return { ok: false, reason };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Attempt 1 — typical request, 12s ceiling.
  let result = await attempt(12000);

  // Retry once on cold-start aborts. By the second attempt the Apps Script
  // instance is warm so the second call usually finishes in <1s. Add a short
  // delay before retrying so the Apps Script side has time to fully warm up.
  if (!result.ok && result.reason.startsWith("AbortError")) {
    console.warn("[leads] first attempt timed out — retrying after 1.5s warm-up wait");
    await new Promise((r) => setTimeout(r, 1500));
    result = await attempt(10000);
  }

  if (!result.ok) {
    console.error("[leads] Failed to log lead:", result.reason);
    await sendLeadLogFailureAlert(record, result.reason);
  }
}
