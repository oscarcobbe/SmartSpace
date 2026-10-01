/**
 * The customer's journey, message by message, for the email studio.
 *
 * Status is stated from the code as it stands, not as intended:
 *   live    sends to customers today
 *   paused  built, and switched off on purpose
 *   draft   designed here, not wired to anything that sends
 *
 * Every render uses sample data. Nothing in this file sends.
 */
import {
  contactReceived,
  consultationBooked,
  orderConfirmed,
  reminderConsultation,
  reminderInstall,
  reminderSms,
  reviewRequest,
  wifiReport,
  type Email,
} from "./customer";
import { networkDiagnosisA, networkDiagnosisB, smartGuardianAnnouncement } from "./marketing";
import { bookingCancelled, bookingConfirmed, bookingMoved } from "./booking";

export type Status = "live" | "paused" | "draft";

export interface Stage {
  id: string;
  title: string;
  blurb: string;
}

export const STAGES: Stage[] = [
  { id: "enquiry", title: "Enquiry", blurb: "Someone gets in touch or runs the Wi-Fi check." },
  { id: "consultation", title: "Consultation booked", blurb: "A free site visit goes in the calendar." },
  { id: "purchase", title: "Purchase", blurb: "An order is paid online and the install is booked." },
  { id: "booking-change", title: "Booking changed", blurb: "The customer moves or cancels a visit from their confirmation email." },
  { id: "day-before", title: "Day before", blurb: "The evening before a visit or an install." },
  { id: "after", title: "After the install", blurb: "The job is done." },
  { id: "broadcast", title: "To existing customers", blurb: "Announcements to the customer base." },
];

export interface Entry {
  id: string;
  stage: string;
  name: string;
  channel: "email" | "sms";
  status: Status;
  statusNote: string;
  trigger: string;
  timing: string;
  from: string;
  replyTo: string;
  source: string;
  /** What else lands in the customer's inbox at the same moment. */
  alongside?: string;
  /** How this draft differs from what is sent today, where something is. */
  changes?: string;
  render: () => Email | { sms: string };
}

const SAMPLE = {
  name: "Mary Byrne",
  product: "Ring Video Doorbell Pro + Install",
  amount: "€329.00",
  dateLabel: "Wednesday 8 October 2026",
  slot: "10:00 – 12:00",
  address: "14 Sample Road, Rathmines, Dublin 6",
};

/* What Calendly's invite showed, as the booking emails that replace it show it. */
const SAMPLE_BOOKING = {
  name: SAMPLE.name,
  title: "Smart Space Installation",
  dateLabel: SAMPLE.dateLabel,
  time: "10:00 to 12:00",
  address: SAMPLE.address,
  rescheduleUrl: "https://smart-space.ie/booking/sample?do=reschedule",
  cancelUrl: "https://smart-space.ie/booking/sample?do=cancel",
};
const AFTER_CALENDLY =
  "Not sent today: Calendly sends its own. This replaces it when bookings move off Calendly, which waits for this approval in Sign-off.";

const SENDER = "Smart Space, from the website's usual address";
const NIGEL = "Nigel";

export const ENTRIES: Entry[] = [
  {
    id: "contact-received",
    stage: "enquiry",
    name: "Enquiry received",
    channel: "email",
    status: "live",
    statusNote: "Sends today.",
    trigger: "The contact form or the callback form is submitted.",
    timing: "Straight away.",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/contact/route.ts (sendAutoReply)",
    changes: "Same words as today's, which were corrected on 28 September: it used to read \"your enquiry about installation enquiry\". The layout now comes from the shared frame, and the footer line is the site's slogan instead of \"Ring installation specialists. Brand-agnostic. No contract.\"",
    render: () => contactReceived({ name: SAMPLE.name, subjectKey: "installation" }),
  },
  {
    id: "wifi-report",
    stage: "enquiry",
    name: "Your Wi-Fi report",
    channel: "email",
    status: "draft",
    statusNote: "New, with the Wi-Fi check. Nothing sends it until it is approved in Sign-off.",
    trigger: "Someone asks for their Wi-Fi report to be emailed from the report page.",
    timing: "Straight away.",
    from: SENDER,
    replyTo: "info@smart-space.ie",
    source: "src/app/api/wifi-check/route.ts",
    render: () =>
      wifiReport({
        name: SAMPLE.name,
        light: "red",
        headline: "Your Wi-Fi is holding your home back",
        summary: "The connection into the house is fine. The Wi-Fi loses speed on the way to the rooms that struggle.",
        reportUrl: "https://smart-space.ie/wifi-check/report?r=sample",
        recommend: "Home Network Assessment",
      }),
  },
  {
    id: "consultation-booked",
    stage: "consultation",
    name: "Consultation booked",
    channel: "email",
    status: "draft",
    statusNote: "Not sent today: customers get Calendly's own confirmation and nothing from Smart Space. Nothing sends this until it is approved in Sign-off.",
    trigger: "A free consultation is booked on the website.",
    timing: "Straight away.",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/checkout/free/route.ts and src/app/api/booking/route.ts, once approved",
    alongside: "Calendly's own confirmation, unless it is turned off for the consultation event type.",
    render: () => consultationBooked({ name: SAMPLE.name, dateLabel: SAMPLE.dateLabel, slot: SAMPLE.slot, address: SAMPLE.address }),
  },
  {
    id: "order-confirmed",
    stage: "purchase",
    name: "Order confirmed",
    channel: "email",
    status: "live",
    statusNote: "Sends today.",
    trigger: "An order is paid online.",
    timing: "Straight away.",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/webhooks/stripe/route.ts",
    alongside: "Stripe's payment receipt and Calendly's invite for the install slot: three emails at checkout.",
    changes: "Same words. Shared frame; the footer drops \"Ring installation specialists\" (and the Eufy variant), \"5,000+ installs across Leinster\" and the SME award line.",
    render: () => orderConfirmed({ name: SAMPLE.name, product: SAMPLE.product, amount: SAMPLE.amount, dateLabel: SAMPLE.dateLabel, slot: SAMPLE.slot }),
  },
  {
    id: "booking-confirmed",
    stage: "purchase",
    name: "Booking confirmed, with the calendar file",
    channel: "email",
    status: "draft",
    statusNote: AFTER_CALENDLY,
    trigger: "Any visit is booked on the website: a free consultation, or an installation at checkout.",
    timing: "Straight away.",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/lib/booking/notify.ts, from every booking route once bookings are off Calendly",
    alongside: "Consultation booked or Order confirmed, as Calendly's invite was before.",
    render: () => bookingConfirmed(SAMPLE_BOOKING),
  },
  {
    id: "booking-moved",
    stage: "booking-change",
    name: "Booking moved",
    channel: "email",
    status: "draft",
    statusNote: AFTER_CALENDLY,
    trigger: "The customer picks a new time from the Reschedule link.",
    timing: "Straight away. Nigel is emailed too.",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/booking/manage/route.ts",
    render: () => bookingMoved({ ...SAMPLE_BOOKING, fromLabel: "Tuesday 7 October 2026, 15:00" }),
  },
  {
    id: "booking-cancelled",
    stage: "booking-change",
    name: "Booking cancelled",
    channel: "email",
    status: "draft",
    statusNote: AFTER_CALENDLY,
    trigger: "The customer cancels from the Cancel link.",
    timing: "Straight away. Nigel is emailed too.",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/booking/manage/route.ts",
    render: () => bookingCancelled({ name: SAMPLE.name, title: SAMPLE_BOOKING.title, dateLabel: SAMPLE.dateLabel, time: SAMPLE_BOOKING.time, address: SAMPLE.address, bookAgainUrl: "https://smart-space.ie/services" }),
  },
  {
    id: "reminder-consultation",
    stage: "day-before",
    name: "Reminder: site visit tomorrow",
    channel: "email",
    status: "paused",
    statusNote: "Built, and paused in June until you decide. Approving it in Sign-off turns it on.",
    trigger: "A consultation is in Calendly for tomorrow.",
    timing: "The evening before, at 17:00 (18:00 in summer time).",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/cron/booking-reminders/route.ts",
    changes: "The June wording, tidied: the time reads \"between 10:00 and 12:00\", and \"Anything funny on the day\" is now \"If anything comes up on the day\". Shared frame.",
    render: () => reminderConsultation({ name: SAMPLE.name, slot: SAMPLE.slot }),
  },
  {
    id: "reminder-consultation-sms",
    stage: "day-before",
    name: "Reminder text: site visit tomorrow",
    channel: "sms",
    status: "paused",
    statusNote: "Paused with the email. Approving it in Sign-off turns it on.",
    trigger: "Same run as the email.",
    timing: "The evening before, at 17:00 (18:00 in summer time).",
    from: "The Smart Space text number",
    replyTo: "-",
    source: "src/app/api/cron/booking-reminders/route.ts",
    changes: "Rewritten to fit one text. The June version spelt the time with a dash that is outside the standard text alphabet, and ran past 160 characters, so it would have billed as three texts.",
    render: () => ({ sms: reminderSms.consultation({ name: SAMPLE.name, slot: SAMPLE.slot }) }),
  },
  {
    id: "reminder-install",
    stage: "day-before",
    name: "Reminder: installation tomorrow",
    channel: "email",
    status: "paused",
    statusNote: "Built, and paused in June until you decide. Approving it in Sign-off turns it on.",
    trigger: "An installation is in Calendly for tomorrow.",
    timing: "The evening before, at 17:00 (18:00 in summer time).",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/cron/booking-reminders/route.ts",
    changes: "The June wording, tidied: the time reads \"between 10:00 and 12:00\", the product loses its \"+ Install\" shop suffix, and the checklist reads as sentences. Shared frame.",
    render: () => reminderInstall({ name: SAMPLE.name, slot: SAMPLE.slot, product: SAMPLE.product }),
  },
  {
    id: "reminder-install-sms",
    stage: "day-before",
    name: "Reminder text: installation tomorrow",
    channel: "sms",
    status: "paused",
    statusNote: "Paused with the email. Approving it in Sign-off turns it on.",
    trigger: "Same run as the email.",
    timing: "The evening before, at 17:00 (18:00 in summer time).",
    from: "The Smart Space text number",
    replyTo: "-",
    source: "src/app/api/cron/booking-reminders/route.ts",
    changes: "Rewritten to fit one text. The June version spelt the time with a dash that is outside the standard text alphabet, and ran past 160 characters, so it would have billed as three texts.",
    render: () => ({ sms: reminderSms.install({ name: SAMPLE.name, slot: SAMPLE.slot }) }),
  },
  {
    id: "review-request",
    stage: "after",
    name: "How's everything working? (review link)",
    channel: "email",
    status: "draft",
    statusNote: "New. Nothing sends it until it is approved in Sign-off, where you also pick when it goes.",
    trigger: "Your choice in Sign-off: the morning after the installation, or when you mark the enquiry Installed in the CRM.",
    timing: "The next morning, or straight away when you mark it installed.",
    from: SENDER,
    replyTo: NIGEL,
    source: "src/app/api/cron/review-requests/route.ts, or marking the enquiry Installed (src/app/crm/contacts/actions.ts)",
    render: () => reviewRequest({ name: SAMPLE.name, product: SAMPLE.product }),
  },
  {
    id: "smartguardian-announce",
    stage: "broadcast",
    name: "Meet SmartCare Living and SmartGuardian",
    channel: "email",
    status: "draft",
    statusNote: "New. Every line about SmartGuardian is taken from the SmartCare Living website. The June drafts of this email say things that site does not, and should not be sent.",
    trigger: "Sent from Mailings to the past customers you add there.",
    timing: "Fifty a day, weekday mornings.",
    from: "Nigel, Smart Space",
    replyTo: "info@smart-space.ie",
    source: "src/lib/email/marketing.ts",
    render: () => smartGuardianAnnouncement({ name: SAMPLE.name, unsubscribeUrl: "#unsubscribe", basis: "consent" }),
  },
  {
    id: "network-diagnosis-a",
    stage: "broadcast",
    name: "Network diagnosis, Version A (problem-led)",
    channel: "email",
    status: "draft",
    statusNote: "From the network service plan. The offer for existing customers is left for you to fill in.",
    trigger: "Sent from Mailings to the past customers you add there.",
    timing: "Fifty a day, weekday mornings.",
    from: "Nigel, Smart Space",
    replyTo: "info@smart-space.ie",
    source: "src/lib/email/marketing.ts",
    render: () => networkDiagnosisA({ name: SAMPLE.name, unsubscribeUrl: "#unsubscribe", basis: "customer" }),
  },
  {
    id: "network-diagnosis-b",
    stage: "broadcast",
    name: "Network diagnosis, Version B (device reliability)",
    channel: "email",
    status: "draft",
    statusNote: "From the network service plan, for security and SmartGuardian customers. The offer is left for you to fill in.",
    trigger: "Sent from Mailings to the security and SmartGuardian customers you add there.",
    timing: "Fifty a day, weekday mornings.",
    from: "Nigel, Smart Space",
    replyTo: "info@smart-space.ie",
    source: "src/lib/email/marketing.ts",
    render: () => networkDiagnosisB({ name: SAMPLE.name, unsubscribeUrl: "#unsubscribe", basis: "customer" }),
  },
];

export const entryById = (id: string | undefined) => ENTRIES.find((e) => e.id === id) ?? null;

/*
 * How many texts a message is billed as. GSM-7 fits 160 characters in one
 * text and 153 in each part of a longer one; a character outside it (an en
 * dash, a curly apostrophe, an emoji) switches the whole message to UCS-2,
 * which fits 70, or 67 per part. The euro sign and a few brackets are in
 * GSM-7 but cost two characters each.
 */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€\f";

export function smsParts(text: string): { encoding: "GSM-7" | "UCS-2"; units: number; parts: number; offenders: string[] } {
  let units = 0;
  const offenders = new Set<string>();
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) units += 1;
    else if (GSM_EXTENDED.includes(ch)) units += 2;
    else offenders.add(ch);
  }
  if (!offenders.size) return { encoding: "GSM-7", units, parts: units <= 160 ? 1 : Math.ceil(units / 153), offenders: [] };
  const u16 = text.length;
  return { encoding: "UCS-2", units: u16, parts: u16 <= 70 ? 1 : Math.ceil(u16 / 67), offenders: Array.from(offenders) };
}
