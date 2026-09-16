/**
 * SmartCare Living's orders, from the sheet its site already writes to.
 *
 * Smart Space reconciles Stripe, Calendly and a sheet behind
 * /api/admin/leads. SmartCare Living has no such endpoint: its enquiries land
 * in a Google Sheet through an Apps Script, and api/dashboard-data.js is what
 * reads them back. Rather than a second reconciler, this maps those rows onto
 * the same Lead shape the CRM already renders, so Orders, Customers and the
 * overview work on both sites without knowing which one they are showing.
 *
 * The password is sent server to server and never reaches the browser, which
 * is why this is only ever called from a server component.
 */
import type { Lead, LeadsPayload, LeadsResult, QA } from "./leads";

/** The columns the Apps Script writes. Anything absent is simply absent. */
interface SheetRow {
  Timestamp?: string;
  Source?: string;
  Name?: string;
  Phone?: string;
  Email?: string;
  Eircode?: string;
  Urgent?: string;
  Status?: string;
  Message?: string;
  Notes?: string;
  "Risk Label"?: string;
  "Booking Date"?: string;
  "Booking Time"?: string;
  BookingDate?: string;
  BookingTime?: string;
  Gclid?: string;
  [key: string]: string | undefined;
}

const clean = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return s && s !== "-" ? s : "";
};

/** "18/07/2026, 21:20" in Dublin, matching what the Smart Space feed produces. */
function stamp(value: string | undefined): string {
  const s = clean(value);
  if (!s) return "-";
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return s;
  return new Date(t).toLocaleString("en-GB", {
    timeZone: "Europe/Dublin",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function dayOnly(value: string | undefined): string {
  const s = clean(value);
  if (!s) return "-";
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return s;
  return new Date(t).toLocaleDateString("en-GB", { timeZone: "Europe/Dublin" });
}

/** Whether a booking is still ahead. Dates that will not parse are not future. */
function isAhead(value: string | undefined): boolean {
  const t = Date.parse(clean(value));
  return Number.isFinite(t) && t > Date.now();
}

const SOURCE_LABEL: Record<string, string> = {
  quiz: "Quiz",
  contact: "Contact form",
  "contact-form": "Contact form",
  callback: "Callback request",
  "urgent-callback": "Urgent callback",
  booking: "Consultation booking",
  "book-consultation": "Consultation booking",
  "book-installation": "Installation booking",
};

const label = (source: string) => {
  const key = source.toLowerCase().replace(/-internal$/, "");
  return SOURCE_LABEL[key] ?? key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
};

function toLead(row: SheetRow): Lead {
  const source = clean(row.Source);
  const bookingDate = clean(row["Booking Date"] ?? row.BookingDate);
  const bookingTime = clean(row["Booking Time"] ?? row.BookingTime);
  const urgent = clean(row.Urgent).toUpperCase() === "Y";

  /* The sheet has no concept of a paid order, because SmartCare Living sells a
     subscription that lives in Stripe rather than a job that is invoiced here.
     Everything in this sheet is therefore an enquiry or a booking. */
  const type: Lead["type"] = bookingDate ? "Consultation" : "Contact Enquiry";

  const details: QA[] = [];
  const message = clean(row.Message);
  if (message) details.push({ question: "What they said", answer: message });
  const notes = clean(row.Notes);
  if (notes) details.push({ question: "Where they came from", answer: notes });
  const risk = clean(row["Risk Label"]);
  if (risk) details.push({ question: "Flagged as", answer: risk });
  if (clean(row.Gclid)) details.push({ question: "Source", answer: "Clicked a Google ad" });

  return {
    date: stamp(row.Timestamp),
    type,
    name: clean(row.Name) || "-",
    email: clean(row.Email) || "-",
    phone: clean(row.Phone) || "-",
    address: clean(row.Eircode) || "-",
    product: source ? label(source) : "-",
    amount: "-",
    bookingDate: bookingDate ? dayOnly(bookingDate) : "-",
    bookingSlot: bookingTime || "-",
    /* Urgent is the one thing on this sheet that changes what Nigel does next,
       so it survives into the status rather than staying a hidden column. */
    status: urgent ? "Urgent" : clean(row.Status) || "New",
    upcoming: isAhead(bookingDate),
    orderId: "-",
    details: details.length ? details : undefined,
  };
}

export async function fetchSclLeads(): Promise<LeadsResult> {
  const origin = (process.env.SCL_ORIGIN || "https://www.smartcareliving.ie").trim().replace(/\/$/, "");
  const password = process.env.SCL_DASHBOARD_PASSWORD?.trim() || process.env.DASHBOARD_PASSWORD?.trim();
  if (!password) {
    return { ok: false, reason: "SCL_DASHBOARD_PASSWORD is not set on this deployment." };
  }

  try {
    const res = await fetch(`${origin}/api/dashboard-data`, {
      headers: { Authorization: `Bearer ${password}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false, reason: `The enquiries feed answered ${res.status}.` };

    const body = (await res.json()) as { rows?: SheetRow[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];

    /* Newest first, the order Orders and the overview both assume. The sheet
       is append-only so it arrives oldest first. */
    const leads = rows
      .filter((r) => clean(r.Name) || clean(r.Email) || clean(r.Phone))
      .map(toLead)
      .sort((a, b) => sortKey(b.date) - sortKey(a.date));

    const payload: LeadsPayload = {
      leads,
      count: leads.length,
      generated: new Date().toISOString(),
    };
    return { ok: true, data: payload };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "The enquiries feed could not be reached." };
  }
}

/** "18/07/2026, 21:20" back to a number, for sorting only. */
function sortKey(v: string): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2}))?/.exec(v);
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0)) : 0;
}
