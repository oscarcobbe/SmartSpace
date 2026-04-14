/**
 * Lead tracking — logs every booking, order, and enquiry to Google Sheets.
 *
 * Requires env vars:
 *   GOOGLE_SHEET_ID           — the spreadsheet ID from the URL
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL — service account email
 *   GOOGLE_SERVICE_ACCOUNT_KEY   — private key (with \n line breaks)
 */

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

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
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

  if (!sheetId || !clientEmail || !privateKey) {
    console.warn("[leads] Google Sheets not configured — skipping lead log");
    return;
  }

  try {
    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle["Leads"];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: "Leads",
        headerValues: [
          "Date", "Type", "Name", "Email", "Phone", "Address",
          "Product", "Amount", "Currency", "Booking Date", "Booking Slot",
          "Order ID", "Source", "Notes", "Status", "GCLID",
        ],
      });
    }

    const now = new Date();
    const dublinDate = now.toLocaleString("en-GB", {
      timeZone: "Europe/Dublin",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });

    await sheet.addRow({
      Date: dublinDate,
      Type: record.type,
      Name: record.name || "",
      Email: record.email || "",
      Phone: record.phone || "",
      Address: record.address || "",
      Product: record.product || "",
      Amount: record.amount !== undefined ? record.amount : "",
      Currency: record.currency || "",
      "Booking Date": record.bookingDate || "",
      "Booking Slot": record.bookingSlot || "",
      "Order ID": record.orderId || "",
      Source: record.source || "",
      Notes: record.notes || "",
      Status: "New",
      GCLID: record.gclid || "",
    });
  } catch (err) {
    // Never let tracking failures break the user flow
    console.error("[leads] Failed to log lead:", err);
  }
}
