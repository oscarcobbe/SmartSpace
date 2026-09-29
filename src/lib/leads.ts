/**
 * Lead tracking, POSTs every booking, order, and enquiry to a Google Apps
 * Script webhook, which appends a row to the "Smart Space Leads" sheet.
 *
 * Requires env var:
 *   GOOGLE_SHEET_WEBHOOK_URL, the deployed Apps Script web-app URL
 * Used when an append ends in doubt, to look for the row before sending it
 * again (the same doGet the /admin/leads dashboard reads):
 *   GOOGLE_SHEET_READ_TOKEN
 *
 * The expected payload shape matches google-apps-script.js (doPost).
 */
import { SHEET_ALERT_TO } from "@/lib/business-constants";

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
  type: "Free Consultation" | "Paid Order" | "Contact Enquiry" | "Newsletter Signup" | "Booking Reminder" | "QR Scan" | "WiFi Check";
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
 * What the site knows about a row it could not confirm:
 *   not-sent     nothing reached the sheet script (no URL configured)
 *   absent       the sheet was read after every append had settled, and the
 *                row is not there
 *   unconfirmed  anything else: the script may still have written it
 */
type SheetDoubt = "not-sent" | "absent" | "unconfirmed";

/**
 * Last-resort alert email when a lead is not confirmed on the sheet. Without
 * this, a failed `logLead` is completely silent: the customer's flow
 * continues, the order or contact succeeds, but the dashboard never shows the
 * lead. It goes to FourWinds only (SHEET_ALERT_TO, Oscar's decision of
 * 27 September 2026); Nigel already has the lead itself.
 */
async function sendLeadLogFailureAlert(record: LeadRecord, reason: string, doubt: SheetDoubt): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return "no alert: mail is not configured";

  /* An append that timed out is not a failed append: the sheet script keeps
     running after the site stops waiting and can still write the row.
     Saying "will NOT show" in that case invites a second copy typed in by
     hand, so the wording follows what is actually known. */
  const headline =
    doubt === "not-sent"
      ? "This lead was not sent to the leads sheet. The customer's flow still completed and Nigel has the lead, but the sheet will not show it unless it is added by hand."
      : doubt === "absent"
        ? "This lead is not on the leads sheet: the sheet was read after every attempt to add it had finished, and the row is not there. The customer's flow still completed and Nigel has the lead. Add it to the sheet by hand."
        : "The leads sheet did not confirm this lead, and the site could not check whether it landed. The customer's flow still completed and Nigel has the lead. Look for it on the sheet before adding it by hand.";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const payloadJson = JSON.stringify(record, null, 2);
    const ESC: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;" };
    const safe = (s: string) => s.replace(/[<>&]/g, (c) => ESC[c] || c);
    const sent = await resend.emails.send({
      from,
      to: [SHEET_ALERT_TO],
      subject: `[ALERT] Lead not confirmed on the sheet, ${record.type} from ${record.name ?? record.email ?? "(unknown)"}`,
      text:
        `${headline}\n\n` +
        `Reason: ${reason}\n\n` +
        `Lead payload (for adding it to the sheet by hand):\n${payloadJson}`,
      html: `
        <h2 style="color:#b91c1c">Lead not confirmed on the sheet</h2>
        <p>${safe(headline)}</p>
        <p><strong>Reason:</strong> ${safe(reason)}</p>
        <p><strong>Most likely causes:</strong> Apps Script cold start or daily quota, deployment URL changed, or Sheet renamed.</p>
        <hr/>
        <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-family:monospace;font-size:12px;white-space:pre-wrap">${safe(payloadJson)}</pre>
      `,
    });
    if (sent.error) {
      console.error("[leads] CRITICAL: lead-log alert email rejected:", JSON.stringify(sent.error));
      return "alert email rejected";
    }
    return "alert email sent";
  } catch (err) {
    // If the alert email itself fails, we've truly run out of channels,
    // so log loudly and it is at least in the Vercel runtime logs.
    console.error("[leads] CRITICAL: lead-log alert email also failed:", err);
    return "alert email failed";
  }
}

export interface LeadLogResult {
  /** True once the sheet script accepted the row or a read-back found it. */
  ok: boolean;
  /** One line for the runtime log: what happened, in words. */
  outcome: string;
}

/**
 * Google documents six minutes as the longest one Apps Script execution may
 * run, so an append that started this long ago has finished one way or the
 * other, and a read-back after it is final. The documented limit plus a
 * margin, not something measured here.
 */
export const SHEET_SETTLE_MS = 6.5 * 60_000;

export interface LeadLogOptions {
  /** Ceiling for the first append. 12 s by default. */
  firstAttemptMs?: number;
  /**
   * How long logLead may keep working on this row, from its start. The
   * default fits a caller that is still waiting on it: the old worst case of
   * a 12 s append, a 1.5 s pause and a 10 s second call. A read-back that
   * cannot be final within the budget ends in the "not confirmed" alert,
   * never in a second append.
   */
  budgetMs?: number;
  /** Clock and sleep; replaced only by scripts/check-sheet-retry.mjs. */
  deps?: { now: () => number; sleep: (ms: number) => Promise<void> };
}

/**
 * For work that runs after the response (src/lib/after-response.ts), where
 * nobody is waiting: room for a cold start inside the first append, and time
 * for an append that ended in doubt to settle before the sheet is read for
 * the last time and, only if the row is absent, sent once more. The routes
 * that use it declare maxDuration = 600.
 */
export const SHEET_BACKGROUND: Readonly<Required<Pick<LeadLogOptions, "firstAttemptMs" | "budgetMs">>> = {
  firstAttemptMs: 30_000,
  budgetMs: 8 * 60_000,
};

const DEFAULT_FIRST_ATTEMPT_MS = 12_000;
const DEFAULT_BUDGET_MS = 24_000;
/** The second append, and every read-back, as the old retry had it. */
const SECOND_CALL_MS = 10_000;
/** The old warm-up pause, then longer gaps while an append settles. */
const LOOK_PAUSES_MS = [1_500, 30_000, 60_000, 120_000];

const realDeps = {
  now: () => Date.now(),
  sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
};

/**
 * The sheet script dedupes a repeated payload only when its orderId is a
 * Stripe checkout session id (google-apps-script.js doPost: an orderId
 * matching /^cs_(live|test)_/ that is already in the Order ID column answers
 * deduped:true and appends nothing). Every other record is appended
 * unconditionally, so for those a second send after an unanswered first one
 * can write the row twice.
 */
const scriptDedupes = (record: LeadRecord): boolean =>
  !!record.orderId && /^cs_(live|test)_/.test(record.orderId);

/** The Date column as doPost writes it: Dublin wall time, "yyyy-MM-dd HH:mm". */
function dublinMinute(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
/* The sheet turns "0871234567" into the number 871234567: of the newest 30
   rows read on 27 September 2026, 9 of the 11 with a phone came back as a
   number and 2 as text. So phones compare on their last nine digits. */
const phoneKey = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-9);

/**
 * Ask the sheet whether a row we sent is there, through the same doGet the
 * admin dashboard reads (GOOGLE_SHEET_READ_TOKEN). A match is the same type,
 * the same Dublin minute as the payload's timestamp (doPost writes the Date
 * column from that timestamp, and every attempt for one lead sends the same
 * one), and the same email and name wherever the record has them, and the
 * same phone wherever both the record and the sheet still hold one (the
 * notes, when none of those can be compared). The Date column does come back
 * as the Dublin minute: on 27 September 2026 the four most recent paid
 * orders' Date cells matched their CRM arrival times to the minute.
 *
 * Every row of the type is read, not only the last few: the sheet is not kept
 * in date order (it has been re-sorted by hand), so "newest first" from doGet
 * means "lowest on the sheet", and a row can move after it is appended.
 *
 * "unknown" whenever the answer cannot be trusted either way: no token, a
 * failed or slow read, an unexpected body, or nothing to match on.
 */
async function rowInSheet(
  url: string,
  record: LeadRecord,
  timestamp: string,
  timeoutMs: number,
): Promise<{ state: "present" } | { state: "absent" } | { state: "unknown"; why: string }> {
  const token = process.env.GOOGLE_SHEET_READ_TOKEN?.trim();
  if (!token) return { state: "unknown", why: "GOOGLE_SHEET_READ_TOKEN is not set" };
  const email = norm(record.email);
  const phone = phoneKey(record.phone);
  const name = norm(record.name);
  const notes = String(record.notes ?? "").trim();
  if (!email && !phone && !name && !notes) return { state: "unknown", why: "the record has nothing to match on" };
  try {
    const res = await fetch(
      `${url}?token=${encodeURIComponent(token)}&type=${encodeURIComponent(record.type)}&limit=1000`,
      { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(timeoutMs) },
    );
    if (!res.ok) return { state: "unknown", why: `the read returned HTTP ${res.status}` };
    const body = (await res.json().catch(() => null)) as { rows?: Array<Record<string, unknown>> } | null;
    if (!body || !Array.isArray(body.rows)) return { state: "unknown", why: "the read did not return rows" };
    const minute = dublinMinute(timestamp);
    const found = body.rows.some((r) => {
      if (String(r.type ?? "") !== record.type || String(r.date ?? "") !== minute) return false;
      if (email && norm(r.email) !== email) return false;
      if (name && norm(r.name) !== name) return false;
      /* Sheets reads a cell that starts with "+" as a formula, so a phone
         typed as "+353 87 123 4567" can land as a formula error with no digits
         in it. Phones are compared only when both sides still hold one;
         otherwise a row that matches on email or name would read as absent,
         and the retry after it would write the lead a second time. */
      const sheetPhone = phoneKey(r.phone);
      const phonesComparable = phone.length >= 7 && sheetPhone.length >= 7;
      if (phonesComparable && sheetPhone !== phone) return false;
      if (email || name || phonesComparable) return true;
      return !!notes && String(r.notes ?? "").trim() === notes;
    });
    return found ? { state: "present" } : { state: "absent" };
  } catch (err) {
    return { state: "unknown", why: `the read failed: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}` };
  }
}

/**
 * Log a lead/order via the Apps Script webhook.
 *
 * Internally swallows all errors (logs to console and emails FourWinds an
 * alert when the row is not confirmed) so callers can safely `await` it
 * without a try/catch; the user flow will not break if the Apps Script is
 * slow or down. Awaiting matters: in Vercel serverless functions, a
 * fire-and-forget fetch can be abandoned once the response returns. A route
 * that must not make its visitor wait runs this through afterResponse
 * (src/lib/after-response.ts) with SHEET_BACKGROUND, which waits on it with
 * waitUntil instead.
 *
 * Retry: at most once, and only after the first append timed out, as before.
 * A timeout is ambiguous, because the script keeps running after the site
 * stops listening and can still append the row. When read on 27 September
 * 2026 the sheet held five pairs of identical same-minute rows, which is what
 * a blind retry produces, though nobody can now say each pair came from it.
 * So:
 *   - a Stripe order id is sent again after the old 1.5 s pause, because the
 *     script skips an order id it already has;
 *   - anything else is looked for on the sheet first, and sent again only
 *     when the read-back shows it absent after SHEET_SETTLE_MS, when the
 *     first append can no longer be running. If that point is past the
 *     budget, or the sheet cannot be read, there is no second append and the
 *     alert says the row may be there.
 * Other failures (an HTTP error status, a refused connection) are not sent
 * again, as before.
 *
 * Resolves with what happened; never throws.
 */
export async function logLead(record: LeadRecord, opts: LeadLogOptions = {}): Promise<LeadLogResult> {
  const deps = opts.deps ?? realDeps;
  const deadline = deps.now() + (opts.budgetMs ?? DEFAULT_BUDGET_MS);

  // .trim() defends against trailing-newline contamination of the env var
  // (the same class of bug as the GADS_CALL_LABEL post-mortem), without
  // it, a copy-paste newline in Vercel would 404 the Apps Script endpoint
  // and every lead would silently fail to log.
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn("[leads] GOOGLE_SHEET_WEBHOOK_URL not set, skipping lead log");
    const alert = await sendLeadLogFailureAlert(record, "GOOGLE_SHEET_WEBHOOK_URL env var not set", "not-sent");
    return { ok: false, outcome: `not sent to the sheet: GOOGLE_SHEET_WEBHOOK_URL is not set (${alert})` };
  }

  // Flatten attribution fields onto the top-level payload so the Apps Script
  // can map each into its own column. gclid remains a top-level key for
  // backwards compatibility with the older script that only knew about it.
  // The timestamp is fixed here, so every attempt for this lead sends the
  // same one and lands in the same Date cell.
  const { attribution, ...rest } = record;
  const payload = {
    ...rest,
    timestamp: new Date(deps.now()).toISOString(),
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

  // One append with a hard timeout. Apps Script cold-start runs can
  // routinely take 8-12s; the previous 8s timeout was clipping every
  // first-of-the-day write, hence 12s by default and 30s in the background.
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
          reason: `Apps Script returned HTTP ${res.status} ${res.statusText}, ${respBody.slice(0, 200)}`,
        };
      }
      return { ok: true };
    } catch (err) {
      const reason =
        err instanceof Error
          ? `${err.name}: ${err.message}` +
            (err.name === "AbortError" ? ` (Apps Script took >${timeoutMs / 1000}s, likely cold start or quota issue)` : "")
          : String(err);
      return { ok: false, reason };
    } finally {
      clearTimeout(timeoutId);
    }
  }
  const timedOut = (r: { ok: false; reason: string }) => r.reason.startsWith("AbortError");

  const giveUp = async (reason: string, doubt: SheetDoubt): Promise<LeadLogResult> => {
    console.error(`[leads] ${record.type} not confirmed on the sheet (${doubt}):`, reason);
    const alert = await sendLeadLogFailureAlert(record, reason, doubt);
    const said = doubt === "absent" ? "not on the sheet" : "not confirmed on the sheet, it may have landed";
    return { ok: false, outcome: `${said}: ${reason} (${alert})` };
  };

  let appendStarted = deps.now();
  const first = await attempt(opts.firstAttemptMs ?? DEFAULT_FIRST_ATTEMPT_MS);
  if (first.ok) return { ok: true, outcome: "the sheet script accepted the row" };
  if (!timedOut(first)) return giveUp(first.reason, "unconfirmed");

  if (scriptDedupes(record)) {
    // The script skips an order id it already has, so a second send cannot
    // write this row twice. Pause so the script has time to warm up.
    console.warn("[leads] first append timed out; sending again after 1.5s, the sheet script skips a repeated Stripe order id");
    await deps.sleep(1_500);
    const second = await attempt(SECOND_CALL_MS);
    if (second.ok) return { ok: true, outcome: "the sheet script accepted the row on the second call (it skips a repeated order id)" };
    return giveUp(second.reason, "unconfirmed");
  }

  // Anything else: the first append may still write the row. Look before
  // sending anything again.
  let reason = first.reason;
  let sentAgain = false;
  for (let looks = 0; ; looks++) {
    const settledAt = appendStarted + SHEET_SETTLE_MS;
    const pause = LOOK_PAUSES_MS[Math.min(looks, LOOK_PAUSES_MS.length - 1)];
    // Look after the usual pause, but no later than the moment the append
    // has settled, when the answer becomes final.
    const wait = Math.max(1_000, Math.min(pause, settledAt - deps.now()));
    if (deps.now() + wait + SECOND_CALL_MS > deadline) {
      return giveUp(`${reason}; not confirmed within this call's ${Math.round((opts.budgetMs ?? DEFAULT_BUDGET_MS) / 1000)} s, so not sent again`, "unconfirmed");
    }
    await deps.sleep(wait);
    const seen = await rowInSheet(url, record, payload.timestamp, SECOND_CALL_MS);
    if (seen.state === "present") {
      return {
        ok: true,
        outcome: sentAgain
          ? "the read-back found the row after the second append"
          : "the append timed out, and the read-back found the row, so it was not sent again",
      };
    }
    if (seen.state === "unknown") {
      // No read, no second append: a blind one is the duplicate this avoids.
      reason = `${first.reason}; the sheet could not be read back (${seen.why})`;
      continue;
    }
    if (deps.now() < settledAt) continue; // absent for now, but the append may still be running
    if (sentAgain) return giveUp(`${reason}; the read-back still does not show the row after the second append settled`, "absent");

    // Absent, and the first append has certainly finished: the one retry.
    if (deps.now() + SECOND_CALL_MS > deadline) return giveUp(`${reason}; the row is absent but there is no time left to send it again`, "absent");
    console.warn("[leads] first append settled and the row is not on the sheet; sending it once more");
    sentAgain = true;
    appendStarted = deps.now();
    const second = await attempt(SECOND_CALL_MS);
    if (second.ok) return { ok: true, outcome: "the sheet script accepted the row on the second append, after the read-back showed the first had not landed" };
    reason = second.reason;
    if (!timedOut(second)) return giveUp(reason, "unconfirmed");
    looks = -1; // the second append ended in doubt too: look again from the start
  }
}
