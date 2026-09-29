/**
 * Home network diagnosis: the three things we sell, and what the monitoring
 * unit does.
 *
 * Shaped by the market-entry briefing of 28 September 2026. The product is a
 * paid diagnosis, not an installation: we measure the house, leave a working
 * trial for three days, and give the customer the figures before they buy
 * anything. The fix, if they want one, is powerline carrying the connection to
 * properly sited access points, quoted from what was measured. Monitoring is
 * the optional third stage. The briefing's wording rules apply to every line
 * here and on the pages built from it:
 *
 *   - never call it Wi-Fi installation; it is network diagnosis;
 *   - say powerline out loud;
 *   - "monitored", never "managed";
 *   - avoid "professional-grade".
 *
 * One file, because the hub, the package pages, the Wi-Fi check report and
 * the lead email all name these, and a price changed in one place and not the
 * others is how a customer gets quoted two numbers.
 *
 * The prices are the briefing's working figures and are still Oscar's
 * decision ("Is €395 and a €1,395 install right?"). The install figure is not
 * published anywhere: the fix is quoted from the assessment's measurements.
 *
 * The monitoring unit is described by what it does, with no product names.
 */
import type { Light, PackageSlug } from "@/lib/wifi-check/grade";

export interface WifiPackage {
  slug: PackageSlug;
  name: string;
  /** One line under the name. */
  forWho: string;
  price: { kind: "fixed"; euro: number; note: string } | { kind: "monthly"; euro: number; note: string } | { kind: "quote"; note: string };
  /** The report lights that lead to this package. */
  lights: Light[];
  popular?: boolean;
  features: string[];
  /** Page copy: a short paragraph each. */
  intro: string;
  details: { title: string; body: string }[];
  faq: { q: string; a: string }[];
}

export const priceLabel = (p: WifiPackage) =>
  p.price.kind === "fixed"
    ? `€${p.price.euro} incl. VAT`
    : p.price.kind === "monthly"
      ? `From €${p.price.euro} a month`
      : "Quoted from your assessment";

export const priceNote = (p: WifiPackage) => p.price.note;

export const ASSESSMENT_EURO = 395;

export const WIFI_PACKAGES: WifiPackage[] = [
  {
    slug: "home-network-assessment",
    name: "Home Network Assessment",
    forWho: "For buffering, devices that drop offline, and rooms the Wi-Fi does not reach.",
    price: { kind: "fixed", euro: ASSESSMENT_EURO, note: "Credited in full against any work you go ahead with." },
    lights: ["amber", "red"],
    popular: true,
    features: [
      "A two-hour visit: your broadband tested at the router by cable, then every room measured",
      "The speed each floor of your house can actually carry, measured rather than estimated",
      "A working trial system installed on the floor that struggles",
      "Three days of continuous monitoring while you live with it",
      "A second visit to collect the equipment",
      "A written report: the figures, what they mean, and what we would recommend",
    ],
    intro:
      "We measure your house before you spend a euro. We test your broadband at the router and measure every floor, then leave a trial system working on the worst floor and monitor it for three days. You get a written report with the actual figures: whether the problem is your broadband or your house, and what we'd recommend.",
    details: [
      {
        title: "Tested at the router",
        body: "A wired test at the router shows what your broadband delivers before any Wi-Fi is involved, so the report can say whether the line itself is the problem.",
      },
      {
        title: "Measured floor by floor",
        body: "We measure the signal in every room and the speed on every floor, so the report shows where the connection is lost.",
      },
      {
        title: "A working trial, for three days",
        body: "We install a trial system on the worst floor and monitor it for three days. You live with it and judge it yourself before anyone spends money.",
      },
      {
        title: "A negative result is reported too",
        body: "If the trial doesn't perform well in your house, we'll tell you, and you keep the measurements to take elsewhere.",
      },
    ],
    faq: [
      {
        q: "What does the €395 cover?",
        a: "The visit, the trial system for three days, the monitoring, the collection visit and the written report. It is credited in full against any work you go ahead with.",
      },
      {
        q: "Do I need to change my broadband provider?",
        a: "No. We test the line you have. If the report shows the line itself is the problem, you have the figures to take to your provider.",
      },
      {
        q: "Will you run cables through the walls?",
        a: "No. The fix carries your connection over the electrical wiring already in the house, powerline, to access points placed where they are needed.",
      },
      {
        q: "Which areas do you cover?",
        a: "Dublin and the rest of Leinster, the same area as our smart security installations.",
      },
    ],
  },
  {
    slug: "powerline-access-points",
    name: "Powerline and Access Points",
    forWho: "The fix, quoted from the figures your assessment measured.",
    price: { kind: "quote", note: "Your €395 assessment is credited in full against it." },
    lights: ["amber", "red"],
    features: [
      "Quoted from your assessment's measurements",
      "Powerline carries the connection over your electrical wiring",
      "Access points placed where the measurements say",
      "One network name and password throughout",
      "Configured and tested floor by floor before we leave",
    ],
    intro:
      "Powerline adapters carry your broadband over the electrical wiring already in your walls, to an access point on each floor that needs one. Your phones, TVs, cameras and thermostats connect to the nearest access point, on one network.",
    details: [
      {
        title: "Powerline, measured first",
        body: "How fast powerline runs depends on the wiring in each house. The assessment measures it in yours, and the quote is based on those figures.",
      },
      {
        title: "Placed by measurement",
        body: "Each access point goes where the survey measured the need, on the floor and in the room where devices were dropping out.",
      },
      {
        title: "Tested before we leave",
        body: "We configure the system and test it on every floor, including the rooms that gave you trouble.",
      },
      {
        title: "The assessment, credited",
        body: "The €395 you paid for the assessment comes off this work in full.",
      },
    ],
    faq: [
      {
        q: "Is powerline reliable?",
        a: "It depends on the wiring, which is why the trial runs in your house for three days before you buy anything, and the report shows the figures it achieved.",
      },
      {
        q: "Will my smart devices work with it?",
        a: "Yes. Cameras, doorbells, thermostats, speakers and TVs join the access points the same way a phone does.",
      },
      {
        q: "Which areas do you cover?",
        a: "Dublin and the rest of Leinster, the same area as our smart security installations.",
      },
    ],
  },
  {
    slug: "network-monitoring",
    name: "Network Monitoring",
    forWho: "For households that want to know when the broadband, or a device that matters, goes offline.",
    price: { kind: "monthly", euro: 39, note: "A supported plan with an annual visit and remote support is around €89 a month." },
    lights: ["amber", "red"],
    features: [
      "A small monitoring unit connected to your router",
      "An alert to us when your broadband fails",
      "An alert when a device that matters to you goes offline",
      "Broadband speed tested every six hours, with the history kept",
      "A plain-English health report every month",
    ],
    intro:
      "A small monitoring unit stays connected to your router. When your broadband fails, or a device that matters to you drops offline, we know. Every month you get a short report in plain English: what happened, whether it mattered, and anything that needs attention.",
    details: [
      {
        title: "Your broadband, watched",
        body: "The unit tests your broadband every six hours and keeps every result, so a line that slows every evening shows up in the history.",
      },
      {
        title: "The devices that matter",
        body: "Name the devices you care about, a camera, the thermostat, a parent's alarm, and we're alerted when one goes offline and how long it was off.",
      },
      {
        title: "A report every month",
        body: "Availability, outages, anything that changed, and one recommendation. We send one in a quiet month too.",
      },
      {
        title: "Monitored, not managed",
        body: "Monitoring tells us a device is offline. It gives us no access to the device or its content, and your accounts stay in your name.",
      },
    ],
    faq: [
      {
        q: "What does the monitoring unit look at?",
        a: "Whether your broadband is up and how fast it runs, which devices are connected, and whether each device you named is online.",
      },
      {
        q: "Can you fix things remotely?",
        a: "We can see what failed and when, and read the history when you ring. Devices like Nest and Ring live in your own account, so some fixes still need you or a visit.",
      },
      {
        q: "Can I have monitoring without the assessment?",
        a: "Yes. The unit connects to the router you already have.",
      },
    ],
  },
];

export const packageBySlug = (slug: string | null | undefined) =>
  WIFI_PACKAGES.find((p) => p.slug === slug) ?? null;

/** What the monitoring unit does, as the hub lists it. */
export const MONITOR_POINTS: { title: string; body: string }[] = [
  {
    title: "Broadband watched",
    body: "An alert reaches us when your line fails, and the history shows how it performed overnight.",
  },
  {
    title: "Devices that matter",
    body: "An alert when a camera, thermostat or alarm you named goes offline, and how long it was off.",
  },
  {
    title: "Speed, four times a day",
    body: "Your broadband tested every six hours, every result kept.",
  },
  {
    title: "New devices flagged",
    body: "A device joining your network for the first time is flagged.",
  },
  {
    title: "A report every month",
    body: "Short and plain: what happened, whether it mattered, and anything that needs attention.",
  },
  {
    title: "Monitored, not managed",
    body: "We see whether a device is online, not what it does. Your accounts stay in your name.",
  },
];

/** The three symptoms the diagnosis is for, as the hub lists them. */
export const SYMPTOMS: { title: string; body: string }[] = [
  {
    title: "Buffering",
    body: "The TV stalls in the evening, or a video call freezes, while the broadband looks fine at the router.",
  },
  {
    title: "Devices dropping off",
    body: "A camera, doorbell or thermostat keeps going offline and coming back. When that happens, the network is the first thing to check.",
  },
  {
    title: "Dead rooms",
    body: "Fine downstairs, hopeless upstairs, or nothing at all in the back bedroom or the garden room.",
  },
];
