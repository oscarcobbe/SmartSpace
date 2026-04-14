/**
 * Lead tracking — logs every booking, order, and enquiry to Google Sheets.
 *
 * Requires env var: GOOGLE_SHEET_WEBHOOK_URL
 * (A Google Apps Script web app URL that appends rows to a spreadsheet)
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

/** Log a lead/order to Google Sheets. Fire-and-forget — never blocks checkout. */
export async function logLead(record: LeadRecord): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[leads] GOOGLE_SHEET_WEBHOOK_URL not set — skipping lead log");
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...record,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    // Never let tracking failures break the user flow
    console.error("[leads] Failed to log lead:", err);
  }
}
