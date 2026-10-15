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

const SITE = "https://smart-space.ie";
const POWERLINE = "The fix uses powerline, which carries the network over the electrical wiring already in your walls.";
const BOOK = "mailto:info@smart-space.ie?subject=Network%20assessment";

/* ── The announcement: SmartSpace Networks and SmartGuardian together ── */
/*
 * Nigel's sign-off notes of 15 October 2026 asked for Version A to be
 * rewritten in his own words and merged with the SmartGuardian announcement.
 * The network paragraphs are his, word for word bar typos; his note was cut
 * off by the sign-off form's 2,000-character limit mid-sentence ("the report
 * will show where wired access points should"), so that sentence is finished
 * with "go." and nothing is added after it. The SmartGuardian half is the one
 * below (SG_INTRO, SG_POINTS), with his price line.
 *
 * Because it now advertises SmartCare Living's product, it may go only to
 * people who said yes to marketing (see mailing-rules.ts).
 */
export function networkDiagnosisA(r: Recipient): Email {
  const f = first(r.name);
  const subject = "Two new things from Smart Space";
  const preheader = "Try a home network upgrade in your own home before you spend a cent, and meet SmartGuardian.";
  const book = `${SITE}/services/wifi/home-network-assessment`;
  const report = `${SITE}/network-sample-report.html`;
  const net = [
    "A quick note about something new we're offering. As far as we know it's an Ireland first: you try a tailored home network upgrade in your own home before you spend a cent on it.",
    "If your broadband is fine downstairs but slow upstairs, the TV buffers in the evening, or a camera or thermostat keeps dropping offline, we can find out why and let you test the upgrade for yourself.",
    "We visit, test your broadband at the router, and measure signal strength room by room. We then set up a trial system in the part of the house with the problem, using the latest powerline and Wi-Fi 6 equipment. Powerline carries the network over the electrical wiring already in your walls. If you've already tried powerline and it let you down, ours uses the next generation G.hn standard, coupled with the latest tri-band mesh system.",
    "For three days you live with it. We can move up to three problem devices, like a TV that buffers, onto the trial network, monitor them the whole time, and report any time they drop offline. You can switch your phone or laptop over too and use it the way you normally would. We don't switch off your existing Wi-Fi, so you can compare the two and nothing stops working. We also test the broadband coming in from your provider.",
  ];
  const reportLine = "After the three days we send you a written report with the actual figures. You can see a sample report here:";
  const after = [
    "We then call you to go through your report and arrange a date and time to either remove our trial system or install the complete one.",
    "This service is for people who want to try the latest options before deciding their house needs cables run through it, which is more disruptive, costs more, and isn't something we offer. If the trial doesn't work in your house, you'll know you've tried everything else first, and the report will show where wired access points should go.",
    "The assessment is €395 including VAT.",
  ];
  const sgLead = "And a second piece of news: our sister company, SmartCare Living, now offers SmartGuardian, a service for older people living at home.";
  const P = (t: string) => para(t, { size: 16, pad: "14px 32px 0" });
  return {
    subject,
    preheader,
    html: renderEmail({
      title: subject,
      preheader,
      blocks: [
        eyebrow("New from Smart Space"),
        heading("Try a home network upgrade before you spend a cent"),
        para(`Hi ${esc(f)},`, { size: 16, pad: "18px 32px 0" }),
        ...net.map((t) => P(esc(t))),
        P(`${esc(reportLine)} <a href="${esc(report)}" style="color:#1C1A18;font-weight:700;text-decoration:underline;">see a sample report</a>.`),
        ...after.map((t) => P(esc(t))),
        button("Book a home network assessment", book),
        P(esc(sgLead)),
        smartGuardianFeature(),
        para(
          `The SmartGuardian consultation is free. <a href="${esc(SG_CONSULT)}" style="color:${SCL_TEAL};font-weight:700;text-decoration:underline;">Book a complimentary consultation</a>, or ring the same number as always, 01 513 0424.`,
          { size: 16, pad: "22px 32px 0" },
        ),
        signoff("All the best,", "Nigel"),
      ],
      footer: { kind: "marketing", reason: REASON[r.basis], unsubscribeUrl: r.unsubscribeUrl },
    }),
    text: [
      `Hi ${f},`,
      "",
      ...net.flatMap((t) => [t, ""]),
      `${reportLine} ${report}`,
      "",
      ...after.flatMap((t) => [t, ""]),
      `Book a home network assessment: ${book}`,
      "",
      sgLead,
      "",
      SG_INTRO,
      "",
      ...SG_POINTS.map((t) => `  - ${t}`),
      "",
      SG_PRICE,
      "",
      `Take the 2-minute assessment: ${SG_ASSESSMENT}`,
      `The SmartGuardian consultation is free. Book one here: ${SG_CONSULT}`,
      "Or ring the same number as always, 01 513 0424.",
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

const SG_ASSESSMENT = `${SCL}/assessment?${utm("assessment")}`;
const SG_CONSULT = `${SCL}/book-consultation?service=smartguardian&${utm("consultation")}`;
const SG_POINTS = [
  "Detects a fall automatically, including gradual collapses and slides to the floor. Nothing to press.",
  "Shows how time in bed, hours of movement and trips to the bathroom at night change week to week.",
  "Alerts up to four family members through the SmartCare Living app.",
  "No video of your loved one is ever recorded.",
];
/* Nigel's wording, sign-off note of 15 October 2026. */
const SG_PRICE = "From €549 to install (first room), then €119 a month. Cancel anytime.";

/** SmartGuardian's panel in the announcement. */
function smartGuardianFeature(): string {
  return feature({
    accent: SCL_TEAL,
    tint: "#eef6f6",
    tag: "SmartCare Living",
    title: "SmartGuardian",
    logo: { src: `${SCL}/images/logo-square.png`, alt: "SmartCare Living", width: 56 },
    bodyHtml: `<p style="margin:0 0 12px;">${esc(SG_INTRO)}</p>
<ul style="margin:0;padding-left:20px;">${SG_POINTS.map((p) => `<li style="margin-bottom:8px;">${esc(p)}</li>`).join("")}</ul>
<p style="margin:12px 0 0;font-size:14px;color:#5a524c;">${esc(SG_PRICE)}</p>`,
    cta: { label: "Take the 2-minute assessment", href: SG_ASSESSMENT },
  });
}
