/**
 * Emails to the existing Smart Space customer base: announcements, not
 * transactions.
 *
 * These are drafts to design, and nothing sends them. A send to a thousand
 * past customers needs, before the first one goes: a working unsubscribe on
 * every email (List-Unsubscribe header and a link) with a suppression list
 * that is honoured, the consent position for those addresses confirmed, a
 * sending address that is not the one Nigel's receipts go out on (a
 * complaint on a bulk send must not land on bookings.smart-space.ie), and
 * batches rather than one blast. The briefing of 28 September 2026 proposes
 * fifty a day.
 *
 * The two network-diagnosis emails are the briefing's Version A and Version
 * B, held to Oscar's copy rules: claims nobody can check are out ("the most
 * common thing we hear", "the number of connected devices in the average home
 * has kept climbing", "almost never the devices"), and so are sentences about
 * what the work does not involve. Powerline is said out loud instead, as the
 * briefing asks. [OFFER] stays visibly unwritten until Nigel says what
 * existing customers get.
 */
import { button, esc, eyebrow, feature, heading, para, placeholder, renderEmail, signoff } from "./layout";
import type { Email } from "./customer";

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export interface Recipient {
  name: string;
  unsubscribeUrl: string;
  /** Why this person may be emailed, which is also what the footer tells them. */
  basis: "customer" | "consent";
}

const REASON: Record<Recipient["basis"], string> = {
  customer: "You're receiving this because you bought from Smart Space in the last 12 months.",
  consent: "You're receiving this because you said yes to emails from Smart Space.",
};

const POWERLINE = "The fix uses powerline, which carries the network over the electrical wiring already in your walls.";
const BOOK = "mailto:info@smart-space.ie?subject=Network%20assessment";

/* ── Network diagnosis, Version A: problem-led, for most of the base ─── */

export function networkDiagnosisA(r: Recipient): Email {
  const f = first(r.name);
  const subject = "Does your Wi-Fi drop upstairs?";
  const preheader = "A three-day trial in your house, then a written report with the actual figures.";
  const paras = [
    "A quick note about something new we're offering.",
    "If your broadband is fine downstairs but slow upstairs, the TV buffers in the evening, or a camera or thermostat keeps dropping offline, we can now find out why and fix it.",
    "We visit, test your broadband at the router, and measure signal strength room by room. We then install a trial system in the part of your house with the problem, and leave a monitoring device connected to your router for three days.",
    "You live with the trial for those three days and judge it yourself. We come back, collect everything, and send you a written report with the actual figures: whether your broadband is at fault, whether it's your Wi-Fi, and what we'd recommend.",
    "If the trial doesn't perform well in your house, the report says so. You find out what works before you pay for the fix.",
    POWERLINE,
  ];
  const offerHtml = `The assessment is €395 including VAT, and it's credited in full against any work you go ahead with. As an existing customer, ${placeholder("OFFER")}.`;
  const offerText = "The assessment is €395 including VAT, and it's credited in full against any work you go ahead with. As an existing customer, [OFFER].";
  return {
    subject,
    preheader,
    html: renderEmail({
      title: subject,
      preheader,
      blocks: [
        eyebrow("New from Smart Space"),
        heading(subject),
        para(`Hi ${esc(f)},`, { size: 16, pad: "18px 32px 0" }),
        ...paras.map((p) => para(esc(p), { size: 16, pad: "14px 32px 0" })),
        para(offerHtml, { size: 16, pad: "14px 32px 0" }),
        para("Just reply to this email if you'd like to book one, or if you want to talk it through first.", { size: 16, pad: "14px 32px 0" }),
        button("Reply to book an assessment", BOOK),
        signoff("All the best,", "Nigel"),
      ],
      footer: { kind: "marketing", reason: REASON[r.basis], unsubscribeUrl: r.unsubscribeUrl },
    }),
    text: [
      `Hi ${f},`,
      "",
      ...paras.flatMap((p) => [p, ""]),
      offerText,
      "",
      "Just reply to this email if you'd like to book one, or if you want to talk it through first.",
      "",
      "All the best,",
      "Nigel",
      "",
      `${REASON[r.basis]} Unsubscribe: ${r.unsubscribeUrl}`,
    ].join("\n"),
  };
}

/* ── Network diagnosis, Version B: for security and SmartGuardian customers ─ */

export function networkDiagnosisB(r: Recipient): Email {
  const f = first(r.name);
  const subject = "Is a camera or doorbell dropping offline?";
  const preheader = "We now measure the network behind your devices, over three days.";
  const paras = [
    "Cameras, doorbells, thermostats, TVs and speakers all depend on your home network. Where the Wi-Fi is weak, they drop offline or stop responding.",
    "We now offer a home network assessment that measures it.",
    "We test your broadband at the router, measure the signal in every room, then install a trial system in the worst part of the house and leave monitoring equipment connected for three days. You live with it, and we come back with a written report showing what your line actually does, what each floor can carry, and what we'd recommend.",
    "If the trial doesn't work well in your house, the report says so, and you keep the measurements.",
    POWERLINE,
  ];
  return {
    subject,
    preheader,
    html: renderEmail({
      title: subject,
      preheader,
      blocks: [
        eyebrow("For Smart Space customers"),
        heading(subject),
        para(`Hi ${esc(f)},`, { size: 16, pad: "18px 32px 0" }),
        ...paras.map((p) => para(esc(p), { size: 16, pad: "14px 32px 0" })),
        para(`The assessment is €395 including VAT, credited in full against any work you decide to do. ${placeholder("OFFER")}`, { size: 16, pad: "14px 32px 0" }),
        para("Reply here to book a visit.", { size: 16, pad: "14px 32px 0" }),
        button("Reply to book a visit", BOOK),
        signoff("All the best,", "Nigel"),
      ],
      footer: { kind: "marketing", reason: REASON[r.basis], unsubscribeUrl: r.unsubscribeUrl },
    }),
    text: [
      `Hi ${f},`,
      "",
      ...paras.flatMap((p) => [p, ""]),
      "The assessment is €395 including VAT, credited in full against any work you decide to do. [OFFER]",
      "",
      "Reply here to book a visit.",
      "",
      "All the best,",
      "Nigel",
      "",
      `${REASON[r.basis]} Unsubscribe: ${r.unsubscribeUrl}`,
    ].join("\n"),
  };
}

/* ── Sister company: SmartCare Living and SmartGuardian ─────────────────── */
/*
 * Every product statement below is the SmartCare Living site's own wording
 * (smartguardian.html, services.html, legal/disclaimer.html,
 * book-consultation.html, as of 28 September 2026). Left out on purpose,
 * because the site does not support them or has withdrawn them: any HSE
 * partnership, the SME award (the site credits it to two different
 * companies), "no monthly contract" (it is €119 a month), glass-break,
 * coughing and wandering detection (another service, or nowhere), and
 * anything that reads as a medical device or a monitoring centre: the site
 * says it does not call the emergency services.
 *
 * The earlier drafts in ad-assets/email-outreach (04a to 04g, June 2026)
 * carry several of those claims and should not be sent.
 */

const SCL = "https://www.smartcareliving.ie";
const SCL_TEAL = "#056d70";
const utm = (content: string) =>
  `utm_source=smart-space&utm_medium=email&utm_campaign=scl-smartguardian-announce&utm_content=${content}`;

const SG_INTRO =
  "SmartGuardian's sensors show how the everyday pattern changes (sleep, movement, trips to the bathroom at night) and catch a fall automatically when one happens. There is nothing to wear, and no video.";

export function smartGuardianAnnouncement(r: Recipient): Email {
  const f = first(r.name);
  const subject = "Meet our sister company, SmartCare Living";
  const preheader = "SmartGuardian catches a fall automatically. Nothing to wear, and no video.";
  const assessment = `${SCL}/assessment?${utm("assessment")}`;
  const consult = `${SCL}/book-consultation?service=smartguardian&${utm("consultation")}`;
  const points = [
    "Detects a fall automatically, including gradual collapses and slides to the floor. Nothing to press.",
    "Shows how time in bed, hours of movement and trips to the bathroom at night change week to week.",
    "Alerts up to four family members through the SmartCare Living app.",
    "No video of your loved one is ever recorded.",
  ];
  return {
    subject,
    preheader,
    html: renderEmail({
      title: subject,
      preheader,
      blocks: [
        eyebrow("News from Smart Space"),
        heading(subject),
        para(`Hi ${esc(f)},`, { size: 16, pad: "18px 32px 0" }),
        para("A quick note about our sister company, SmartCare Living, and its service for older people living at home: SmartGuardian.", {
          size: 16,
          pad: "14px 32px 0",
        }),
        feature({
          accent: SCL_TEAL,
          tint: "#eef6f6",
          tag: "SmartCare Living",
          title: "SmartGuardian",
          logo: { src: `${SCL}/images/logo-square.png`, alt: "SmartCare Living", width: 56 },
          bodyHtml: `<p style="margin:0 0 12px;">${esc(SG_INTRO)}</p>
<ul style="margin:0;padding-left:20px;">${points.map((p) => `<li style="margin-bottom:8px;">${esc(p)}</li>`).join("")}</ul>
<p style="margin:12px 0 0;font-size:14px;color:#5a524c;">From €549 to install, then €119 a month. Cancel anytime.</p>`,
          cta: { label: "Take the 2-minute assessment", href: assessment },
        }),
        para(
          `The consultation is free. <a href="${esc(consult)}" style="color:${SCL_TEAL};font-weight:700;text-decoration:underline;">Book a complimentary consultation</a>, or ring the same number as always, 01 513 0424.`,
          { size: 16, pad: "22px 32px 0" },
        ),
        signoff("All the best,", "Nigel"),
      ],
      footer: { kind: "marketing", reason: REASON[r.basis], unsubscribeUrl: r.unsubscribeUrl },
    }),
    text: [
      `Hi ${f},`,
      "",
      "A quick note about our sister company, SmartCare Living, and its service for older people living at home: SmartGuardian.",
      "",
      SG_INTRO,
      "",
      ...points.map((p) => `  - ${p}`),
      "",
      "From €549 to install, then €119 a month. Cancel anytime.",
      "",
      `Take the 2-minute assessment: ${assessment}`,
      "",
      `The consultation is free. Book one here: ${consult}`,
      "Or ring the same number as always, 01 513 0424.",
      "",
      "All the best,",
      "Nigel",
      "",
      `${REASON[r.basis]} Unsubscribe: ${r.unsubscribeUrl}`,
    ].join("\n"),
  };
}
