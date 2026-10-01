// Booking: free slots and creating a booking, for every route on this site.
// Calendly, or Nigel's Google Calendar once BOOKING_BACKEND=google (see
// src/lib/booking/backend.ts). Both answer through the same two functions
// below, so the routes do not know which one they are talking to.
// Calendly needs: CALENDLY_PERSONAL_TOKEN, CALENDLY_CONSULTATION_EVENT_TYPE_URI, CALENDLY_INSTALLATION_EVENT_TYPE_URI
import { bookingBackend } from "@/lib/booking/backend";
import { book, freeStarts } from "@/lib/booking/engine";
import { bookingConfirmedEmails } from "@/lib/booking/notify";

const CALENDLY_TOKEN = process.env.CALENDLY_PERSONAL_TOKEN;
const CONSULTATION_EVENT_TYPE_URI = process.env.CALENDLY_CONSULTATION_EVENT_TYPE_URI;
// Fall back to old env var name so existing Vercel deployments keep working
const INSTALLATION_EVENT_TYPE_URI = process.env.CALENDLY_INSTALLATION_EVENT_TYPE_URI || process.env.CALENDLY_EVENT_TYPE_URI;

import {
  TIME_SLOTS,
  AVAILABLE_DAYS,
  BLOCKED_DATE_RANGES,
  isDateBlocked,
  getEarliestBookableDate,
  type BlockedDateRange,
} from "@/lib/booking/rules";
export { TIME_SLOTS, AVAILABLE_DAYS, BLOCKED_DATE_RANGES, isDateBlocked, getEarliestBookableDate };
export type { BlockedDateRange };

type EventKind = "consultation" | "installation";

function getEventTypeUri(kind: EventKind): string | undefined {
  return kind === "consultation" ? CONSULTATION_EVENT_TYPE_URI : INSTALLATION_EVENT_TYPE_URI;
}


/**
 * Get available time slots for a given date by checking Calendly availability.
 * Maps Calendly's available start times back to our fixed TIME_SLOTS.
 */
export async function getAvailableSlots(dateStr: string, kind: EventKind = "installation"): Promise<typeof TIME_SLOTS> {
  // Sitewide calendar blackout, return no slots on blocked dates without
  // even calling Calendly. Covers both the availability API and the reserve
  // re-check, since both go through here.
  if (isDateBlocked(dateStr)) return [];

  if (bookingBackend() === "google") {
    try {
      const free = await freeStarts(dateStr);
      return TIME_SLOTS.filter((s) => free.includes(`${String(s.startHour).padStart(2, "0")}:${String(s.startMin).padStart(2, "0")}`));
    } catch (err) {
      // As with a Calendly outage: no slots rather than slots that may be taken.
      console.error("[booking] Google Calendar free/busy failed:", err);
      return [];
    }
  }

  const eventTypeUri = getEventTypeUri(kind);

  if (!CALENDLY_TOKEN || !eventTypeUri) {
    console.error(`[calendly] Not configured for ${kind}. CALENDLY_PERSONAL_TOKEN=${CALENDLY_TOKEN ? "set" : "MISSING"}, event_type_uri=${eventTypeUri ? "set" : "MISSING"}`);
    return [];
  }

  try {
    const startTime = `${dateStr}T00:00:00Z`;
    const endTime = `${dateStr}T23:59:59Z`;

    const res = await fetch(
      `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${startTime}&end_time=${endTime}`,
      {
        headers: {
          Authorization: `Bearer ${CALENDLY_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        // 6s ceiling, Calendly's API normally responds under 1s. Without
        // this, a stalled API call would block the Vercel serverless
        // function up to its 10s timeout, after which the user would see
        // "couldn't lock in that slot" and bounce.
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!res.ok) {
      console.error("[calendly] API error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const collection = (data.collection || []).filter((t: { status: string }) => t.status === "available");

    // Map Calendly UTC start times to our slot values using Dublin timezone
    const availableSlotValues = new Set<string>();

    for (const t of collection) {
      const utcDate = new Date((t as { start_time: string }).start_time);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Dublin",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(utcDate);

      const hour = parts.find(p => p.type === "hour")?.value || "00";
      const minute = parts.find(p => p.type === "minute")?.value || "00";
      const localTime = `${hour}:${minute}`;

      for (const slot of TIME_SLOTS) {
        const slotStart = `${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}`;
        if (localTime === slotStart) {
          availableSlotValues.add(slot.value);
        }
      }
    }

    return TIME_SLOTS.filter((slot) => availableSlotValues.has(slot.value));
  } catch (err) {
    console.error("[calendly] API error:", err);
    return [];
  }
}

/**
 * Create a booking on Calendly after payment is confirmed.
 * Uses the Scheduling API to book the invitee directly.
 */
export async function createBookingEvent(params: {
  date: string;
  timeSlot: string;
  customerName: string;
  email: string;
  phone?: string;
  address?: string;
  productTitle: string;
  orderId?: string;
  kind?: EventKind;
}): Promise<{ eventId: string } | null> {
  const kind = params.kind ?? "installation";

  // Sitewide calendar blackout, refuse to create a booking on a blocked
  // date even if a request bypasses the UI + availability/reserve checks.
  if (isDateBlocked(params.date)) {
    console.error(`[calendly] Refusing booking on blocked date ${params.date}`);
    return null;
  }

  if (bookingBackend() === "google") {
    const slot = TIME_SLOTS.find((s) => s.value === params.timeSlot);
    if (!slot) {
      console.error(`[booking] Invalid time slot: ${params.timeSlot}`);
      return null;
    }
    const result = await book({
      site: "ss",
      kind,
      date: params.date,
      start: `${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}`,
      name: params.customerName,
      email: params.email,
      phone: params.phone,
      address: params.address,
      product: params.productTitle,
      orderId: params.orderId,
    });
    if (!result.ok) {
      console.error(`[booking] Google Calendar booking refused (${result.reason}): ${result.message}`);
      return null;
    }
    // Calendly emailed the customer as it booked; this does the same, and
    // waits, because the route's function can be frozen once it answers.
    const emailed = await bookingConfirmedEmails(result.booking).catch((e) => `failed: ${e instanceof Error ? e.message : e}`);
    console.log(`[booking] booked ${result.booking.id} ref=${result.booking.ref}; confirmation ${emailed}`);
    return { eventId: result.booking.id };
  }

  const eventTypeUri = getEventTypeUri(kind);

  if (!CALENDLY_TOKEN || !eventTypeUri) {
    console.error(`[calendly] Cannot create booking, not configured for ${kind}`);
    return null;
  }

  try {
    const slot = TIME_SLOTS.find((s) => s.value === params.timeSlot);
    if (!slot) throw new Error(`Invalid time slot: ${params.timeSlot}`);

    // Look up the exact Calendly available start time for this slot.
    // 6s ceiling, same budget as getAvailableSlots; without it a hung
    // call would block until the route's outer timeout, after which the
    // user sees "couldn't lock in that slot" instead of a clean retry.
    const availableRes = await fetch(
      `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${params.date}T00:00:00Z&end_time=${params.date}T23:59:59Z`,
      {
        headers: { Authorization: `Bearer ${CALENDLY_TOKEN}`, "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      }
    );
    const availableData = await availableRes.json();
    const availableTimes: { start_time: string; status: string }[] = (availableData.collection || []).filter(
      (t: { status: string }) => t.status === "available"
    );

    // Match our Dublin-time slot to a Calendly available time
    let startTimeIso: string | null = null;
    for (const t of availableTimes) {
      const utcDate = new Date(t.start_time);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Dublin",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(utcDate);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
      if (hour === slot.startHour && minute === slot.startMin) {
        startTimeIso = t.start_time;
        break;
      }
    }

    if (!startTimeIso) {
      console.error(`[calendly] No available time matching ${slot.startHour}:${slot.startMin} on ${params.date}. Available times:`, availableTimes.map((t: { start_time: string }) => t.start_time));
      return null;
    }

    console.log(`[calendly] Booking: kind=${kind} slot=${params.timeSlot} → startTime=${startTimeIso} eventType=${eventTypeUri}`);

    const nameParts = params.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || undefined;

    // Format phone to E.164 for Calendly (convert Irish local to +353).
    // Bug fix: previously a number that already started with "353" (no
    // plus, e.g. "353871234567", the way iOS sometimes returns
    // contacts) was being prefixed AGAIN, producing "+353353871234567"
    // which Calendly rejects for SMS reminders.
    let formattedPhone: string | undefined;
    if (params.phone) {
      const digits = params.phone.replace(/[\s\-()]/g, "");
      if (digits.startsWith("+")) {
        formattedPhone = digits;
      } else if (digits.startsWith("00")) {
        formattedPhone = "+" + digits.slice(2);
      } else if (digits.startsWith("353")) {
        formattedPhone = "+" + digits;
      } else if (digits.startsWith("0")) {
        formattedPhone = "+353" + digits.slice(1);
      } else if (/^\d+$/.test(digits)) {
        formattedPhone = "+353" + digits;
      } else {
        // Unknown format, drop rather than send a malformed E.164.
        formattedPhone = undefined;
      }
    }

    const res = await fetch("https://api.calendly.com/invitees", {
      method: "POST",
      // 8s ceiling, bookings need a slightly longer budget than slot
      // lookups since Calendly creates calendar events + sends emails.
      // If exceeded, the Stripe webhook caller surfaces "calendlyStatus
      // = failed" and SMS-alerts Nigel to book manually.
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${CALENDLY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: eventTypeUri,
        start_time: startTimeIso,
        invitee: {
          email: params.email,
          first_name: firstName,
          last_name: lastName || undefined,
          timezone: "Europe/Dublin",
          text_reminder_number: formattedPhone || undefined,
        },
        location: {
          kind: "physical",
          location: "Customer\u0027s home",
        },
        questions_and_answers: [
          {
            question: "Please share anything that will help prepare for our meeting.",
            answer: [
              `Product: ${params.productTitle}`,
              params.orderId ? `Order: ${params.orderId}` : "",
              params.address ? `Address: ${params.address}` : "",
              params.phone ? `Phone: ${params.phone}` : "",
            ].filter(Boolean).join(" | "),
            position: 0,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[calendly] Booking error: ${res.status} ${errText}. Request: eventType=${eventTypeUri} startTime=${startTimeIso} email=${params.email}`);
      return null;
    }

    const event = await res.json();
    const eventId = event.resource?.uri || event.uri || "created";
    console.log("[calendly] Booking created:", eventId);
    return { eventId };
  } catch (err) {
    console.error("[calendly] Failed to create booking:", err);
    return null;
  }
}
