/**
 * Which system takes bookings: Calendly, or Nigel's Google Calendar through
 * src/lib/booking/engine.ts.
 *
 * BOOKING_BACKEND=google moves both sites off Calendly (SmartCare Living asks
 * this site's /api/booking/engine, so it follows the same switch). Anything
 * else, or a Google connection that is not set up, stays on Calendly, so a
 * half-finished setup can never leave a customer with nowhere to book.
 *
 * Bookings made on Calendly before the switch stay there until they have
 * passed: the reminder and review jobs read both while CALENDLY_PERSONAL_TOKEN
 * is set (src/lib/booking/upcoming.ts).
 */
import { googleCalendarConfigured } from "./google-calendar";

export type BookingBackend = "calendly" | "google";

export function bookingBackend(): BookingBackend {
  return process.env.BOOKING_BACKEND?.trim().toLowerCase() === "google" && googleCalendarConfigured() && !!process.env.BOOKING_LINK_SECRET
    ? "google"
    : "calendly";
}
