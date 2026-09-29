/**
 * Every email and text a Smart Space customer gets from us, one function each.
 *
 * Each returns the subject, the inbox preview line, the HTML and the plain
 * text, so the studio at /dev/emails shows exactly what a route would send.
 *
 * Wording of the three that already reach customers (contact auto-reply,
 * order confirmation, and the paused day-before reminders) is carried over
 * from the routes as it stands, so this set changes their layout and not what
 * they say. The new ones (consultation booked, review request, Wi-Fi report)
 * are drafts for Oscar to design.
 */
import {
  button,
  checklist,
  contactNote,
  esc,
  eyebrow,
  heading,
  panel,
  para,
  phoneLink,
  renderEmail,
  signoff,
  steps,
  summary,
} from "./layout";
import { BUSINESS_PHONE_DISPLAY, GOOGLE_REVIEW_URL } from "@/lib/business-constants";

export interface Email {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

/* ── Contact enquiry: live in src/app/api/contact/route.ts ─────────── */

/**
 * What the enquiry auto-reply calls the enquiry. The form's labels are
 * written for Nigel's inbox ("Installation Enquiry"), and lowercased into the
 * sentence they read "your enquiry about installation enquiry". Shared with
 * src/app/api/contact/route.ts so the studio shows what is sent.
 */
export const ENQUIRY_RECEIVED: Record<string, string> = {
  installation: "your installation enquiry",
  product: "your product question",
  support: "your support request",
};
export const enquiryReceived = (subjectKey: string) => ENQUIRY_RECEIVED[subjectKey] ?? "your enquiry";
export const SPECIALISTS =
  "We're Ring installation specialists. We quote prices up front, there's no contract, and we install Ring, Eufy, Nest, Tapo and Aosu.";

export function contactReceived(d: { name: string; subjectKey: string }): Email {
  const f = first(d.name);
  const topic = enquiryReceived(d.subjectKey);
  const preheader = "Thanks, we've got your enquiry. We'll be back to you within one business day.";
  return {
    subject: "We've got your message, Smart Space",
    preheader,
    html: renderEmail({
      title: "We've got your message, Smart Space",
      preheader,
      blocks: [
        eyebrow("Message received"),
        heading(`Thanks, ${f}. We've got your message.`),
        para(
          `We've received <strong style="color:#1C1A18;">${esc(topic)}</strong> and will be back to you within <strong style="color:#1C1A18;">one business day</strong> (usually a lot sooner).`,
          { size: 16, pad: "14px 32px 0" },
        ),
        contactNote("Need us sooner? Reach us directly:"),
        para(SPECIALISTS, { pad: "24px 32px 0" }),
        signoff("Talk soon,", "Nigel and the Smart Space team"),
      ],
      footer: {
        kind: "transactional",
        note: "You're receiving this because you submitted the contact form on smart-space.ie. If this wasn't you, just ignore this email.",
      },
    }),
    text: [
      `Hi ${f},`,
      "",
      `Thanks for getting in touch with Smart Space. We've received ${topic} and will be back to you within one business day (usually a lot sooner).`,
      "",
      "If it's urgent in the meantime, you can reach us directly:",
      `  Phone: ${BUSINESS_PHONE_DISPLAY}`,
      "  Email: info@smart-space.ie",
      "",
      SPECIALISTS,
      "",
      "Talk soon,",
      "Nigel and the Smart Space team",
      "smart-space.ie",
    ].join("\n"),
  };
}

/* ── Consultation booked: new. Today only Calendly's own email goes out. ─ */

export function consultationBooked(d: { name: string; dateLabel: string; slot: string; address?: string }): Email {
  const f = first(d.name);
  const slot = slotTo(d.slot);
  const preheader = `${d.dateLabel}, ${slot}. Here's what happens at the visit.`;
  const rows: [string, string][] = [
    ["Visit", "Free site visit"],
    ["Date", d.dateLabel],
    ["Time slot", slot],
  ];
  if (d.address) rows.push(["Address", d.address]);
  return {
    subject: `Your free consultation is booked, ${d.dateLabel}`,
    preheader,
    html: renderEmail({
      title: "Your free consultation is booked",
      preheader,
      blocks: [
        eyebrow("Consultation booked"),
        heading(`You're booked in, ${f}.`),
        para("Here's your visit and what to expect.", { size: 16, pad: "14px 32px 0" }),
        summary("Your booking", rows),
        steps("At the visit", [
          "We walk your home with you and flag blind spots, Wi-Fi dead zones and wiring constraints.",
          "Allow up to 30 minutes.",
          "You get a written quote to your inbox the same day.",
        ]),
        panel("There's nothing to prepare. Just be home for the slot."),
        contactNote("Need to change the time?"),
        signoff("Talk soon,", "Nigel and the Smart Space team"),
      ],
      footer: {
        kind: "transactional",
        note: "You're receiving this because you booked a consultation on smart-space.ie.",
      },
    }),
    text: [
      `Hi ${f},`,
      "",
      "You're booked in. Here's your visit and what to expect.",
      "",
      "Your booking",
      "  Visit: Free site visit",
      `  Date: ${d.dateLabel}`,
      `  Time slot: ${slot}`,
      ...(d.address ? [`  Address: ${d.address}`] : []),
      "",
      "At the visit",
      "  1. We walk your home with you and flag blind spots, Wi-Fi dead zones and wiring constraints.",
      "  2. Allow up to 30 minutes.",
      "  3. You get a written quote to your inbox the same day.",
      "",
      "There's nothing to prepare. Just be home for the slot.",
      "",
      `Need to change the time? Ring ${BUSINESS_PHONE_DISPLAY} or reply to this email.`,
      "",
      "Talk soon,",
      "Nigel and the Smart Space team",
    ].join("\n"),
  };
}

/* ── Purchase: live in src/app/api/webhooks/stripe/route.ts ─────────── */

export function orderConfirmed(d: { name: string; product: string; amount: string; dateLabel: string; slot: string }): Email {
  const f = first(d.name);
  const short = d.product.length > 50 ? d.product.slice(0, 47) + "..." : d.product;
  const preheader = `Order confirmed. Install booked for ${d.dateLabel}, ${d.slot}.`;
  const next = [
    "Before we arrive, have your WiFi name and password and your app account ready. That's all we need from you on the day.",
    "We arrive in your slot, install everything, walk you through the app, and train the family before we leave.",
    "Any issue in the first 30 days, we come back free of charge.",
  ];
  return {
    subject: `Order confirmed, Smart Space, ${short}`,
    preheader,
    html: renderEmail({
      title: "Order confirmed, Smart Space",
      preheader,
      blocks: [
        eyebrow("Order confirmed"),
        heading(`Thanks, ${f}. We've got your order.`),
        para("Everything's locked in. Here's what you booked and what to expect.", { size: 16, pad: "14px 32px 0" }),
        summary("Order summary", [
          ["Product", d.product],
          ["Amount", d.amount],
          ["Install date", d.dateLabel],
          ["Time slot", d.slot],
        ]),
        steps("What happens next", next.map(esc)),
        contactNote("Questions before then?"),
        signoff("Talk soon,", "Nigel and the Smart Space team"),
      ],
      footer: {
        kind: "transactional",
        note: "Stripe sends a separate payment receipt to this address. This email is just the install side, what you booked and what happens next.",
      },
    }),
    text: [
      `Hi ${f},`,
      "",
      "Thanks. We've got your order and everything's locked in.",
      "",
      "Order summary",
      `  Product: ${d.product}`,
      `  Amount:  ${d.amount}`,
      `  Date:    ${d.dateLabel}`,
      `  Slot:    ${d.slot}`,
      "",
      "What happens next",
      ...next.map((t, i) => `  ${i + 1}. ${t}`),
      "",
      "Questions before then?",
      `  Phone: ${BUSINESS_PHONE_DISPLAY}`,
      "  Email: info@smart-space.ie",
      "",
      "Talk soon,",
      "Nigel and the Smart Space team",
      "smart-space.ie",
      "",
      "Stripe sends a separate payment receipt to this address. This email is just the install side.",
    ].join("\n"),
  };
}

/* ── Day before: built, paused 10 June 2026, now switched by Sign-off ── */
/*    src/app/api/cron/booking-reminders/route.ts                        */

/** "10:00 – 12:00" as a customer would say it: "between 10:00 and 12:00". */
export function between(slot: string): string {
  const [from, to] = slot.split(/\s*[\u2013\u2014-]\s*/);
  return from && to ? `between ${from} and ${to}` : `at ${slot}`;
}

/** "10:00 – 12:00" as "10:00 to 12:00", for subject lines and texts. */
export const slotTo = (slot: string) => slot.replace(/\s*[\u2013\u2014-]\s*/g, " to ");

/**
 * The product as a customer calls it. Shop and Calendly names end in
 * "+ Install" ("Ring Video Doorbell Pro + Install"), which reads wrongly in
 * "we're calling out to fit your ...". A bare "Installation" names no product.
 */
export function productName(product: string): string | null {
  const name = product.replace(/\s*\+\s*install(ation)?\s*$/i, "").trim();
  return name && !/^install(ation)?$/i.test(name) ? name : null;
}

const PREP = [
  ["Wi-Fi at the install spot.", "Check the signal reaches the front door, or wherever the device is going. If it's weak there, move the router closer or plug in an extender before we arrive."],
  ["The app on your phone.", "Install the app for the brand you bought (Ring, Eufy, Nest, Tapo or Aosu) on the phone you want to use. We'll sign in together on the day."],
  ["Your passwords.", "Have your Wi-Fi password and your app account password ready. We can't recover these for you."],
  ["Someone at home for the slot.", "Even a quick install needs access to the door."],
] as const;

const REMINDER_FOOTER = "This is a one-off reminder about your booking with Smart Space.";

export function reminderInstall(d: { name: string; slot: string; product: string }): Email {
  const f = first(d.name);
  const product = productName(d.product);
  const visit = `tomorrow ${between(d.slot)} ${product ? `to fit your ${product}` : "for your installation"}`;
  const preheader = `Tomorrow ${between(d.slot)}. A few things to have ready.`;
  return {
    subject: `Tomorrow's installation with Smart Space, ${slotTo(d.slot)}`,
    preheader,
    html: renderEmail({
      title: "Tomorrow's booking with Smart Space",
      preheader,
      blocks: [
        eyebrow("Tomorrow's booking"),
        heading(`Looking forward to seeing you, ${f}.`),
        para(`Just a quick note to confirm we're calling out ${esc(visit)}.`, { pad: "14px 32px 0" }),
        checklist(
          "A few things before we arrive",
          PREP.map(([b, t]) => `<strong style="color:#1C1A18;">${esc(b)}</strong> ${esc(t)}`),
        ),
        para(`If anything comes up on the day, ring us on ${phoneLink()} and we'll sort it.`, { pad: "22px 32px 0" }),
        signoff("Talk soon,", "Nigel, Smart Space"),
      ],
      footer: { kind: "transactional", note: REMINDER_FOOTER },
    }),
    text: [
      `Hi ${f},`,
      "",
      `Just a quick note to confirm we're calling out ${visit}.`,
      "",
      "A few things before we arrive:",
      ...PREP.map(([b, t]) => `  - ${b} ${t}`),
      "",
      `If anything comes up on the day, ring us on ${BUSINESS_PHONE_DISPLAY} and we'll sort it.`,
      "",
      "Talk soon,",
      "Nigel, Smart Space",
      BUSINESS_PHONE_DISPLAY,
    ].join("\n"),
  };
}

export function reminderConsultation(d: { name: string; slot: string }): Email {
  const f = first(d.name);
  const preheader = `Tomorrow ${between(d.slot)}. Nothing to prepare, just be home for the slot.`;
  return {
    subject: `Tomorrow's visit with Smart Space, ${slotTo(d.slot)}`,
    preheader,
    html: renderEmail({
      title: "Tomorrow's booking with Smart Space",
      preheader,
      blocks: [
        eyebrow("Tomorrow's booking"),
        heading(`Looking forward to seeing you, ${f}.`),
        para(`Just a quick note to confirm we're calling out tomorrow ${esc(between(d.slot))} for your free site visit.`, { pad: "14px 32px 0" }),
        panel(
          "We'll walk the property with you, point out where Wi-Fi might struggle, and send you a written quote the same day. There's nothing to prepare. Just be home for the slot.",
        ),
        para(`If anything comes up on the day, ring us on ${phoneLink()} and we'll sort it.`, { pad: "22px 32px 0" }),
        signoff("Talk soon,", "Nigel, Smart Space"),
      ],
      footer: { kind: "transactional", note: REMINDER_FOOTER },
    }),
    text: [
      `Hi ${f},`,
      "",
      `Just a quick note to confirm we're calling out tomorrow ${between(d.slot)} for your free site visit.`,
      "",
      "We'll walk the property with you, point out where Wi-Fi might struggle, and send you a written quote the same day. There's nothing to prepare. Just be home for the slot.",
      "",
      `If anything comes up on the day, ring us on ${BUSINESS_PHONE_DISPLAY} and we'll sort it.`,
      "",
      "Talk soon,",
      "Nigel, Smart Space",
      BUSINESS_PHONE_DISPLAY,
    ].join("\n"),
  };
}

/**
 * The texts that go with the reminders.
 *
 * Rewritten from the paused cron's versions, which the studio showed billing
 * as three texts each: the slot's en dash is outside the GSM-7 alphabet, so
 * the whole message fell back to UCS-2 at 70 characters a text, and both ran
 * past 160 characters anyway. The slot is spelt "10:00 to 12:00" here, and
 * both fit one text for a first name up to fourteen letters.
 */
export const reminderSms = {
  install: (d: { name: string; slot: string }) =>
    `Hi ${first(d.name)}, Nigel from Smart Space. See you tomorrow, ${slotTo(d.slot)}. Have Wi-Fi at the install spot, the app installed and passwords ready. ${BUSINESS_PHONE_DISPLAY}`,
  consultation: (d: { name: string; slot: string }) =>
    `Hi ${first(d.name)}, Nigel from Smart Space. See you tomorrow, ${slotTo(d.slot)}, for your free site visit. Nothing to prepare. Any questions, ring ${BUSINESS_PHONE_DISPLAY}.`,
};

/* ── After the install: new ─────────────────────────────────────────── */

export function reviewRequest(d: { name: string; product: string }): Email {
  const f = first(d.name);
  const thing = productName(d.product) ?? "installation";
  const preheader = `How is your new ${thing} working? If anything's not right, reply and we'll sort it.`;
  return {
    subject: `How's everything working, ${f}?`,
    preheader,
    html: renderEmail({
      title: "How's everything working?",
      preheader,
      blocks: [
        eyebrow("After your install"),
        heading(`How's your new ${thing} working?`),
        para(
          `Thanks for having us in. If anything isn't working the way it should, reply to this email or ring ${phoneLink()} and we'll sort it.`,
          { size: 16, pad: "14px 32px 0" },
        ),
        para("If you're happy with the installation, a Google review helps other people find us.", { pad: "18px 32px 0" }),
        button("Leave a Google review", GOOGLE_REVIEW_URL),
        signoff("Thanks again,", "Nigel, Smart Space"),
      ],
      footer: {
        kind: "transactional",
        note: "A one-off follow-up to your installation with Smart Space. We only message you about your own installation.",
      },
    }),
    text: [
      `Hi ${f},`,
      "",
      `Thanks for having us in. How's your new ${thing} working?`,
      "",
      `If anything isn't working the way it should, reply to this email or ring ${BUSINESS_PHONE_DISPLAY} and we'll sort it.`,
      "",
      "If you're happy with the installation, a Google review helps other people find us:",
      GOOGLE_REVIEW_URL,
      "",
      "Thanks again,",
      "Nigel, Smart Space",
    ].join("\n"),
  };
}

/* ── Wi-Fi check: new, sent from src/app/api/wifi-check/route.ts ────── */

const LIGHT = {
  red: { hex: "#DC2626", text: "#B91C1C", word: "Red" },
  amber: { hex: "#F5B400", text: "#B45309", word: "Amber" },
  green: { hex: "#16A34A", text: "#15803D", word: "Green" },
} as const;

export function wifiReport(d: {
  name: string;
  light: "red" | "amber" | "green";
  headline: string;
  summary: string;
  reportUrl: string;
  recommend: string | null;
}): Email {
  const f = first(d.name);
  const L = LIGHT[d.light];
  const lamps = (["red", "amber", "green"] as const)
    .map(
      (k) =>
        `<td style="padding:0 4px;"><div style="width:18px;height:18px;border-radius:999px;background:${LIGHT[k].hex};opacity:${k === d.light ? 1 : 0.2};"></div></td>`,
    )
    .join("");
  const preheader = `${L.word}. ${d.headline}.`;
  return {
    subject: `Your Wi-Fi report: ${L.word}`,
    preheader,
    html: renderEmail({
      title: "Your Wi-Fi report",
      preheader,
      blocks: [
        eyebrow(`Your Wi-Fi report · ${L.word}`, L.text),
        heading(`${d.headline}, ${f}.`),
        `<tr><td class="px" style="padding:16px 32px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#1C1A18;border-radius:999px;"><tr><td style="padding:8px 10px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>${lamps}</tr></table></td></tr></table></td></tr>`,
        para(esc(d.summary), { size: 16, pad: "16px 32px 0" }),
        button("Open your full report", d.reportUrl, "ink"),
        ...(d.recommend
          ? [para(`What we recommend: <strong style="color:#1C1A18;">${esc(d.recommend)}</strong>. We'll ring you to talk it through.`, { pad: "22px 32px 0" })]
          : [para("We'll ring you to talk it through.", { pad: "22px 32px 0" })]),
        signoff("Talk soon,", "Nigel and the Smart Space team"),
      ],
      footer: {
        kind: "transactional",
        note: "You're receiving this because you asked for your Wi-Fi report on smart-space.ie.",
      },
    }),
    text: [
      `Hi ${f},`,
      "",
      `Your Wi-Fi check came out ${d.light}. ${d.headline}.`,
      d.summary,
      "",
      `Your full report: ${d.reportUrl}`,
      "",
      d.recommend ? `What we recommend: ${d.recommend}. We'll ring you to talk it through.` : "We'll ring you to talk it through.",
      "",
      `Smart Space, ${BUSINESS_PHONE_DISPLAY}, info@smart-space.ie`,
    ].join("\n"),
  };
}

