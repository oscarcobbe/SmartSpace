/**
 * The visits booked for a stretch of time, wherever they were booked, for the
 * jobs that message customers about them (day-before reminders, the review
 * request the morning after).
 *
 * Bookings made on Calendly before the move to Google Calendar stay on
 * Calendly until they have passed, so for a while both are read: Calendly
 * while CALENDLY_PERSONAL_TOKEN is set, Google once it is configured. When the
 * last Calendly booking has passed, unsetting the token drops Calendly here.
 */
import {
  activeEventsBetween,
  addressFrom,
  calendlyUserUri,
  firstInvitee,
  isConsultation,
  phoneFrom,
  productFrom,
} from "@/lib/calendly-events";
import { bookingsBetween } from "./engine";
import { googleCalendarConfigured } from "./google-calendar";

export interface BookedVisit {
  /** What a reminder or review is logged against, so each goes once. A moved Google booking gets a new one. */
  key: string;
  source: "calendly" | "google";
  site: "ss" | "scl";
  consultation: boolean;
  /**
   * A SmartSpace Networks home network assessment (its own Calendly event type
   * or Google kind, or an early one booked as an installation named for it).
   * Neither the install reminder nor the review request fits it, so both jobs
   * leave it out; there is no assessment message for Nigel to approve yet.
   */
  assessment: boolean;
  title: string;
  start: string;
  end: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  product?: string;
}

const ASSESSMENT = /home network assessment/i;
/** By the visit's name, or the product it was booked for. */
export function isAssessment(title?: string, product?: string): boolean {
  return ASSESSMENT.test(title || "") || ASSESSMENT.test(product || "");
}

/** Visits starting in [startIso, endIso]. `problems` says which source could not be read; the rest still come back. */
export async function visitsBetween(startIso: string, endIso: string): Promise<{ visits: BookedVisit[]; problems: string[] }> {
  const visits: BookedVisit[] = [];
  const problems: string[] = [];

  const token = process.env.CALENDLY_PERSONAL_TOKEN;
  if (token) {
    try {
      const user = await calendlyUserUri(token);
      for (const e of await activeEventsBetween(token, user, startIso, endIso)) {
        const inv = await firstInvitee(token, e.uri).catch((err) => {
          problems.push(`Calendly ${e.uri}: invitee ${err instanceof Error ? err.message : String(err)}`);
          return undefined;
        });
        if (!inv) continue;
        visits.push({
          key: e.uri,
          source: "calendly",
          site: /^smartcare living/i.test(e.name || "") ? "scl" : "ss",
          consultation: isConsultation(e),
          assessment: isAssessment(e.name, productFrom(inv.questions_and_answers)),
          title: (e.name || "").trim(),
          start: e.start_time,
          end: e.end_time,
          name: (inv.name || "").trim(),
          email: inv.email,
          phone: inv.text_reminder_number || phoneFrom(inv.questions_and_answers),
          address: addressFrom(inv.questions_and_answers),
          product: productFrom(inv.questions_and_answers),
        });
      }
    } catch (err) {
      problems.push(`Calendly: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (googleCalendarConfigured()) {
    try {
      for (const b of await bookingsBetween(startIso, new Date(Date.parse(endIso) + 1000).toISOString())) {
        visits.push({
          key: `gcal:${b.ref}:${b.start}`,
          source: "google",
          site: b.site,
          consultation: b.kind === "consultation",
          assessment: b.kind === "assessment" || isAssessment(b.title, b.product),
          title: b.title,
          start: b.start,
          end: b.end,
          name: b.name,
          email: b.email,
          phone: b.phone,
          address: b.address,
          product: b.product,
        });
      }
    } catch (err) {
      problems.push(`Google Calendar: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  visits.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return { visits, problems };
}
