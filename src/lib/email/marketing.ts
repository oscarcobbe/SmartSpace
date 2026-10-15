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
 * There is one mailing: the SmartSpace Networks and SmartGuardian
 * announcement below. The briefing's Version B (for security customers) was
 * removed on 15 October 2026 after Nigel said it was the same email.
 */
import { button, esc, eyebrow, feature, heading, link, para, renderEmail, signoff, steps } from "./layout";
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

/* ── The announcement: SmartSpace Networks and SmartGuardian together ── */
/*
 * Nigel's sign-off notes of 15 October 2026 asked for the network email to
 * be "something along the lines of" his own draft, merged with the
 * SmartGuardian announcement, and said Version B was the same email. So this
 * is the only mailing. The network half is his draft, tightened: every claim
 * in it is his or the live service page's (Ireland's first and "before you
 * spend a cent" are his, kept on Oscar's word on 12 October; G.hn, Wi-Fi 6E,
 * three days, up to three devices, the second visit and the credit are the
 * page's). His note was cut off mid-sentence at the form's old limit, so the
 * last sentence ends where it was clearly going ("...should go").
 *
 * Because it advertises SmartCare Living's product, it may go only to people
 * who said yes to marketing (see mailing-rules.ts).
 */
const NET_ASSESS = `${SITE}/services/wifi/home-network-assessment`;
const NET_REPORT = `${SITE}/network-sample-report.html`;
const NET_INTRO =
  "If your broadband is fine downstairs but slow upstairs, the TV buffers in the evening, or a camera or thermostat keeps dropping offline, we find out why, then let you try the fix in your own home. As far as we know, it's an Ireland first.";
const NET_STEPS = [
  "We visit, test your broadband at the router, and measure the signal room by room.",
  "We set up a trial system in the part of the house with the problem. It uses G.hn powerline, which carries the network over the electrical wiring already in your walls, and a tri-band Wi-Fi 6E access point. If you tried powerline before and it let you down, this is the next generation.",
  "You live with it for three days. We move up to three problem devices onto it, like a TV that buffers, and record every time one drops offline. Switch your phone or laptop over too and use it as you normally would. Your own Wi-Fi stays on, so you can compare the two and nothing stops working.",
  "We send you a written report with the actual figures, including what your provider's broadband is really delivering. Then we ring you to go through it and arrange a time to collect the trial kit or install the full system.",
];
const NET_WHO =
  "It's for anyone who would rather try the latest options before deciding the house needs cables run through it, which is more disruptive, costs more, and isn't something we do. If the trial doesn't solve it, you'll know you've tried everything else first, and the report will show where wired access points should go.";
const NET_PRICE = "The assessment is €395 including VAT, and it's credited in full against any work you go ahead with.";
const SG_LEAD = "And from our sister company, SmartCare Living: SmartGuardian, for older people living at home and the family who look out for them.";

export function networkDiagnosisA(r: Recipient): Email {
  const f = first(r.name);
  const subject = "Two new services from Smart Space";
  const preheader = "Try a better home network in your own home before you spend a cent on it, and meet SmartGuardian.";
  const P = (html: string, pad = "14px 32px 0") => para(html, { size: 16, pad });
  const title = (t: string) =>
    para(`<strong style="font-size:20px;line-height:1.3;color:#1C1A18;">${esc(t)}</strong>`, { pad: "8px 32px 0" });
  return {
    subject,
    preheader,
    html: renderEmail({
      title: subject,
      preheader,
      blocks: [
        eyebrow("New from Smart Space"),
        heading(subject),
        P(`Hi ${esc(f)},`, "18px 32px 0"),
        P(
          "A quick note about two new things we're offering: a home network upgrade you try in your own home before you buy it, and SmartGuardian, from our sister company SmartCare Living.",
        ),
        eyebrow("SmartSpace Networks"),
        title("Try a better home network before you spend a cent on it"),
        P(esc(NET_INTRO)),
        steps("How the three days work", NET_STEPS.map(esc)),
        P(esc(NET_WHO), "0 32px 0"),
        P(`<strong style="color:#1C1A18;">${esc(NET_PRICE)}</strong>`),
        button("Book a home network assessment", NET_ASSESS),
        P(`Or ${link(NET_REPORT, "see a sample report")} first.`),
        eyebrow("SmartGuardian", SCL_TEAL),
        P(esc(SG_LEAD), "8px 32px 0"),
        smartGuardianFeature(),
        P(
          `The SmartGuardian consultation is free. <a href="${esc(SG_CONSULT)}" style="color:${SCL_TEAL};font-weight:700;text-decoration:underline;">Book a complimentary consultation</a>, or ring the same number as always, 01 513 0424.`,
          "22px 32px 0",
        ),
        signoff("All the best,", "Nigel"),
      ],
      footer: { kind: "marketing", reason: REASON[r.basis], unsubscribeUrl: r.unsubscribeUrl },
    }),
    text: [
      `Hi ${f},`,
      "",
      "A quick note about two new things we're offering: a home network upgrade you try in your own home before you buy it, and SmartGuardian, from our sister company SmartCare Living.",
      "",
      "SMARTSPACE NETWORKS: TRY A BETTER HOME NETWORK BEFORE YOU SPEND A CENT ON IT",
      "",
      NET_INTRO,
      "",
      "How the three days work:",
      ...NET_STEPS.map((t, n) => `  ${n + 1}. ${t}`),
      "",
      NET_WHO,
      "",
      NET_PRICE,
      "",
      `Book a home network assessment: ${NET_ASSESS}`,
      `See a sample report: ${NET_REPORT}`,
      "",
      "SMARTGUARDIAN",
      "",
      SG_LEAD,
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

const SG_INTRO = "Sensors in the home, with nothing to wear and nothing to press.";

const SG_ASSESSMENT = `${SCL}/assessment?${utm("assessment")}`;
const SG_CONSULT = `${SCL}/book-consultation?service=smartguardian&${utm("consultation")}`;
const SG_POINTS = [
  "Detects a fall automatically, including gradual collapses and slides to the floor.",
  "Shows how time in bed, hours of movement and trips to the bathroom at night change week to week.",
  "Alerts up to four family members through the SmartCare Living app.",
  "No video of your loved one is ever recorded.",
];
/* Nigel's corrected wording, his second sign-off note of 15 October 2026
   (16:25 UTC): the first room is €549 and each room after it costs less. */
const SG_PRICE = "€549 to install the first room, less for each room after that. €119 a month rental. Cancel anytime.";

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
<p style="margin:14px 0 0;font-size:15px;font-weight:700;color:#1C1A18;">${esc(SG_PRICE)}</p>`,
    cta: { label: "Take the 2-minute assessment", href: SG_ASSESSMENT },
  });
}
