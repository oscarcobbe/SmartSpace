/**
 * The booking emails Calendly used to send for Smart Space, now ours: the
 * confirmation with the links to move or cancel, and the notes that follow
 * when the customer uses them. Each carries the calendar file (see
 * src/lib/booking/ics.ts) the way Calendly's invite did.
 *
 * They say what Calendly's said, in the house layout: what, when, where, and
 * how to change it. Like every new customer message they wait for Nigel's
 * sign-off (src/lib/signoff/items.ts), and bookings stay on Calendly until he
 * has given it (see src/lib/booking/backend.ts).
 */
import { button, contactNote, eyebrow, heading, para, renderEmail, signoff, summary } from "./layout";
import type { Email } from "./customer";

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export interface BookingFacts {
  name: string;
  /** "Smart Space Installation", the visit type Calendly showed. */
  title: string;
  /** "Monday 5 October 2026". */
  dateLabel: string;
  /** "10:00 to 12:00". */
  time: string;
  address?: string;
  rescheduleUrl: string;
  cancelUrl: string;
}

const where = (address?: string) => (address ? `Your home, ${address}` : "Your home");

function details(d: BookingFacts): [string, string][] {
  return [
    ["Booking", d.title],
    ["Date", d.dateLabel],
    ["Time", d.time],
    ["Where", where(d.address)],
  ];
}

const textDetails = (d: BookingFacts) => [
  `  Booking: ${d.title}`,
  `  Date: ${d.dateLabel}`,
  `  Time: ${d.time}`,
  `  Where: ${where(d.address)}`,
];

const FOOTER = { kind: "transactional" as const, note: "You're receiving this because you made a booking on smart-space.ie." };

export function bookingConfirmed(d: BookingFacts): Email {
  const preheader = `${d.dateLabel}, ${d.time}. Add it to your calendar, or move it if you need to.`;
  return {
    subject: `Confirmed: ${d.title} on ${d.dateLabel} at ${d.time.split(" ")[0]}`,
    preheader,
    html: renderEmail({
      title: "Your booking is confirmed",
      preheader,
      blocks: [
        eyebrow("Booking confirmed"),
        heading(`You're booked in, ${first(d.name)}.`),
        para("The calendar file attached adds it to your calendar.", { size: 16, pad: "14px 32px 0" }),
        summary("Your booking", details(d)),
        para("Need a different time? You can move or cancel it yourself:", { pad: "24px 32px 0" }),
        button("Reschedule", d.rescheduleUrl),
        button("Cancel", d.cancelUrl, "ink"),
        contactNote("Or talk to us:"),
        signoff("Talk soon,", "Nigel and the Smart Space team"),
      ],
      footer: FOOTER,
    }),
    text: [
      `Hi ${first(d.name)},`,
      "",
      "You're booked in. The calendar file attached adds it to your calendar.",
      "",
      "Your booking",
      ...textDetails(d),
      "",
      `Reschedule: ${d.rescheduleUrl}`,
      `Cancel: ${d.cancelUrl}`,
      "",
      "Talk soon,",
      "Nigel and the Smart Space team",
    ].join("\n"),
  };
}

export function bookingMoved(d: BookingFacts & { fromLabel: string }): Email {
  const preheader = `Moved from ${d.fromLabel} to ${d.dateLabel}, ${d.time}.`;
  return {
    subject: `Updated: ${d.title} is now ${d.dateLabel} at ${d.time.split(" ")[0]}`,
    preheader,
    html: renderEmail({
      title: "Your booking has moved",
      preheader,
      blocks: [
        eyebrow("Booking moved"),
        heading(`All set, ${first(d.name)}.`),
        para(`Your booking has moved from ${d.fromLabel}. The calendar file attached updates your calendar.`, { size: 16, pad: "14px 32px 0" }),
        summary("Your new time", details(d)),
        button("Reschedule again", d.rescheduleUrl),
        button("Cancel", d.cancelUrl, "ink"),
        contactNote("Questions? Talk to us:"),
        signoff("Talk soon,", "Nigel and the Smart Space team"),
      ],
      footer: FOOTER,
    }),
    text: [
      `Hi ${first(d.name)},`,
      "",
      `Your booking has moved from ${d.fromLabel}. The calendar file attached updates your calendar.`,
      "",
      "Your new time",
      ...textDetails(d),
      "",
      `Reschedule: ${d.rescheduleUrl}`,
      `Cancel: ${d.cancelUrl}`,
      "",
      "Talk soon,",
      "Nigel and the Smart Space team",
    ].join("\n"),
  };
}

export function bookingCancelled(d: Omit<BookingFacts, "rescheduleUrl" | "cancelUrl"> & { bookAgainUrl: string }): Email {
  const preheader = `Your ${d.title.toLowerCase()} on ${d.dateLabel} is cancelled.`;
  return {
    subject: `Cancelled: ${d.title} on ${d.dateLabel} at ${d.time.split(" ")[0]}`,
    preheader,
    html: renderEmail({
      title: "Your booking is cancelled",
      preheader,
      blocks: [
        eyebrow("Booking cancelled"),
        heading(`That's cancelled, ${first(d.name)}.`),
        para("We've taken it out of the calendar. The calendar file attached removes it from yours.", { size: 16, pad: "14px 32px 0" }),
        summary("Cancelled", details({ ...d, rescheduleUrl: "", cancelUrl: "" })),
        button("Book another time", d.bookAgainUrl),
        contactNote("Questions? Talk to us:"),
        signoff("Thanks,", "Nigel and the Smart Space team"),
      ],
      footer: FOOTER,
    }),
    text: [
      `Hi ${first(d.name)},`,
      "",
      "That's cancelled. We've taken it out of the calendar. The calendar file attached removes it from yours.",
      "",
      "Cancelled",
      ...textDetails({ ...d, rescheduleUrl: "", cancelUrl: "" }),
      "",
      `Book another time: ${d.bookAgainUrl}`,
      "",
      "Thanks,",
      "Nigel and the Smart Space team",
    ].join("\n"),
  };
}
