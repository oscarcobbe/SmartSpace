/**
 * Lead tracking — POSTs every booking, order, and enquiry to a Google Apps
 * Script webhook, which appends a row to the "Smart Space Leads" sheet.
 *
 * Requires env var:
 *   GOOGLE_SHEET_WEBHOOK_URL — the deployed Apps Script web-app URL
 *
 * The expected payload shape matches google-apps-script.js (doPost).
 */

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
  gclid?: string;
  source?: string;
  notes?: string;
}

/** Log a lead/order via the Apps Script webhook. Fire-and-forget — never blocks the user flow. */
export async function logLead(record: LeadRecord): Promise<void> {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!url) {
    console.warn("[leads] GOOGLE_SHEET_WEBHOOK_URL not set — skipping lead log");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...record, timestamp: new Date().toISOString() }),
      // Apps Script web apps don't do CORS; keep the request simple
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
