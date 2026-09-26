/**
 * How a paying customer reached the business, read from their own trail.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * A job paid through a hand-made payment link or an invoice has no browser
 * behind it, so the payment can never carry a click id. The chart used to
 * estimate all of that money at one rate: "a third of website buyers came
 * through an ad, so a third of this did". The owner asked for the estimate to
 * be very accurate, and a rate applied to everyone is not.
 *
 * Many of those customers left a trail before they paid: a
 * consultation booked on the site, a contact form, an earlier website order.
 * Each of those rows in the enquiry log records the page they landed on and
 * where they came from. So each payment is matched to its own customer, and
 * the customer's own visits say how they came:
 *
 *   landed on a URL carrying gclid, gbraid, wbraid or gad_source  -> an ad
 *   arrived from another site (organic Google, Bing, ChatGPT, the
 *   Gmail app), a UTM tag that is not paid, or a business card      -> not an ad
 *   a recorded landing page and no referrer, outside the gap below  -> not an ad
 *   nothing usable                                                  -> unknown
 *
 * Run against every payment from April to September 2026 on 22 September:
 * every September payment made by link resolved to a named customer with a
 * readable arrival, and what September left to the estimate was three website
 * sales made during the gap below. Earlier months keep more unknowns, mostly
 * invoices to customers who never used the website's forms.
 *
 * ── WHY A DIRECT VISIT COUNTS AS "NOT AN AD" ─────────────────────
 *
 * The site keeps the first visit's record for 90 days and only replaces it
 * with a later ad click, never with a later ordinary visit. So a record that
 * says "landed on / with no referrer" means this browser had not come from an
 * ad in the 90 days before. A customer who clicked an ad on their phone and
 * later typed the address on a laptop is missed; nothing on the site can see
 * across devices, and that is said in the chart's working rather than guessed.
 *
 * ── THE GAP ──────────────────────────────────────────────────────
 *
 * From 6 September 2026, when the consent gate went in, until the fix on 21
 * September, the site lost most attribution records: the gate read the
 * consent flag in the wrong shape and parked every record on window, where a
 * page load destroyed it (src/lib/attribution.ts has the full account). A
 * record written in that window may be for the second page of an ad visit
 * rather than the first, so a bare landing page from then proves nothing and
 * reads as unknown. A record with an outside referrer is still good: an
 * internal second page would have smart-space.ie as its referrer.
 */

export type Came = "ad" | "not-ad" | "unknown";

export interface Visit {
  /** "yyyy-mm-dd hh:mm", Irish time, the way the enquiry log writes dates. */
  at: string;
  gclid?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  /** The log's source column: "smart-space.ie", "phone_click", "business-card:review"... */
  source?: string;
}

export interface Enquiry extends Visit {
  type: string;
  name: string;
  email: string;
  phone: string;
}

/** Who paid, as Stripe knows them. Any of these can find their enquiries. */
export interface Payer {
  emails: string[];
  phones: string[];
  names: string[];
}

const AD_URL = /[?&](gclid|gbraid|wbraid|gad_source)=/i;
const PAID_MEDIUM = /^(cpc|ppc|paid|paidsearch|paid_search)$/i;

/* The consent gate's broken fortnight. The last fix was pushed on the morning
   of 21 September (Irish afternoon); the whole of that day is treated as
   inside the gap rather than guessing the minute it went live. */
const GAP_FROM = "2026-09-06";
const GAP_TO = "2026-09-22";

const hostOf = (url: string | undefined) => {
  if (!url?.trim()) return "";
  try { return new URL(url).host.toLowerCase(); } catch { return ""; }
};

/** One visit, read on its own. */
export function readVisit(v: Visit): Came {
  if ((v.gclid ?? "").trim() || AD_URL.test(v.landingPage ?? "")) return "ad";
  if (PAID_MEDIUM.test((v.utmMedium ?? "").trim())) return "ad";
  if (/^(business-card|qr)/i.test((v.source ?? "").trim())) return "not-ad";
  if ((v.utmSource ?? "").trim()) return "not-ad";
  const ref = hostOf(v.referrer);
  if (ref && !/(^|\.)smart-space\.ie$/.test(ref)) return "not-ad";
  const inTheGap = v.at >= GAP_FROM && v.at < GAP_TO;
  if ((v.landingPage ?? "").trim() && !inTheGap) return "not-ad";
  return "unknown";
}

/**
 * A customer's visits, read together. One ad click anywhere on the trail is
 * enough: the ads reached this person before they paid, which is the question
 * the chart asks. Otherwise one readable visit that was not an ad settles it.
 */
export function readTrail(visits: Visit[]): Came {
  const read = visits.map(readVisit);
  if (read.includes("ad")) return "ad";
  if (read.includes("not-ad")) return "not-ad";
  return "unknown";
}

const phoneKey = (p: string | null | undefined) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
};
const nameKey = (n: string | null | undefined) => {
  const t = (n ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
  return t.length >= 2 ? `${t[0]} ${t[t.length - 1]}` : "";
};
const emailKey = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();
/* The part before the @, when it is long and personal enough to be one
   person's across providers: alan_dempsey@icloud.com and
   alan_dempsey@hotmail.com paid two jobs a week apart. Short or shared
   mailbox names never match this way. */
const GENERIC_MAILBOX = /^(info|admin|contact|sales|office|hello|accounts|enquiries|reception|support)/;
const localKey = (e: string | null | undefined) => {
  const local = emailKey(e).split("@")[0] ?? "";
  return local.length >= 8 && !GENERIC_MAILBOX.test(local) ? local : "";
};

/** Irish wall-clock time in the log's own format, so the two compare as strings. */
export function dublinStamp(unixSeconds: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(unixSeconds * 1000));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/**
 * Finds a payer's enquiries. Email and phone match outright, and so does a
 * long personal email username at another provider. A name matches
 * only when the log holds one person by that name, so two different Michael
 * Ryans are never joined into one customer.
 */
export class EnquiryIndex {
  private byEmail = new Map<string, Enquiry[]>();
  private byPhone = new Map<string, Enquiry[]>();
  private byLocal = new Map<string, Enquiry[]>();
  private byName = new Map<string, Enquiry[]>();
  private nameOwners = new Map<string, Set<string>>();

  constructor(rows: Enquiry[]) {
    const push = (m: Map<string, Enquiry[]>, k: string, r: Enquiry) => {
      if (!k) return;
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    };
    for (const r of rows) {
      push(this.byEmail, emailKey(r.email), r);
      push(this.byPhone, phoneKey(r.phone), r);
      push(this.byLocal, localKey(r.email), r);
      const n = nameKey(r.name);
      push(this.byName, n, r);
      const owner = emailKey(r.email) || phoneKey(r.phone);
      if (n && owner) {
        const s = this.nameOwners.get(n) ?? new Set<string>();
        s.add(owner);
        this.nameOwners.set(n, s);
      }
    }
  }

  /** The payer's enquiries logged no later than `until`. */
  find(payer: Payer, until: string): Enquiry[] {
    const hits = new Set<Enquiry>();
    const add = (list: Enquiry[] | undefined) => list?.forEach((r) => hits.add(r));
    payer.emails.map(emailKey).forEach((k) => k && add(this.byEmail.get(k)));
    payer.emails.map(localKey).forEach((k) => k && add(this.byLocal.get(k)));
    payer.phones.map(phoneKey).forEach((k) => k && add(this.byPhone.get(k)));
    for (const n of payer.names.map(nameKey)) {
      if (n && (this.nameOwners.get(n)?.size ?? 0) <= 1) add(this.byName.get(n));
    }
    return Array.from(hits).filter((r) => r.at <= until);
  }
}

/** Rows the log holds that are not a customer reaching out. */
const NOT_AN_ENQUIRY = /^(test|booking reminder)$/i;

/**
 * The enquiry log, read the way /admin/leads reads it. Returns null when it
 * cannot be read, so the caller can fall back to the rate for everyone and
 * say so, rather than drawing an empty chart.
 */
export async function fetchEnquiries(): Promise<Enquiry[] | null> {
  const r = await readEnquiries();
  return r.ok ? r.rows : null;
}

/** The same read, saying why when it fails. The health check needs the reason. */
export async function readEnquiries(): Promise<{ ok: true; rows: Enquiry[] } | { ok: false; reason: string }> {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();
  const token = process.env.GOOGLE_SHEET_READ_TOKEN?.trim();
  if (!url || !token) return { ok: false, reason: "GOOGLE_SHEET_WEBHOOK_URL or GOOGLE_SHEET_READ_TOKEN is not set on this deployment." };
  try {
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}&type=All&limit=2000`, {
      cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false, reason: `The enquiry log answered ${res.status}.` };
    const body = (await res.json()) as { rows?: Record<string, unknown>[] };
    if (!Array.isArray(body.rows)) return { ok: false, reason: "The enquiry log answered without any rows in it." };
    const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    return {
      ok: true,
      rows: body.rows
        .filter((r) => !NOT_AN_ENQUIRY.test(s(r.type).trim()))
        .map((r) => ({
          at: s(r.date).slice(0, 16),
          type: s(r.type), name: s(r.name), email: s(r.email), phone: s(r.phone),
          gclid: s(r.gclid), landingPage: s(r.landingPage), referrer: s(r.referrer),
          utmSource: s(r.utmSource), utmMedium: s(r.utmMedium), source: s(r.source),
        })),
    };
  } catch (err) {
    const raw = err instanceof Error ? `${err.name} ${err.message}` : String(err);
    return { ok: false, reason: /abort|timeout/i.test(raw) ? "The enquiry log did not answer within twenty seconds." : `The enquiry log could not be reached (${raw.slice(0, 120)}).` };
  }
}
