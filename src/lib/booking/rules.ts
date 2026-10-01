/**
 * The booking rules every page and route shares: the three slots, the days
 * customers may book, blackout ranges and the lead time. Pure, so the date
 * picker in the browser can import it without pulling in the server side of
 * booking (src/lib/calendly.ts, src/lib/booking).
 */

// Time slots available for booking (Dublin time)
export const TIME_SLOTS = [
  { label: "10:00 – 12:00", value: "10:00-12:00", startHour: 10, startMin: 0, endHour: 12, endMin: 0 },
  { label: "12:30 – 14:30", value: "12:30-14:30", startHour: 12, startMin: 30, endHour: 14, endMin: 30 },
  { label: "15:00 – 17:00", value: "15:00-17:00", startHour: 15, startMin: 0, endHour: 17, endMin: 0 },
];

// Available booking days: Monday (1) through Thursday (4). Friday was
// removed sitewide on 2026-06-02, internal-use day for stock prep,
// admin, and route batching; not offered to customers.
export const AVAILABLE_DAYS = [1, 2, 3, 4];

/**
 * Sitewide calendar blackout ranges (inclusive, YYYY-MM-DD, Dublin dates).
 * No bookings of ANY kind (consultation or installation) are offered on
 * these dates, regardless of what Calendly reports as available. Used by
 * the booking calendar UI, the availability API, and booking creation, so
 * a blocked date can't be reached from the UI or by a crafted request.
 *
 * To lift a block, delete its entry. To add a holiday/close-down, add a
 * range. Ranges are inclusive of both start and end.
 */
export interface BlockedDateRange {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, inclusive
  reason: string;
}
export const BLOCKED_DATE_RANGES: BlockedDateRange[] = [
  // Added 2026-06-17: full close-down, no bookings 9–20 July 2026 inclusive.
  { start: "2026-07-09", end: "2026-07-20", reason: "Closed 9-20 July 2026" },
];

/**
 * Is this date inside any sitewide blackout range? Accepts a YYYY-MM-DD
 * string (as the API passes) or a Date (as the client calendar passes,
 * compared by its local Y/M/D so it matches the displayed day). ISO date
 * strings compare correctly with >=/<= because the format is lexicographic.
 */
export function isDateBlocked(date: string | Date): boolean {
  let iso: string;
  if (typeof date === "string") {
    iso = date.slice(0, 10);
  } else {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    iso = `${y}-${m}-${d}`;
  }
  return BLOCKED_DATE_RANGES.some((r) => iso >= r.start && iso <= r.end);
}

/**
 * Earliest bookable date = today + N working days, counted Mon-Fri.
 *
 * Note: this function counts Mon-Fri because that's the standard
 * "working day" semantic. The customer-facing calendar then further
 * filters to AVAILABLE_DAYS (Mon-Thu only since Friday was blocked
 * sitewide on 2026-06-02). So if this function returns a Friday, the
 * calendar will skip to the following Monday, the floor date never
 * lands on a Friday slot.
 *
 * Default 4 matches the BookingCalendar default, appropriate for any
 * flow that involves stock (product purchase + install). Installation-
 * only and free consultation flows pass 2 explicitly because no stock
 * is sourced for those visits.
 *
 * Previously this function added calendar days, which under-counted any
 * lead time that straddled a weekend. Switched to working-day counting
 * on 2026-06-02 so the gate matches the copy claim ("X working days").
 */
export function getEarliestBookableDate(leadDays = 4): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  let counted = 0;
  while (counted < leadDays) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) counted++;
  }
  return date;
}
