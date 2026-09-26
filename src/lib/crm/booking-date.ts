/**
 * One parser for every shape a booking date arrives in.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * Bookings reach the CRM from three places and each writes the date its own
 * way. Stripe checkout metadata carries an ISO date. The manual Paid Order
 * sheet carries dd/mm/yyyy. Calendly rows are built with toLocaleString and
 * arrive as "Thu, 17 Sep, 15:00", with no year at all.
 *
 * The week view had its own parser that handled the first two and returned
 * null for the third, so every Calendly consultation and installation was
 * dropped from "This week" without anything saying so: the page looked calm
 * because the rows had been filtered out, not because the diary was empty.
 * A third parser somewhere else would eventually disagree with both, so there
 * is one, here, and the callers share it.
 *
 * ── THE MISSING YEAR ─────────────────────────────────────────────
 *
 * "17 Sep" is ambiguous and the feed's window straddles New Year: Calendly is
 * read from thirty days back to sixty days ahead. Guessing the current year
 * puts a 2 January booking eleven months in the past when it is read on 28
 * December. So the year that places the date nearest to today wins, which is
 * right for every date inside a window far narrower than six months.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * The calendar day a booking falls on, as yyyy-mm-dd, or null when the value
 * carries no date at all ("-", "", "Complimentary").
 */
export function bookingIso(raw: string | undefined | null, now: Date = new Date()): string | null {
  const s = String(raw ?? "").trim();
  if (!s || s === "-" || s === "\u2013") return null;

  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));

  /* "Thu, 17 Sep, 15:00", "17 Sep", "Thu 17 Sep 15:00 – 17:00". The weekday is
     optional and ignored: it is decoration, and trusting it would mean
     rejecting a row Calendly wrote correctly if the year guess disagreed. */
  m = /(?:^|[\s,])(\d{1,2})\s+([A-Za-z]{3})/.exec(s);
  if (m) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    if (!month || day < 1 || day > 31) return null;
    const year = nearestYear(month, day, now);
    return iso(year, month, day);
  }
  return null;
}

/** The year, of the three around today, that puts month/day closest to it. */
function nearestYear(month: number, day: number, now: Date): number {
  const here = now.getFullYear();
  let best = here;
  let bestGap = Infinity;
  for (const y of [here - 1, here, here + 1]) {
    const gap = Math.abs(Date.UTC(y, month - 1, day) - now.getTime());
    if (gap < bestGap) { bestGap = gap; best = y; }
  }
  return best;
}

/** Whether this value names a real booking rather than a dash. */
export const hasBooking = (raw: string | undefined | null) => bookingIso(raw) !== null;
