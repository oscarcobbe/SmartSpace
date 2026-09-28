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
 *   appointment, dated by the appointment and gone thirty days after it. Its
 *   CRM copy is sent without being awaited, and the CRM, read on 28
 *   September, held none of the four made since it began on 18 September.
 *   From 20 to 26 September the sheet held those four, from three people, and
 *   the report read none of them.
 *
 *   A paid order's click id. /api/checkout writes the gclid into the Stripe
 *   session's metadata, and the Stripe webhook writes the same value into the
 *   order's sheet row. The feed built each order from the Stripe session
 *   without it and then skipped the sheet row as a duplicate, so an order
 *   from an ad reached the report with no click id. Read on 28 September: 17
 *   of the 68 completed sessions carry one in metadata, and 16 of those have
 *   a sheet row carrying the same id.
 *
 * Free consultations go in their own list, not in `leads`, because the
 * dashboard already shows each one as its Calendly appointment and a second
 * row per booking would show every consultation twice.
 *
 * The feed also says whether its two capped reads were complete, so a reader
 * can tell an enquiry that is missing from one that never happened.
 */

/** Sheet rows the feed asks the Apps Script for. */
export const SHEET_LIMIT = 500;

/** Completed checkouts the feed asks Stripe for, newest first. */
export const STRIPE_LIMIT = 100;

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
}

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

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
 * back it reaches.
 */
export function sheetCoverage(rows: number, limit: number): Coverage {
  return { rows, limit, complete: rows < limit, oldest: null };
}
