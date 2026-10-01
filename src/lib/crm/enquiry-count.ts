/**
 * Enquiries from ads, counted from the business's own record, once each.
 *
 * ── WHY NOT GOOGLE'S FIGURE ──────────────────────────────────────
 *
 * The page used to print Google's conversions as "Enquiries". For Smart Space
 * that was 48 over twelve months, of which 13 were card payments, 22 were
 * calls and one was SmartCare Living's quiz action. For SmartCare Living it
 * was 2 where its own sheet held 7 enquiries from ad clicks (1 October 2026).
 * Google sees a website enquiry only from a visitor who accepted cookies, and
 * most do not answer the banner, so its count is a floor, never the figure.
 *
 * ── THE RULE ─────────────────────────────────────────────────────
 *
 * The same rule as the FourWinds portal's weekly report
 * (scripts/lib/ad-enquiries.mjs), in the part that can be read from here:
 *
 *   an enquiry is a contact form, a free consultation, a quiz or callback, or
 *   a website order that is not a repeat payment by the same person within
 *   ninety days;
 *   one person on one Dublin day is one enquiry, however many forms;
 *   it came from a Google ad when anything on its trail carries a Google
 *   click (how-they-came.ts), and from a ChatGPT ad when it carries ?oppref=;
 *   left out: taps on the phone number (a tap is not a call), paid orders
 *   typed into the sheet by hand, the other business's checkouts, anything
 *   marked Spam, and the team's own tests.
 *
 * The report also leaves out senders on its list of sales pitches. That list
 * names people, and this repository is public, so it stays in the portal.
 *
 * Calls straight from the ad's call button never touch the website. Google's
 * record of them is the only one, and the reader adds them as their own line.
 *
 * Pure, with no server-only import, so scripts/check-enquiry-count.mjs can run
 * it on rows made up for the purpose.
 */
import { gclidOf, readTrail, type Came, type Enquiry } from "./how-they-came";
import { SCL_PATTERN } from "./payment-names";

export type EnquirySite = "smart-space" | "smartcareliving";

export interface CountedEnquiry {
  /** yyyy-mm-dd, Dublin. */
  day: string;
  /** "yyyy-mm-dd hh:mm", Dublin, of the first record. */
  at: string;
  kind: string;
  came: Came;
  /** The Google click on its trail, for finding the keyword. */
  gclid: string | null;
}

const REPEAT_DAYS = 90;
const TEAM = /@(smart-space\.ie|fourwindsdigital\.com|smartcareliving\.ie)$/i;
const EXAMPLE = /@example\.(com|org|net)$/i;

const emailKey = (e: string | undefined) => {
  const s = String(e ?? "").trim().replace(/^'/, "").toLowerCase();
  return s.includes("@") ? s : "";
};
const phoneKey = (p: string | undefined) => {
  const d = String(p ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
};

/** Why a row is not an enquiry, or "" when it is one. */
export function notAnEnquiry(r: Enquiry, site: EnquirySite): string {
  if (/spam/i.test(r.status ?? "")) return "marked spam";
  const email = emailKey(r.email);
  if (EXAMPLE.test(email)) return "a test submission";
  if (TEAM.test(email)) return "the team's own test";
  if (/\btest\b/i.test(r.name ?? "")) return "a test submission";
  if (site === "smartcareliving") return "";

  const type = (r.type ?? "").trim();
  if (type === "Contact Enquiry") {
    const id = (r.orderId ?? "").trim();
    if (r.source === "phone_click" || id === "phone_click" || /^Phone tap on /.test(id)) return "a tap on the phone number";
    return "";
  }
  if (type === "Free Consultation") return "";
  if (type === "Paid Order") {
    if (!/^cs_live_/.test((r.orderId ?? "").trim())) return "a paid order typed in by hand";
    if (SCL_PATTERN.test(r.product ?? "")) return "the other business's checkout";
    return "";
  }
  return `a ${type || "row"} row`;
}

const dayMs = (at: string) => Date.parse(`${at.slice(0, 10)}T12:00:00Z`);

/**
 * The rows, as enquiries: grouped by person and day, with repeat payments
 * left out, each with how it came.
 */
export function countEnquiries(rows: Enquiry[], site: EnquirySite): CountedEnquiry[] {
  const kept = rows
    .filter((r) => r.at && !notAnEnquiry(r, site))
    .sort((a, b) => a.at.localeCompare(b.at));

  /* A website order by somebody who paid in the ninety days before is the
     same customer paying again: a balance, extra work. Only an order can be
     a repeat. */
  const lastPaid = new Map<string, number>();
  const fresh: Enquiry[] = [];
  for (const r of kept) {
    const keys = [emailKey(r.email), phoneKey(r.phone)].filter(Boolean);
    if (r.type === "Paid Order") {
      const t = dayMs(r.at);
      const repeat = keys.some((k) => { const p = lastPaid.get(k); return p !== undefined && t - p <= REPEAT_DAYS * 86_400_000; });
      keys.forEach((k) => lastPaid.set(k, t));
      if (repeat) continue;
    }
    fresh.push(r);
  }

  /* One person on one Dublin day is one enquiry. */
  const groups = new Map<string, Enquiry[]>();
  const owner = new Map<string, string>();
  fresh.forEach((r, i) => {
    const day = r.at.slice(0, 10);
    const keys = [emailKey(r.email), phoneKey(r.phone)].filter(Boolean).map((k) => `${day}|${k}`);
    const known = keys.map((k) => owner.get(k)).find(Boolean);
    const id = known ?? `${day}|#${i}`;
    keys.forEach((k) => owner.set(k, id));
    groups.set(id, [...(groups.get(id) ?? []), r]);
  });

  return Array.from(groups.values()).map((g) => ({
    day: g[0]!.at.slice(0, 10),
    at: g[0]!.at,
    kind: g[0]!.type,
    came: readTrail(g, site),
    gclid: gclidOf(g),
  }));
}
