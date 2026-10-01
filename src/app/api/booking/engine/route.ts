/**
 * The booking engine for SmartCare Living's server, so both sites book into
 * the same calendar under one lock (src/lib/booking/engine.ts). Server to
 * server only: the caller sends Authorization: Bearer BOOKING_API_SECRET,
 * which is set on both Vercel projects and never reaches a browser.
 *
 *   GET  ?date=YYYY-MM-DD                       free start times that day
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

export async function GET(request: Request) {
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
