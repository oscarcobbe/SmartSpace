/**
 * The booking engine: free slots, booking, cancelling and moving a booking,
 * all on Nigel's Google Calendar. It does what Calendly did for both sites
 * (Smart Space and SmartCare Living) and nothing more:
 *
 *   - The same slots Calendly offered: 2-hour visits starting 10:00, 12:30 and
 *     15:00 Dublin time, Monday to Friday (each Calendly event type's schedule
 *     on 1 Oct 2026). Each site narrows that further itself, as it did before
 *     (Smart Space drops Fridays, both have blackout ranges and lead times).
 *   - A slot is free when nothing on the blocking calendars overlaps it,
 *     which is the conflict check Calendly ran against the same calendar.
 *   - One booking per slot, across both sites. The event id is derived from
 *     the slot, so two bookings racing for it cannot both be written: Google
 *     refuses the second insert with 409.
 *
 * A booking is the calendar event. Its details live in the event's private
 * extended properties (ssbooking=1 marks ours), so there is no other table to
 * keep in step, and Nigel sees and can move it like any event.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  busyBetween,
  CalendarError,
  deleteEvent,
  findByProperty,
  getEvent,
  insertEvent,
  listEvents,
  replaceEvent,
  type CalendarEvent,
} from "./google-calendar";

export type BookingSite = "ss" | "scl";
export type BookingKind = "consultation" | "installation";

/** Start times, Dublin, and the length of every visit. Calendly's schedule for all four visit types. */
export const SLOT_STARTS = ["10:00", "12:30", "15:00"] as const;
export const SLOT_MINUTES = 120;
/** Monday to Friday (Date.getUTCDay of the Dublin date). */
export const WORKING_DAYS = [1, 2, 3, 4, 5];
/** Calendly's default minimum notice; both sites ask for days, so this only guards a crafted request. */
const MIN_NOTICE_MS = 4 * 3600_000;

export interface Booking {
  /** Google event id. Changes when the booking is moved; `ref` does not. */
  id: string;
  ref: string;
  site: BookingSite;
  kind: BookingKind;
  /** The visit's name as Nigel sees it in his calendar, e.g. "Smart Space Installation". */
  title: string;
  start: string;
  end: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  eircode?: string;
  product?: string;
  orderId?: string;
  notes?: string;
}

export interface BookInput {
  site: BookingSite;
  kind: BookingKind;
  /** YYYY-MM-DD, Dublin. */
  date: string;
  /** HH:MM, Dublin; one of SLOT_STARTS. */
  start: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  eircode?: string;
  product?: string;
  orderId?: string;
  notes?: string;
  /** Keeps a moved booking's reference, so the links already emailed still work. */
  ref?: string;
}

export type BookResult = { ok: true; booking: Booking } | { ok: false; reason: "taken" | "invalid" | "error"; message: string };

// ─── Time ───────────────────────────────────────────────────────────

/** Minutes Dublin is ahead of UTC on a date, read at noon to stay clear of the clock change. */
function dublinOffsetMinutes(dateStr: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(`${dateStr}T12:00:00Z`));
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return (h - 12) * 60 + m;
}

/** A Dublin wall-clock time on a date, as epoch milliseconds. */
export function dublinToEpoch(dateStr: string, hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const [y, mo, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  return Date.UTC(y, mo - 1, d, h, m) - dublinOffsetMinutes(dateStr) * 60_000;
}

/** The Dublin date and HH:MM of an instant. */
export function dublinParts(iso: string | number): { date: string; time: string } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "00";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}` };
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));
const weekday = (dateStr: string) => new Date(`${dateStr}T12:00:00Z`).getUTCDay();

/**
 * The event id for a slot. Google ids are base32hex (0-9, a-v), so the slot is
 * written as digits after a fixed "ssb", then a generation digit:
 * ssb2026100510000 is 5 Oct 2026 at 10:00 Dublin. Same slot, same id,
 * whichever site books it. The generation only moves on when Nigel has dragged
 * the event holding an id to another time, leaving the id with no slot.
 */
export function slotEventId(dateStr: string, hhmm: string, generation = 0): string {
  const digits = (x: string) => x.split(/\D/).join("");
  return `ssb${digits(dateStr)}${digits(hhmm)}${generation}`;
}
const GENERATIONS = 10;

// ─── Links ──────────────────────────────────────────────────────────

function linkSecret(): string {
  const s = process.env.BOOKING_LINK_SECRET;
  if (!s || s.length < 16) throw new Error("BOOKING_LINK_SECRET is not set (16+ characters)");
  return s;
}

/** The token in a customer's reschedule and cancel links. Proves they got the confirmation email. */
export function manageToken(ref: string): string {
  return createHmac("sha256", linkSecret()).update(`booking:${ref}`).digest("hex").slice(0, 32);
}

export function tokenMatches(ref: string, token: string | null | undefined): boolean {
  if (!token || !/^[0-9a-f]{32}$/.test(token)) return false;
  const a = Buffer.from(manageToken(ref));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Where the customer reschedules or cancels. SmartCare Living's /booking is served from here behind its own address. */
export function manageUrl(b: Pick<Booking, "ref" | "site">, action?: "cancel" | "reschedule"): string {
  const base = b.site === "scl" ? "https://www.smartcareliving.ie" : "https://smart-space.ie";
  const q = new URLSearchParams({ t: manageToken(b.ref) });
  if (action) q.set("do", action);
  return `${base}/booking/${b.ref}?${q}`;
}

// ─── Reading ────────────────────────────────────────────────────────

const TITLES: Record<BookingSite, Record<BookingKind, string>> = {
  ss: { consultation: "SmartSpace Consultation", installation: "Smart Space Installation" },
  scl: { consultation: "SmartCare Living - Complimentary Consultation", installation: "SmartCare Living - Installation" },
};

export function bookingTitle(site: BookingSite, kind: BookingKind): string {
  return TITLES[site][kind];
}

function fromEvent(e: CalendarEvent): Booking | null {
  const p = e.extendedProperties?.private;
  if (!p || p.ssbooking !== "1" || !e.start?.dateTime || !e.end?.dateTime) return null;
  const site: BookingSite = p.site === "scl" ? "scl" : "ss";
  const kind: BookingKind = p.kind === "consultation" ? "consultation" : "installation";
  return {
    id: e.id,
    ref: p.ref,
    site,
    kind,
    title: bookingTitle(site, kind),
    start: new Date(e.start.dateTime).toISOString(),
    end: new Date(e.end.dateTime).toISOString(),
    name: p.name || "",
    email: p.email || "",
    phone: p.phone || undefined,
    address: p.address || undefined,
    eircode: p.eircode || undefined,
    product: p.product || undefined,
    orderId: p.orderId || undefined,
    notes: p.notes || undefined,
  };
}

/** Active bookings starting in [startIso, endIso), soonest first. */
export async function bookingsBetween(startIso: string, endIso: string): Promise<Booking[]> {
  const events = await listEvents({ timeMin: startIso, timeMax: endIso, privateProperty: "ssbooking=1" });
  return events
    .filter((e) => e.status !== "cancelled")
    .map(fromEvent)
    .filter((b): b is Booking => !!b && Date.parse(b.start) >= Date.parse(startIso) && Date.parse(b.start) < Date.parse(endIso))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** Every live event under a reference, most recently written first. Normally one; two only after a move whose clean-up failed. */
async function liveEventsByRef(ref: string): Promise<CalendarEvent[]> {
  if (!/^[0-9a-z]{6,40}$/.test(ref)) return [];
  const events = await findByProperty(`ref=${ref}`);
  const stamp = (e: CalendarEvent) => Date.parse(e.updated || e.created || "") || 0;
  return events.filter((e) => e.status !== "cancelled" && fromEvent(e)).sort((a, b) => stamp(b) - stamp(a));
}

/** The live booking behind a reference, or null when it was cancelled or never existed. */
export async function bookingByRef(ref: string): Promise<Booking | null> {
  const [latest] = await liveEventsByRef(ref);
  return latest ? fromEvent(latest) : null;
}

// ─── Free slots ─────────────────────────────────────────────────────

/** The start times (HH:MM, Dublin) still free on a date. Throws when the calendar cannot be read. */
export async function freeStarts(dateStr: string, now = Date.now()): Promise<string[]> {
  if (!isDate(dateStr) || !WORKING_DAYS.includes(weekday(dateStr))) return [];
  const candidates = SLOT_STARTS.map((s) => ({ s, from: dublinToEpoch(dateStr, s) }))
    .map((c) => ({ ...c, to: c.from + SLOT_MINUTES * 60_000 }))
    .filter((c) => c.from - now >= MIN_NOTICE_MS);
  if (!candidates.length) return [];
  const busy = await busyBetween(
    new Date(candidates[0].from).toISOString(),
    new Date(candidates[candidates.length - 1].to).toISOString(),
  );
  return candidates.filter((c) => !busy.some((b) => b.start < c.to && b.end > c.from)).map((c) => c.s);
}

// ─── Booking ────────────────────────────────────────────────────────

const clip = (s: string | undefined, n = 900) => (s ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

function eventFor(input: BookInput, id: string, ref: string, startMs: number): CalendarEvent {
  const title = bookingTitle(input.site, input.kind);
  const booking = { ref, site: input.site };
  const lines = [
    `Customer: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : "",
    input.address ? `Address: ${input.address}` : "",
    input.eircode ? `Eircode: ${input.eircode}` : "",
    input.product ? `Product: ${input.product}` : "",
    input.orderId ? `Order: ${input.orderId}` : "",
    input.notes ? `\nNotes: ${input.notes}` : "",
    `\nBooked on ${input.site === "scl" ? "smartcareliving.ie" : "smart-space.ie"}. Moving or cancelling it here does not tell the customer; use the customer's link instead:`,
    manageUrl(booking),
  ].filter(Boolean);
  return {
    id,
    summary: `${title}: ${input.name}`,
    description: lines.join("\n"),
    location: input.address ? `Customer's home, ${input.address}` : "Customer's home",
    start: { dateTime: new Date(startMs).toISOString(), timeZone: "Europe/Dublin" },
    end: { dateTime: new Date(startMs + SLOT_MINUTES * 60_000).toISOString(), timeZone: "Europe/Dublin" },
    extendedProperties: {
      private: {
        ssbooking: "1",
        ref,
        site: input.site,
        kind: input.kind,
        name: clip(input.name, 200),
        email: clip(input.email, 200),
        phone: clip(input.phone, 40),
        address: clip(input.address, 400),
        eircode: clip(input.eircode, 12),
        product: clip(input.product, 200),
        orderId: clip(input.orderId, 120),
        notes: clip(input.notes),
      },
    },
  };
}

/**
 * Books a slot. Re-checks the calendar first, so a slot taken since the
 * customer saw it is refused rather than double-booked.
 */
export async function book(input: BookInput, now = Date.now()): Promise<BookResult> {
  if (!isDate(input.date) || !(SLOT_STARTS as readonly string[]).includes(input.start) || !WORKING_DAYS.includes(weekday(input.date))) {
    return { ok: false, reason: "invalid", message: `Not a bookable slot: ${input.date} ${input.start}` };
  }
  if (!input.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email || "")) {
    return { ok: false, reason: "invalid", message: "A booking needs a name and an email address" };
  }
  const startMs = dublinToEpoch(input.date, input.start);
  if (startMs - now < MIN_NOTICE_MS) return { ok: false, reason: "invalid", message: "That slot is too soon to book" };

  try {
    const free = await freeStarts(input.date, now);
    if (!free.includes(input.start)) return { ok: false, reason: "taken", message: "That slot is no longer free" };

    const ref = input.ref || randomBytes(9).toString("hex");
    const taken: BookResult = { ok: false, reason: "taken", message: "That slot was booked a moment ago" };
    let saved: CalendarEvent | null = null;
    // Ours: the event under this id carries this booking's reference. After a
    // timeout or a retried request, Google may have written it even though
    // the answer never arrived, so every unclear outcome is settled by looking.
    const ours = (e: CalendarEvent | null): boolean =>
      !!e && e.status !== "cancelled" && e.extendedProperties?.private?.ref === ref;
    for (let gen = 0; gen < GENERATIONS && !saved; gen++) {
      const event = eventFor(input, slotEventId(input.date, input.start, gen), ref, startMs);
      try {
        saved = await insertEvent(event);
        break;
      } catch (e) {
        if (!(e instanceof CalendarError && e.status === 409)) {
          const landed = await getEvent(event.id).catch(() => null);
          if (landed && ours(landed)) {
            saved = landed;
            break;
          }
          throw e;
        }
      }
      // The id is in use. Our own earlier attempt means we are done. A live
      // booking still in this slot means the slot is gone. A cancelled one is
      // taken back, only if nobody else does so first. One Nigel moved
      // elsewhere leaves the id stranded: try the next.
      const existing = await getEvent(event.id);
      if (!existing) return taken;
      if (ours(existing)) {
        saved = existing;
        break;
      }
      if (existing.status === "cancelled") {
        if (!existing.etag) return taken;
        try {
          saved = await replaceEvent({ ...event, status: "confirmed" }, existing.etag);
        } catch (e) {
          const now2 = await getEvent(event.id).catch(() => null);
          if (now2 && ours(now2)) {
            saved = now2;
            break;
          }
          if (e instanceof CalendarError && e.status === 412) return taken;
          throw e;
        }
      } else if (existing.start?.dateTime && Date.parse(existing.start.dateTime) === startMs) {
        return taken;
      }
    }
    if (!saved) return taken;
    const booking = fromEvent(saved);
    if (!booking) throw new Error("Google returned the booking without its details");
    return { ok: true, booking };
  } catch (e) {
    console.error("[booking] book failed:", e);
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** Cancels the live booking behind `ref`, and any copy a failed move left behind. Returns what was cancelled, or null when there was nothing to cancel. */
export async function cancel(ref: string): Promise<Booking | null> {
  const live = await liveEventsByRef(ref);
  if (!live.length) return null;
  for (const e of live) await deleteEvent(e.id);
  return fromEvent(live[0]);
}

/**
 * Moves a booking to a new slot: books the new one under the same reference,
 * then cancels the old one, so there is never a moment with neither.
 */
export async function reschedule(ref: string, date: string, start: string, now = Date.now()): Promise<{ ok: true; from: Booking; booking: Booking; leftover?: string } | { ok: false; reason: "missing" | "taken" | "invalid" | "error"; message: string }> {
  let from: Booking | null;
  try {
    from = await bookingByRef(ref);
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : String(e) };
  }
  if (!from) return { ok: false, reason: "missing", message: "No booking to move" };
  const result = await book({ ...from, date, start, ref }, now);
  if (!result.ok) return result;
  // The new slot is held. Releasing the old one is retried; if Google still
  // will not, the move stands (the customer has their new time) and the old
  // event is reported so a person can delete it. bookingByRef already prefers
  // the newer event, and cancel() removes both.
  try {
    await deleteEvent(from.id);
  } catch (e) {
    console.error(`[booking] moved ${ref} but could not release ${from.id}:`, e);
    return { ok: true, from, booking: result.booking, leftover: from.id };
  }
  return { ok: true, from, booking: result.booking };
}
