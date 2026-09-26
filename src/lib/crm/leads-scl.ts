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
  Timestamp?: unknown;
  Source?: unknown;
  Name?: unknown;
  Phone?: unknown;
  Email?: unknown;
  Eircode?: unknown;
  Urgent?: unknown;
  Status?: unknown;
  Message?: unknown;
  Notes?: unknown;
  "Risk Label"?: unknown;
  "Booking Date"?: unknown;
  "Booking Time"?: unknown;
  BookingDate?: unknown;
  BookingTime?: unknown;
  Gclid?: unknown;
  /* unknown, not string. These values come off somebody else's endpoint and
     one of them was a number, which is how three pages died on .trim(). The
     compiler now insists every read goes through clean(). */
  [key: string]: unknown;
}

/*
 * Everything through here is JSON off somebody else's endpoint, so the type
 * above it is a claim rather than a guarantee.
 *
 * It said `string | undefined` and got a number, and "(e ?? \"\").trim is not
 * a function" took out The diary, Orders and Customers on the SmartCare Living
 * side of the CRM. Three pages, dead, for as long as whatever field it was has
 * been coming back unquoted.
 *
 * String() rather than a type guard because there is nothing useful to do with
 * a number here except read it: an amount, an id or a phone number typed
 * without its leading zero are all worth showing.
 */
const clean = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s && s !== "-" ? s : "";
};

/** "18/07/2026, 21:20" in Dublin, matching what the Smart Space feed produces. */
function stamp(value: unknown): string {
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

function dayOnly(value: unknown): string {
  const s = clean(value);
  if (!s) return "-";
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return s;
  return new Date(t).toLocaleDateString("en-GB", { timeZone: "Europe/Dublin" });
}

/** Whether a booking is still ahead. Dates that will not parse are not future. */
function isAhead(value: unknown): boolean {
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

/**
 * How long a read of the sheet may take.
 *
 * Apps Script unloads the container behind the sheet when it is idle and pays
 * most of a minute to start it again: measured 57.4 seconds cold on
 * 22 September, then 2.8 and 2.7. This used to give up at twenty seconds, so
 * the first person to open SmartCare Living's side of the CRM on a cold
 * morning was told the enquiries could not be read, by a sheet that was
 * perfectly healthy and most of the way through waking up. Fifty-five seconds
 * fits inside the sixty the pages declare as their maxDuration.
 */
const SHEET_TIMEOUT_MS = 55_000;

/** What a person should read when the sheet did not answer, in plain words. */
export const SCL_WAKING =
  "SmartCare Living's enquiry sheet did not answer within a minute. The first read of the day wakes it up and can take that long; refresh in a minute and it is usually quick.";

/**
 * Two ways in, and the direct one is preferred.
 *
 *   SCL_SHEETS_URL and SCL_SHEETS_TOKEN: the Apps Script itself, the same GET
 *   smartcareliving.ie's own dashboard makes. One hop.
 *
 *   SCL_DASHBOARD_PASSWORD: smartcareliving.ie/api/dashboard-data, which makes
 *   that same GET on our behalf. Two hops, and the second one gives up at 52
 *   seconds and answers 504 while the sheet is still waking.
 *
 * Both return the sheet's rows unchanged, so everything below is shared.
 */
function sheetRequest(): { url: string; headers: Record<string, string>; via: "sheet" | "dashboard" } | { missing: string } {
  const sheetUrl = process.env.SCL_SHEETS_URL?.trim();
  const sheetToken = process.env.SCL_SHEETS_TOKEN?.trim();
  if (sheetUrl && sheetToken) {
    return {
      url: `${sheetUrl}${sheetUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(sheetToken)}`,
      headers: {},
      via: "sheet",
    };
  }
  const origin = (process.env.SCL_ORIGIN || "https://www.smartcareliving.ie").trim().replace(/\/$/, "");
  const password = process.env.SCL_DASHBOARD_PASSWORD?.trim() || process.env.DASHBOARD_PASSWORD?.trim();
  if (!password) {
    return { missing: "SmartCare Living's enquiries cannot be read: neither SCL_SHEETS_URL and SCL_SHEETS_TOKEN nor SCL_DASHBOARD_PASSWORD is set on this deployment." };
  }
  return { url: `${origin}/api/dashboard-data`, headers: { Authorization: `Bearer ${password}` }, via: "dashboard" };
}

export async function fetchSclLeads(): Promise<LeadsResult> {
  const req = sheetRequest();
  if ("missing" in req) return { ok: false, reason: req.missing };

  try {
    const res = await fetch(req.url, {
      headers: req.headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(SHEET_TIMEOUT_MS),
    });
    if (res.status === 504) return { ok: false, reason: SCL_WAKING };
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason: req.via === "dashboard"
          ? "smartcareliving.ie refused the dashboard password this deployment holds (SCL_DASHBOARD_PASSWORD), so SmartCare Living's enquiries cannot be read."
          : "The enquiry sheet refused the token this deployment holds (SCL_SHEETS_TOKEN).",
      };
    }
    if (!res.ok) return { ok: false, reason: `SmartCare Living's enquiry sheet answered ${res.status}, so the enquiries cannot be shown.` };

    /* Apps Script answers a script error with a 200 and an HTML page, and
       JSON.parse on that reads as "Unexpected token <", which tells nobody
       anything. */
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
      return { ok: false, reason: "SmartCare Living's enquiry sheet answered with a web page instead of its data, which means the Apps Script behind it has an error." };
    }
    const body = (await res.json()) as { rows?: SheetRow[]; error?: string };
    if (body.error) return { ok: false, reason: `SmartCare Living's enquiry sheet said: ${String(body.error).slice(0, 160)}` };
    if (!Array.isArray(body.rows)) return { ok: false, reason: "SmartCare Living's enquiry sheet answered without any rows in it." };

    /* Newest first, the order Orders and the overview both assume. The sheet
       is append-only so it arrives oldest first. */
    const leads = body.rows
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
    const raw = err instanceof Error ? `${err.name} ${err.message}` : String(err);
    if (/abort|timeout/i.test(raw)) return { ok: false, reason: SCL_WAKING };
    return { ok: false, reason: `SmartCare Living's enquiry sheet could not be reached (${raw.slice(0, 120)}).` };
  }
}

/** "18/07/2026, 21:20" back to a number, for sorting only. */
function sortKey(v: string): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2}))?/.exec(v);
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0)) : 0;
}
