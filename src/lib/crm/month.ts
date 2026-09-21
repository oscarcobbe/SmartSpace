/**
 * The month a row belongs to.
 *
 * Finance charts money by month and Orders lists the rows behind it, and this
 * is the only thing joining the two.
 *
 * It does no parsing of its own, on purpose. The orders feed puts three
 * different date shapes into one field: Stripe writes "18/09/2026, 14:32",
 * sheet-backed rows carry whatever was stored (ISO, in practice), and Calendly
 * rows are built with toLocaleString and arrive as "Thu, 17 Sep, 15:00" with
 * no year at all. booking-date.ts already resolves all three, including the
 * missing year, and says in its own header that a second parser elsewhere
 * would eventually disagree with it.
 *
 * It was right. The first version of this file read only "dd/mm/yyyy", so
 * every contact enquiry, consultation and installation fell out of the month
 * filter while the banner above the table confidently printed a row count. The
 * page looked correct because the rows had been dropped, not because the month
 * was quiet, which is the same failure the week view had before booking-date
 * existed.
 */
import { bookingIso } from "./booking-date";

/** "2026-09", the key Stripe's month buckets already use. */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** The month a row's date falls in, or null when it carries no date at all. */
export function monthOf(date: unknown, now: Date = new Date()): string | null {
  const iso = bookingIso(typeof date === "string" ? date : null, now);
  return iso ? iso.slice(0, 7) : null;
}

/** "2026-09" to "September 2026", for saying out loud which month is showing. */
export function monthLabel(key: string): string {
  if (!isMonthKey(key)) return key;
  const [y, mo] = key.split("-").map(Number);
  /* Europe/Dublin like every other date in the CRM. It cannot move this one:
     Ireland is never behind UTC, so midday UTC on the first of a month is
     still that month in Dublin, in summer time and out of it. */
  return new Date(Date.UTC(y, mo - 1, 1, 12)).toLocaleDateString("en-IE", {
    timeZone: "Europe/Dublin", month: "long", year: "numeric",
  });
}
