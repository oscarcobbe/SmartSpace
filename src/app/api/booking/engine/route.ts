/**
 * The booking engine for SmartCare Living's server, so both sites book into
 * the same calendar under one lock (src/lib/booking/engine.ts). Server to
 * server only: the caller sends Authorization: Bearer BOOKING_API_SECRET,
 * which is set on both Vercel projects and never reaches a browser.
 *
 *   GET  ?date=YYYY-MM-DD                       free start times that day
 *   GET  ?health=1                              can the calendar be read (see health())
 *   POST { action: "book", ...BookInput }       site is always "scl" here
 *   POST { action: "get", ref, t }
 *   POST { action: "cancel", ref, t }
 *   POST { action: "reschedule", ref, t, date, start }
 *
 * t is the token from the customer's emailed link; the engine checks it, so
 * SmartCare Living never needs the link secret.
 *
 * SmartCare Living sends its own emails; this only moves the calendar. It
 * answers 409 { backend: "calendly" } while this site is still on Calendly,
 * so the two sites can never be on different systems.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { bookingBackend } from "@/lib/booking/backend";
import { googleCalendarConfigured } from "@/lib/booking/google-calendar";
import { approval } from "@/lib/signoff/state";
import { book, bookingByRef, cancel, freeStarts, manageUrl, reschedule, tokenMatches, type Booking } from "@/lib/booking/engine";

export const dynamic = "force-dynamic";
// Room for the booking engine to wait out Google's rate limit (src/lib/booking/google-calendar.ts, withRetry).
export const maxDuration = 60;
export const runtime = "nodejs";

function authorised(request: Request): boolean {
  const secret = process.env.BOOKING_API_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(request.headers.get("authorization") || "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

const out = (b: Booking) => ({ ...b, manageUrl: manageUrl(b), rescheduleUrl: manageUrl(b, "reschedule"), cancelUrl: manageUrl(b, "cancel") });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => NextResponse.json({ ok: false, error, ...extra }, { status });

function gate(request: Request): NextResponse | null {
  if (!authorised(request)) return fail(401, "Unauthorized");
  if (bookingBackend() !== "google") return fail(409, "Bookings are still on Calendly", { backend: "calendly" });
  return null;
}

/**
 * GET ?health=1: can this deployment read the booking calendar right now?
 * Read-only (free/busy for the next weekday), and answered whichever system
 * is taking bookings, so the Google connection can be proved on the live
 * site before the switch and watched after it. Says nothing about the
 * calendar beyond ok and how long it took, and whether Nigel has approved
 * the three booking emails in Sign-off.
 */
async function health(): Promise<NextResponse> {
  const started = Date.now();
  const day = new Date(started + 86_400_000);
  while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
  const date = day.toISOString().slice(0, 10);
  // Whether Nigel has approved the emails that replace Calendly's: the switch waits for these.
  const gates = await Promise.all([approval("email:booking-confirmed"), approval("email:booking-moved"), approval("email:booking-cancelled")]);
  const approved = Object.fromEntries(gates.map((g) => [g.item.replace("email:", ""), g.approved]));
  const base = { backend: bookingBackend(), googleConfigured: googleCalendarConfigured(), linkSecret: !!process.env.BOOKING_LINK_SECRET, approved };
  if (!base.googleConfigured) return NextResponse.json({ ok: false, ...base, error: "Google Calendar is not configured here" }, { status: 503 });
  try {
    await freeStarts(date);
    return NextResponse.json({ ok: true, ...base, readMs: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking/engine] health read failed:", e);
    return NextResponse.json({ ok: false, ...base, readMs: Date.now() - started, error: e instanceof Error ? e.message.slice(0, 300) : String(e) }, { status: 503 });
  }
}

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("health") === "1") {
    if (!authorised(request)) return fail(401, "Unauthorized");
    return health();
  }
  const refused = gate(request);
  if (refused) return refused;
  const date = new URL(request.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, "date must be YYYY-MM-DD");
  try {
    return NextResponse.json({ ok: true, date, starts: await freeStarts(date) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking/engine] free/busy failed:", e);
    return fail(503, "The calendar could not be read");
  }
}

export async function POST(request: Request) {
  const refused = gate(request);
  if (refused) return refused;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Request body must be valid JSON");
  }
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : undefined);
  const ref = str("ref") || "";
  if (body.action !== "book" && !tokenMatches(ref, str("t"))) return fail(404, "No such booking");

  try {
    switch (body.action) {
      case "book": {
        const kind = str("kind") === "installation" ? "installation" : "consultation";
        const r = await book({
          site: "scl",
          kind,
          date: str("date") || "",
          start: str("start") || "",
          name: str("name") || "",
          email: str("email") || "",
          phone: str("phone"),
          address: str("address"),
          eircode: str("eircode"),
          product: str("product"),
          orderId: str("orderId"),
          notes: str("notes"),
        });
        if (!r.ok) return fail(r.reason === "taken" ? 409 : r.reason === "invalid" ? 400 : 503, r.message, { reason: r.reason });
        return NextResponse.json({ ok: true, booking: out(r.booking) });
      }
      case "get": {
        const b = await bookingByRef(ref);
        return b && b.site === "scl" ? NextResponse.json({ ok: true, booking: out(b) }) : fail(404, "No such booking");
      }
      case "cancel": {
        const b = await bookingByRef(ref);
        if (!b || b.site !== "scl") return fail(404, "No such booking");
        const gone = await cancel(ref);
        return gone ? NextResponse.json({ ok: true, booking: out(gone) }) : fail(404, "No such booking");
      }
      case "reschedule": {
        const b = await bookingByRef(ref);
        if (!b || b.site !== "scl") return fail(404, "No such booking");
        const r = await reschedule(ref, str("date") || "", str("start") || "");
        if (!r.ok) return fail(r.reason === "taken" ? 409 : r.reason === "missing" ? 404 : r.reason === "invalid" ? 400 : 503, r.message, { reason: r.reason });
        return NextResponse.json({ ok: true, from: out(r.from), booking: out(r.booking), leftover: r.leftover ?? null });
      }
      default:
        return fail(400, "Unknown action");
    }
  } catch (e) {
    console.error("[booking/engine] failed:", e);
    return fail(503, "The calendar could not be reached");
  }
}
