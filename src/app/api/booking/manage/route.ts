/**
 * The customer's own reschedule and cancel, from the links in their booking
 * confirmation: what Calendly's links did.
 *
 *   POST { ref, t, action: "cancel" }
 *   POST { ref, t, action: "reschedule", date: "YYYY-MM-DD", timeSlot: "10:00-12:00" }
 *
 * The token in the link is the only key (src/lib/booking/engine.ts,
 * manageToken), so a link that was never emailed opens nothing. Smart Space
 * bookings only: SmartCare Living's pages go through its own site.
 */
import { NextResponse } from "next/server";
import { bookingByRef, cancel, reschedule, tokenMatches } from "@/lib/booking/engine";
import { bookingCancelledEmails, bookingMovedEmails } from "@/lib/booking/notify";
import { isDateBlocked, TIME_SLOTS, AVAILABLE_DAYS } from "@/lib/calendly";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bad = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  let body: { ref?: unknown; t?: unknown; action?: unknown; date?: unknown; timeSlot?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad(400, "Request body must be valid JSON");
  }
  const ref = typeof body.ref === "string" ? body.ref : "";
  const t = typeof body.t === "string" ? body.t : "";
  if (!ref || !tokenMatches(ref, t)) return bad(404, "This link doesn't match a booking.");

  const current = await bookingByRef(ref).catch(() => undefined);
  if (current === undefined) return bad(503, "We couldn't reach the calendar. Please try again in a minute, or ring us.");
  if (!current || current.site !== "ss") return bad(404, "This booking has already been cancelled.");

  if (body.action === "cancel") {
    const gone = await cancel(ref);
    if (!gone) return bad(404, "This booking has already been cancelled.");
    const emailed = await bookingCancelledEmails(gone).catch((e) => `failed: ${e instanceof Error ? e.message : e}`);
    console.log(`[booking/manage] cancelled ${gone.id} ref=${ref}; email ${emailed}`);
    return NextResponse.json({ ok: true, cancelled: true });
  }

  if (body.action === "reschedule") {
    const date = typeof body.date === "string" ? body.date : "";
    const slot = TIME_SLOTS.find((s) => s.value === body.timeSlot);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slot) return bad(400, "Choose a date and a time.");
    // The site's own rules, as at booking: Monday to Thursday, no blackout days.
    if (isDateBlocked(date) || !AVAILABLE_DAYS.includes(new Date(`${date}T12:00:00Z`).getUTCDay())) return bad(409, "That day isn't available. Please choose another.");
    const start = `${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}`;
    const moved = await reschedule(ref, date, start);
    if (!moved.ok) {
      if (moved.reason === "taken") return bad(409, "That time has just been taken. Please choose another.");
      if (moved.reason === "missing") return bad(404, "This booking has already been cancelled.");
      if (moved.reason === "invalid") return bad(400, "That time can't be booked. Please choose another.");
      return bad(503, "We couldn't reach the calendar. Please try again in a minute, or ring us.");
    }
    const emailed = await bookingMovedEmails(moved.from, moved.booking).catch((e) => `failed: ${e instanceof Error ? e.message : e}`);
    console.log(`[booking/manage] moved ref=${ref} ${moved.from.id} -> ${moved.booking.id}; email ${emailed}`);
    return NextResponse.json({ ok: true, start: moved.booking.start, end: moved.booking.end });
  }

  return bad(400, "Unknown action");
}
