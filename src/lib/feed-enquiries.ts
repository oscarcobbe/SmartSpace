/**
 * What the leads feed (/api/admin/leads) says about enquiries beyond the
 * dashboard's own rows.
 *
 * The FourWinds portal's weekly client report counts Smart Space's enquiries
 * from this feed (fourwinds-portal, scripts/client-report.mjs). Until 28
 * September 2026 the feed dropped two things the report needed:
 *
 *   Free consultations. /api/checkout/free and /api/booking each write a
 *   "Free Consultation" row to the leads sheet, dated when the person booked,
 *   and the feed skipped every sheet row that was not a contact enquiry or a
 *   paid order. The same booking reaches the feed only as a Calendly
 *   appointment, dated by the appointment and gone thirty days after it. The
 *   CRM, read on 28 September, held none of the four made since it began on
 *   18 September: /api/checkout/free sent its copy with a bare `void` until
 *   SmartSpace#16 moved it into afterResponse. From 20 to 26 September the
 *   sheet held those four, from three people, and the report read none of
 *   them.
 *
 *   A paid order's click id. /api/checkout writes the gclid into the Stripe
 *   session's metadata, and the Stripe webhook writes the same value into the
 *   order's sheet row. The feed built each order from the Stripe session
 *   without it and then skipped the sheet row as a duplicate, so an order
 *   from an ad reached the report with no click id. Read on 28 September: 17
 *   of the 68 completed sessions carry one in metadata, and 16 of those have
 *   a sheet row carrying the same id.
 *
 *   Which business a checkout belongs to. Smart Space and SmartCare Living
 *   take payment through one Stripe account, and a checkout made from a
 *   payment link has no metadata, so the feed built each one as a paid order
 *   of product "Order" and the report counted SmartCare Living's
 *   SmartGuardian payments as Smart Space enquiries: 18 May, 23 July, and 15
 *   and 22 August. Each paid order now says which business it is, or that the feed
 *   could not tell (checkoutBusiness).
 *
 * Free consultations go in their own list, not in `leads`, because the
 * dashboard already shows each one as its Calendly appointment and a second
 * row per booking would show every consultation twice.
 *
 * The feed also says whether its two capped reads were complete, so a reader
 * can tell an enquiry that is missing from one that never happened.
 *
 * And it gives each enquiry's answer to "How did you find us?" as foundUs,
 * one of the CRM's FOUND_US keys, wherever the site recorded one: the Stripe
 * checkout's metadata for a paid order, the sheet row's Notes for the rest
 * (src/lib/found-us.ts). It is left out when there is no answer.
 */
import { foundUsFrom, foundUsInNotes } from "@/lib/found-us";

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** Sheet rows the feed asks the Apps Script for. */
export const SHEET_LIMIT = 500;

/**
 * The one address the leads sheet is read from, for the first read and its
 * retry alike, so the limit a read asked for is always SHEET_LIMIT and the
 * coverage below is judged against the limit that was sent.
 */
export function sheetReadUrl(base: string, token: string): string {
  return `${base}?token=${encodeURIComponent(token)}&type=All&limit=${SHEET_LIMIT}`;
}

/** Completed checkouts the feed asks Stripe for, newest first. */
export const STRIPE_LIMIT = 100;

/**
 * The Stripe read: completed checkouts with what checkoutBusiness needs, the
 * line items (what was sold) and the payment link a checkout was made from
 * (where it sends the customer afterwards). Stripe allows four levels of
 * expansion and each of these is two.
 */
export const STRIPE_SESSIONS_URL =
  `https://api.stripe.com/v1/checkout/sessions?limit=${STRIPE_LIMIT}&status=complete` +
  "&expand[]=data.custom_fields&expand[]=data.line_items&expand[]=data.payment_link";

/** The two businesses that take payment through the one Stripe account. */
export type Business = "smart-space" | "smartcare-living";

/** Each business's website, the page a paid customer is sent back to. */
const RETURN_HOSTS: Record<string, Business> = {
  "smart-space.ie": "smart-space",
  "smartcareliving.ie": "smartcare-living",
};

/** Every SmartCare Living product is named SmartGuardian. */
const SMARTCARE_NAME = /smartguardian|smartcare/i;

/** The parts of a Stripe checkout session checkoutBusiness reads. */
export interface CheckoutForBusiness {
  success_url?: string | null;
  payment_link?: string | { after_completion?: { redirect?: { url?: string | null } | null } | null } | null;
  line_items?: { data?: { description?: string | null }[] } | null;
}

const hostOf = (url: unknown): string => {
  try {
    return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Which business a Stripe checkout belongs to, or null when the checkout does
 * not say.
 *
 * Two things a checkout says, read independently:
 *
 *   Where it sends the customer once they have paid. A checkout made from a
 *   payment link sends them to the link's redirect, so that is what is read
 *   for one: its own success_url is not to be trusted, and on 28 September
 *   2026 it was Stripe's placeholder, https://stripe.com, on 23 of the 24.
 *   One the site made sends them to its success_url. Each business's links
 *   go to its own site.
 *
 *   What was sold. Every SmartCare Living product is named SmartGuardian.
 *   Smart Space's names (Ring, Eufy, Tapo, deposits and balances, a call-out
 *   fee) have nothing in common, so a name alone never says Smart Space.
 *
 * Read on 28 September 2026, all 68 completed checkouts were named this way
 * and the two agreed on every one: 44 made by the site and 20 payment links
 * go back to smart-space.ie, and the 4 payment links that go back to
 * smartcareliving.ie are the 4 named SmartGuardian (18 May, 23 July, 15 and
 * 22 August). When the two disagree, or neither names a business, this says
 * null rather than choosing, and the reader has to stop.
 */
export function checkoutBusiness(session: CheckoutForBusiness): Business | null {
  const link = session.payment_link;
  const returnTo = link
    ? typeof link === "object" ? link.after_completion?.redirect?.url : undefined
    : session.success_url;
  const byReturn: Business | null = RETURN_HOSTS[hostOf(returnTo)] ?? null;
  const names = (session.line_items?.data ?? []).map((item) => text(item.description)).join(" / ");
  const byName: Business | null = SMARTCARE_NAME.test(names) ? "smartcare-living" : null;
  if (byReturn && byName && byReturn !== byName) return null;
  return byReturn ?? byName;
}

export interface FreeConsultation {
  /** When the person booked, as the sheet wrote it: Dublin time, "yyyy-MM-dd HH:mm". */
  date: string;
  name: string;
  email: string;
  phone: string;
  product: string;
  /** The appointment itself, which is not when the enquiry was made. */
  bookingDate: string;
  bookingSlot: string;
  /** "smart-space.ie" from /api/checkout/free, "smart-space.ie/booking" from /api/booking. */
  source: string;
  /** The Google click id the site held for this visitor, when it held one. */
  gclid?: string;
  /** Their answer to "How did you find us?", when they gave one. */
  foundUs?: string;
}

/**
 * A sheet row as a free consultation, or null when it is not one.
 *
 * Typed by the site as "Free Consultation" and nothing else: a Calendly
 * appointment, a reminder or a newsletter signup is not a booking made on
 * the site.
 */
export function freeConsultationFrom(row: Record<string, unknown>): FreeConsultation | null {
  if (text(row.type) !== "Free Consultation") return null;
  const gclid = text(row.gclid);
  const { foundUs } = foundUsInNotes(row.notes);
  return {
    date: text(row.date) || "-",
    name: text(row.name) || "-",
    email: text(row.email) || "-",
    phone: text(row.phone) || "-",
    product: text(row.product) || "Free Home Consultation",
    bookingDate: text(row.bookingDate) || "-",
    bookingSlot: text(row.bookingSlot) || "-",
    source: text(row.source) || "-",
    ...(gclid ? { gclid } : {}),
    ...(foundUs ? { foundUs } : {}),
  };
}

/**
 * The click id of a Stripe checkout: its own metadata first, which
 * /api/checkout writes, then the sheet row the Stripe webhook wrote for it
 * from that same metadata. The two agreed on all 16 orders that had both on
 * 28 September.
 */
export function checkoutClickId(
  metadata: Record<string, unknown> | null | undefined,
  sheetRow?: Record<string, unknown> | null,
): string {
  return text(metadata?.gclid) || text(sheetRow?.gclid);
}

/**
 * What a Stripe checkout sold, as its line items describe it.
 *
 * The FourWinds report leaves out a customer paying again within 90 days (a
 * deposit's balance, extra work), and it can only tell it is the same
 * customer from what the feed gives. A checkout made from a payment link is
 * built as product "Order" and records no phone (none of the 24 on 28
 * September 2026), so when a balance is paid from another email address than
 * its deposit, as one was on 24 August 2026 against a deposit of 5 August,
 * the only thing that says it is the same job is the link's description,
 * which Nigel writes with the job's total in it.
 */
export function checkoutItems(session: { line_items?: { data?: { description?: string | null }[] } | null }): string[] {
  return (session.line_items?.data ?? []).map((item) => text(item.description)).filter(Boolean);
}

/**
 * A Stripe checkout's answer to "How did you find us?": its own metadata
 * first, which /api/checkout writes, then the Notes of the sheet row the
 * Stripe webhook wrote from that same metadata. "" when neither has one.
 */
export function checkoutFoundUs(
  metadata: Record<string, unknown> | null | undefined,
  sheetRow?: Record<string, unknown> | null,
): string {
  return foundUsFrom(metadata?.found_us) || foundUsInNotes(sheetRow?.notes).foundUs;
}

/**
 * Whether a capped read returned everything its source holds.
 *
 * `complete` is the part that matters. When it is false, rows the source
 * holds were left out, and a reader cannot count from the read without
 * knowing which.
 */
export interface Coverage {
  /** How many rows the read returned. */
  rows: number;
  /** How many it asked for. */
  limit: number;
  complete: boolean;
  /**
   * The oldest row returned, as an ISO instant, for a source that returns its
   * rows newest first; null for one that does not.
   */
  oldest: string | null;
}

/**
 * Stripe's completed checkouts: newest first, and Stripe says whether there
 * are more (has_more), so a full page says how far back it reaches.
 */
export function stripeCoverage(createdSeconds: number[], limit: number, hasMore: unknown): Coverage {
  const rows = createdSeconds.length;
  const oldest = rows ? Math.min(...createdSeconds) : null;
  return {
    rows,
    limit,
    complete: typeof hasMore === "boolean" ? !hasMore : rows < limit,
    oldest: oldest === null ? null : new Date(oldest * 1000).toISOString(),
  };
}

/**
 * The leads sheet. The Apps Script returns its rows bottom first and stops at
 * the limit, and the sheet is not in date order: read on 28 September, its
 * 194 rows were sorted by type, contact enquiries at the top from 5 April to
 * 25 September, with one paid order appended below the rest that day. A read
 * that stops at the limit drops whatever sits at the top, which is the oldest
 * rows only while nobody sorts the sheet. So the read is complete only when it
 * returned fewer rows than it asked for, and no date is given for how far
 * back it reaches. A read that returned no rows is not complete either.
 */
export function sheetCoverage(rows: number, limit: number): Coverage {
  /* A read of no rows is not a complete read of an empty sheet: this sheet
     has held rows since April, and the Apps Script answers a type it does
     not know with 200 and no rows. */
  return { rows, limit, complete: rows > 0 && rows < limit, oldest: null };
}
