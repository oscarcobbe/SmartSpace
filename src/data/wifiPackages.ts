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
  /** Guides and pages to link quietly from the package page, most relevant first. */
  related: { href: string; label: string }[];
}

export const priceLabel = (p: WifiPackage) =>
  p.price.kind === "fixed"
    ? `€${p.price.euro} incl. VAT`
    : p.price.kind === "monthly"
      ? `From €${p.price.euro} a month`
      : "Quoted from your assessment";

export const priceNote = (p: WifiPackage) => p.price.note;

export const ASSESSMENT_EURO = 395;
export const EVIDENCE_EURO = 199;

export const WIFI_PACKAGES: WifiPackage[] = [
  {
    slug: "home-network-assessment",
    name: "Home Network Assessment",
    forWho: "Try better Wi-Fi in your own home for 3 days before you buy it.",
    price: { kind: "fixed", euro: ASSESSMENT_EURO, note: "Credited in full against any work you go ahead with." },
    lights: ["amber", "red"],
    popular: true,
    features: [
      "A first visit of about 2 hours: your broadband tested at the router by cable, then every floor measured",
      "A working trial system on your weakest floor, beside your own Wi-Fi",
      "Speed measured every hour for 3 days, evenings included",
      "Up to 3 of your problem devices moved onto the trial and watched",
      "A plain-English report and a 30-minute call to go through it",
      "A second visit to collect the trial kit, or install your new system",
    ],
    intro:
      "The speed printed on a box in a shop was measured in a lab, not in your house. So we bring the solution to your home first and let it prove itself there. We test your broadband at the router, measure every floor, and leave a working system on your weakest floor for 3 days. Then you see the numbers and decide, with no pressure to buy.",
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
        body: "We set up a working system where your Wi-Fi is weakest, running beside your own network. Nothing of yours is switched off. Speed and steadiness are recorded every hour, day and night, including the evenings when everyone is online. Stream, work and game as normal.",
      },
      {
        title: "Your problem devices, watched",
        body: "We move up to 3 of the devices that give you the most trouble, like a smart TV or a Nest thermostat, onto the trial and track them for all 3 days. The report shows if they ever dropped off, and when.",
      },
      {
        title: "A clear answer either way",
        body: "Either the trial fixes it without cables, or the measurements prove it can't, and the report shows which floors and rooms need a cabled connection.",
      },
    ],
    faq: [
      {
        q: "What does the €395 cover?",
        a: "The first visit, the trial system for 3 days, the hourly measurements, the report and the 30-minute call, and the second visit. It is credited in full against any work you go ahead with.",
      },
      {
        q: "Do I need to change my broadband provider?",
        a: "No. We test the line you have. If the report shows the line itself is the problem, you have the figures to take to your provider.",
      },
      {
        q: "Do I have to buy anything after the assessment?",
        a: "No. You get the report either way, and the €395 is credited in full if you go ahead with any work.",
      },
      {
        q: "Will you run cables through the walls?",
        a: "No. The fix carries your connection over the electrical wiring already in the house, powerline, to access points placed where they are needed. If nothing can be fixed without cables, the report says so plainly and shows which rooms need one.",
      },
      {
        q: "Which areas do you cover?",
        a: "Dublin and the rest of Leinster, the same area as our smart security installations.",
      },
    ],
    related: [
      { href: "/services/wifi", label: "How the 3-day trial works" },
      { href: "/network-sample-report.html", label: "A sample report" },
      { href: "/blog/broadband-speed-test-ireland-line-or-wifi", label: "Is it the line or the Wi-Fi?" },
      { href: "/blog/why-wifi-slow-upstairs-irish-homes", label: "Slow upstairs" },
      { href: "/blog/wifi-slow-in-the-evening-ireland", label: "Evening slowdowns" },
      { href: "/wifi-check", label: "The free Wi-Fi check" },
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
      "G.hn powerline carries your connection through your home's existing electrical wiring, to a tri-band Wi-Fi 6E access point on each floor that needs one. No drilling, no trunking, no mess. Your phones, TVs, cameras and thermostats connect to the nearest access point, on one network.",
    details: [
      {
        title: "Powerline, measured first",
        body: "How fast powerline runs depends on the wiring in each house. The assessment tests several sockets on each floor of yours, and the quote is based on those figures.",
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
        a: "It depends on the wiring, which is why the trial runs in your house for 3 days before you buy anything, measured every hour, and the report shows the figures it achieved.",
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
    related: [
      { href: "/services/wifi", label: "Try it for 3 days first" },
      { href: "/blog/powerline-adapters-ireland", label: "Powerline in Irish houses" },
      { href: "/blog/wifi-extender-mesh-or-powerline-ireland", label: "Extender, mesh or powerline" },
      { href: "/blog/mesh-wifi-explained", label: "Mesh explained" },
      { href: "/blog/running-ethernet-cable-existing-house-ireland", label: "When cable is the answer" },
    ],
  },
  {
    slug: "network-monitoring",
    name: "Network Monitoring",
    forWho: "For households that want to know when the broadband, or a device that matters, goes offline.",
    price: { kind: "monthly", euro: 39, note: "A supported plan with an annual visit and remote support is around €89 a month." },
    lights: ["amber", "red"],
    features: [
      "A small, silent monitoring unit wired to your router",
      "An alert to us when your broadband goes down, and when it comes back",
      "An alert when a device you named goes offline",
      "Broadband speed tested every six hours, with the history kept",
      "New devices and open router ports flagged",
      "A plain-English health report every month",
    ],
    intro:
      "A small box keeps an eye on your network around the clock, so we often know about a problem before you do. When your broadband fails, or a device that matters to you drops offline, we know. Every month you get a short report in plain English: uptime, outages and evening speeds.",
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
        a: "Whether your broadband is up and how fast it runs, every device connected to your network, whether each device you named is online, and any port on your router opened to the internet. It does not see what you browse, stream or record.",
      },
      {
        q: "Is it noisy, or does it need looking after?",
        a: "No. It has no fan and no moving parts, and its software updates itself.",
      },
      {
        q: "What happens if it gets unplugged?",
        a: "We see the connection drop, the same as a broadband outage, and it carries on where it left off once it is plugged back in.",
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
    related: [
      { href: "/services/wifi", label: "The 3-day trial" },
      { href: "/blog/wifi-slow-in-the-evening-ireland", label: "Evening slowdowns" },
      { href: "/blog/smart-camera-wifi-drops-irish-homes", label: "Devices dropping off" },
      { href: "/blog/secure-home-wifi-ireland", label: "Securing your Wi-Fi" },
    ],
  },
];

/*
 * The broadband evidence service, from Nigel's trial page and his reply of
 * 12 October 2026: ready to sell, boxes in hand, €199 including VAT, Dublin
 * and Leinster only because he goes through the results in the home and
 * collects the box.
 */
WIFI_PACKAGES.push({
  slug: "broadband-evidence",
  name: "Broadband Evidence Service",
  forWho: "Think your provider is letting you down? Get the evidence they need to take you seriously.",
  price: { kind: "fixed", euro: EVIDENCE_EURO, note: "No assessment needed. Dublin and Leinster." },
  lights: ["amber", "red"],
  features: [
    "A small box posted to you, with the cable to plug it into your router",
    "Your line logged for 7 days: dropouts and delays every minute",
    "Speed tests through the day and evening",
    "A one-page report: every dropout, slowdown and evening speed against what you pay for",
    "We go through it with you in your home and collect the box",
  ],
  intro:
    "Hard numbers, not \"it feels slow\". We post you a small box that plugs into your router and logs your broadband line for 7 days, every minute, day and evening. Then we write a one-page report showing every dropout, every slowdown and your evening speeds against the speed you pay for, ready to send to your provider.",
  details: [
    {
      title: "Book, and we post you a box",
      body: "Book and tell us the speed you pay for. We post you a small box. Plug it into your router with the cable supplied. That's it.",
    },
    {
      title: "Your line, logged for 7 days",
      body: "Dropouts and delays are recorded every minute, with speed tests through the day and evening, so the busy hours are in the record too.",
    },
    {
      title: "One page your provider can't argue with",
      body: "Every dropout, slowdown and evening speed against what you pay for, on one page you can send to your provider.",
    },
    {
      title: "Gone through in your home",
      body: "We explain the results in your home and collect the box at the same time. That is why the service covers Dublin and Leinster only.",
    },
  ],
  faq: [
    {
      q: "Do I need the home network assessment first?",
      a: "No. The evidence service is on its own: it measures your broadband line at the router, not the Wi-Fi in your rooms.",
    },
    {
      q: "What does the €199 cover?",
      a: "The box and its postage, 7 days of logging, the one-page report, and a visit to go through it with you and collect the box. It includes VAT.",
    },
    {
      q: "What if the line turns out to be fine?",
      a: "Then the report says so, and the problem is inside the house. That is what the 3-day Wi-Fi trial is for.",
    },
    {
      q: "Which areas do you cover?",
      a: "Dublin and the rest of Leinster, because we go through the results in your home and collect the box.",
    },
  ],
  related: [
    { href: "/blog/broadband-speed-test-ireland-line-or-wifi", label: "Is it the line or the Wi-Fi?" },
    { href: "/blog/wifi-slow-in-the-evening-ireland", label: "Evening slowdowns" },
    { href: "/services/wifi", label: "The 3-day Wi-Fi trial" },
    { href: "/wifi-check", label: "The free Wi-Fi check" },
  ],
});

export const packageBySlug = (slug: string | null | undefined) =>
  WIFI_PACKAGES.find((p) => p.slug === slug) ?? null;

/*
 * What the monitoring unit does, and what it is. Taken from its maker's
 * documentation (30 September 2026): a device heartbeat every 30 seconds and
 * "offline" after 2 minutes without an answer, a speed test every 6 hours
 * with the history kept, alerts on a lost connection, new devices, ports
 * opened on the router and speeds below a set level, and the unit's own
 * specification. The maker and model are never named on the site.
 */
export const MONITOR_POINTS: { title: string; body: string }[] = [
  {
    title: "Wired to your router",
    body: "It plugs into a spare port on your router by cable, not over Wi-Fi, so it measures the broadband itself.",
  },
  {
    title: "Speed, four times a day",
    body: "Your broadband tested every six hours, every result kept, so a line that slows every evening shows in the history.",
  },
  {
    title: "Outages caught",
    body: "If your broadband is down for more than a few minutes, we are alerted, and again when it comes back.",
  },
  {
    title: "Devices that matter",
    body: "Each device you name is checked every 30 seconds, and flagged as offline after about two minutes without an answer.",
  },
  {
    title: "Every device listed",
    body: "Everything on your network is found automatically, with its make and type where it can be identified. A newcomer is flagged.",
  },
  {
    title: "Open doors flagged",
    body: "A port opened on your router to the internet is flagged. Some devices and apps open one without asking.",
  },
  {
    title: "Slow speeds flagged",
    body: "We set a level for your line, and we are alerted if the download or upload falls below it.",
  },
  {
    title: "Router changes noticed",
    body: "A change to your router's settings, or to your public internet address, is flagged.",
  },
];

/** The unit itself, for the monitoring page. */
export const MONITOR_UNIT: { specs: { label: string; value: string }[]; tips: string[] } = {
  specs: [
    { label: "Size", value: "108 × 72 × 40 mm, 126 g" },
    { label: "Cooling", value: "Fanless, no moving parts, silent" },
    { label: "Connection", value: "One gigabit network port, wired to your router" },
    { label: "Power", value: "Its own plug, over USB-C" },
    { label: "Setup", value: "About 15 minutes, on the visit" },
    { label: "Updates", value: "Automatic, nothing for you to maintain" },
    { label: "Where it lives", value: "Indoors beside the router, 0 to 40 °C" },
  ],
  tips: [
    "Leave it plugged in. Unplugged, it looks to us the same as your broadband going down.",
    "It needs one free port on your router. If they are all taken, a small network switch adds more.",
    "Keep it indoors beside the router. It is built for 0 to 40 °C, so not a cold garage or a hot attic.",
    "Name the devices that matter when we set it up: the camera over the back door, the thermostat, a parent's alarm.",
    "If you change your router or your broadband provider, tell us, and we check it has reconnected.",
  ],
};

/** The three symptoms the diagnosis is for, as the hub lists them. */
export const SYMPTOMS: { title: string; body: string }[] = [
  {
    title: "Buffering",
    body: "The TV buffers in the middle of the film, or a video call freezes, while the broadband looks fine at the router.",
  },
  {
    title: "Devices dropping off",
    body: "The Nest thermostat, a camera or another smart device keeps going offline and coming back. When that happens, the network is the first thing to check.",
  },
  {
    title: "Dead rooms",
    body: "Upstairs or the back bedroom barely gets a signal, and it's always worse in the evening when everyone is online.",
  },
];
