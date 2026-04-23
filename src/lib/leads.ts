/**
 * Lead tracking — POSTs every booking, order, and enquiry to a Google Apps
 * Script webhook, which appends a row to the "Smart Space Leads" sheet.
 *
 * Requires env var:
 *   GOOGLE_SHEET_WEBHOOK_URL — the deployed Apps Script web-app URL
 *
 * The expected payload shape matches google-apps-script.js (doPost).
 */

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
  type: "Free Consultation" | "Paid Order" | "Contact Enquiry" | "Newsletter Signup";
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

/** Log a lead/order via the Apps Script webhook. Fire-and-forget — never blocks the user flow. */
export async function logLead(record: LeadRecord): Promise<void> {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!url) {
    console.warn("[leads] GOOGLE_SHEET_WEBHOOK_URL not set — skipping lead log");
    return;
  }

  try {
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

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[leads] webhook responded ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    // Never let tracking failures break the user flow
    console.error("[leads] Failed to log lead:", err);
  }
}
