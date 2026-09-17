/**
 * When is this order actually booked for?
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────
 *
 * /api/admin/leads pushes Stripe orders and Calendly appointments as separate
 * rows, because they are separate things upstream. An order only carries a
 * booking of its own when the slot was chosen during checkout, or when Nigel
 * set one by hand. Anybody who paid first and booked afterwards leaves a paid
 * order reading "-" and a Calendly row somewhere else in the same list, and
 * the Orders table showed the dash: three of the payments on screen said
 * nothing about when the van is due.
 *
 * A dash is also doing two jobs there, which is the worse half of the problem.
 * "Nobody has booked this yet" and "the booking is on another row" look
 * identical, and only one of them is something to act on.
 *
 * So the booking is carried across to the order by person, and an order with
 * genuinely no appointment anywhere says so in words.
 */
import { bookingIso } from "./booking-date";
import type { Lead } from "./leads";

/** Lowercased email. */
const emailKey = (v: string | undefined) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s && s !== "-" ? s : null;
};

/**
 * Last nine digits, so 0871234567, +353871234567 and 087 123 4567 are one
 * person. The same rule people.ts uses, because two identity rules that drift
 * apart is how a customer becomes two customers.
 */
const phoneKey = (v: string | undefined) => {
  const digits = String(v ?? "").replace(/[^\d]/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
};

export interface OrderBooking {
  /** The day, as yyyy-mm-dd. */
  iso: string;
  /** What to print: the row's own words, not a re-formatted date. */
  label: string;
  slot: string;
  /** True when this came from another row rather than the order itself. */
  borrowed: boolean;
}

/**
 * A booking for each lead that has none of its own, taken from another row
 * belonging to the same person.
 *
 * Keyed by the row object itself rather than by its index, because the table
 * filters and sorts before it renders: an index into the feed would point at
 * a different customer by the time it was read.
 */
export function joinBookings(rows: Lead[], now: Date = new Date()): Map<Lead, OrderBooking> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);

  /* Every row that names a real appointment, indexed by person. */
  const byPerson = new Map<string, OrderBooking[]>();
  for (const r of rows) {
    const iso = bookingIso(r.bookingDate, now);
    if (!iso) continue;
    const entry: OrderBooking = {
      iso,
      label: String(r.bookingDate ?? "").trim(),
      slot: String(r.bookingSlot ?? "").trim(),
      borrowed: true,
    };
    for (const k of [emailKey(r.email), phoneKey(r.phone)]) {
      if (!k) continue;
      const list = byPerson.get(k) ?? [];
      list.push(entry);
      byPerson.set(k, list);
    }
  }

  const out = new Map<Lead, OrderBooking>();
  rows.forEach((r) => {
    if (bookingIso(r.bookingDate, now)) return; // it has its own
    const found: OrderBooking[] = [];
    for (const k of [emailKey(r.email), phoneKey(r.phone)]) {
      if (k) found.push(...(byPerson.get(k) ?? []));
    }
    if (!found.length) return;

    /*
     * The next one that has not happened yet, because the question the table
     * is being asked is "when is the van due". Only when everything is in the
     * past does the most recent one answer it, and it answers a different
     * question -- "when did we go" -- so the caller is told which it got.
     */
    const ahead = found.filter((b) => b.iso >= today).sort((a, b) => a.iso.localeCompare(b.iso));
    const behind = found.filter((b) => b.iso < today).sort((a, b) => b.iso.localeCompare(a.iso));
    const pick = ahead[0] ?? behind[0];
    if (pick) out.set(r, pick);
  });
  return out;
}
