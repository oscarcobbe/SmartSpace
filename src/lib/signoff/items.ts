/**
 * Everything Nigel signs off before it reaches a customer or the public site.
 *
 * Each item's fingerprint is taken from the content itself: the rendered
 * email (subject, preview line, HTML and text), the text message, or the data
 * the pages and the report are built from. Edit any of it and the fingerprint
 * changes, the old approval stops matching, and the item waits for a fresh
 * approval before it sends again. An approval is of what was on screen, not of
 * a name.
 *
 * Adding an item here puts it on the sign-off page. Something that sends must
 * also check it (src/lib/signoff/state.ts, approval()), and
 * scripts/check-signoff.mjs fails the build if an item gates nothing or a
 * gate names an item that is not here.
 */
import { createHash } from "crypto";
import { ENTRIES, entryById } from "@/lib/email/catalogue";
import { MONITOR_POINTS, SYMPTOMS, WIFI_PACKAGES } from "@/data/wifiPackages";
import {
  BUSY_GREEN_MS,
  BUSY_RED_MS,
  MIN_NEED_MBPS,
  NETFLIX_4K_MBPS,
  RING_1080P_UPLOAD,
  RING_UPLOAD_GOOD,
  RING_UPLOAD_OKAY,
  ROOM_KEEP_GREEN,
  ROOM_KEEP_RED,
  grade,
  type Answers,
  type Reading,
} from "@/lib/wifi-check/grade";
import { reportPath } from "@/lib/wifi-check/codec";

export type SignoffGroup = "reminders" | "booking" | "after" | "network" | "mailings";

export const GROUP_TITLE: Record<SignoffGroup, string> = {
  reminders: "Day-before reminders",
  booking: "Booking confirmation",
  after: "After the installation",
  network: "The network service and the Wi-Fi check",
  mailings: "Emails to past customers",
};

export interface SignoffItem {
  id: string;
  group: SignoffGroup;
  title: string;
  /** What approving it does, in one sentence. */
  effect: string;
  preview: { label: string; href: string }[];
  /** A decision that comes with the approval. */
  choices?: { id: string; label: string }[];
  content: () => string;
}

function rendered(entryId: string): string {
  const e = entryById(entryId);
  if (!e) throw new Error(`No studio entry called ${entryId}`);
  const out = e.render();
  return "sms" in out ? out.sms : [out.subject, out.preheader, out.html, out.text].join("\n");
}

const studio = (id: string) => ({ label: "See it", href: `/crm/emails?e=${id}` });

/* The three sample houses the traffic light is judged on. */
const at = Date.parse("2026-09-28T09:30:00Z");
const R = (place: Reading["place"], down: number, up: number, ping: number, busy: number): Reading => ({
  place, down, up, ping, busy, at, city: "Dublin",
});
const house = (o: Partial<Answers>): Answers => ({
  home: "semi", floors: 2, people: 3, trouble: [], everywhere: false, drops: "rarely", cameras: 0, ...o,
});
export const SAMPLE_CHECKS = {
  red: { answers: house({ people: 5, trouble: ["upstairs", "office"], drops: "often", cameras: 2 }), readings: [R("router", 212.4, 38.2, 11, 41), R("trouble", 14.6, 4.1, 19, 188)] },
  amber: { answers: house({ home: "terrace", drops: "sometimes", cameras: 1 }), readings: [R("router", 180.2, 24.5, 9, 35)] },
  green: { answers: house({ home: "apartment", floors: 1 }), readings: [R("router", 486.3, 92.8, 7, 22), R("other", 301.2, 60.1, 9, 28)] },
};

export const SIGNOFF_ITEMS: SignoffItem[] = [
  {
    id: "email:reminder-consultation",
    group: "reminders",
    title: "Reminder email: site visit tomorrow",
    effect: "Sent the evening before every free site visit.",
    preview: [studio("reminder-consultation")],
    content: () => rendered("reminder-consultation"),
  },
  {
    id: "sms:reminder-consultation",
    group: "reminders",
    title: "Reminder text: site visit tomorrow",
    effect: "Sent with the email, to the phone number on the booking.",
    preview: [studio("reminder-consultation-sms")],
    content: () => rendered("reminder-consultation-sms"),
  },
  {
    id: "email:reminder-install",
    group: "reminders",
    title: "Reminder email: installation tomorrow",
    effect: "Sent the evening before every installation.",
    preview: [studio("reminder-install")],
    content: () => rendered("reminder-install"),
  },
  {
    id: "sms:reminder-install",
    group: "reminders",
    title: "Reminder text: installation tomorrow",
    effect: "Sent with the email, to the phone number on the booking.",
    preview: [studio("reminder-install-sms")],
    content: () => rendered("reminder-install-sms"),
  },
  {
    id: "email:consultation-booked",
    group: "booking",
    title: "Confirmation email for a free consultation",
    effect: "Sent as soon as someone books a free consultation on the website.",
    preview: [studio("consultation-booked")],
    content: () => rendered("consultation-booked"),
  },
  {
    id: "email:review-request",
    group: "after",
    title: "Follow-up email with the Google review link",
    effect: "Sent once for each installation, at the time you choose.",
    preview: [studio("review-request")],
    choices: [
      { id: "next-morning", label: "The morning after the installation" },
      { id: "marked-finished", label: "When I mark the enquiry Installed in the CRM" },
    ],
    content: () => rendered("review-request"),
  },
  {
    id: "network:traffic-light",
    group: "network",
    title: "The free Wi-Fi check and its green, amber and red report",
    effect: "Once approved with the pages below, the website links to the Wi-Fi check and its enquiry form is switched on.",
    preview: [
      { label: "The Wi-Fi check", href: "/wifi-check" },
      { label: "A red report", href: reportPath(SAMPLE_CHECKS.red) },
      { label: "An amber report", href: reportPath(SAMPLE_CHECKS.amber) },
      { label: "A green report", href: reportPath(SAMPLE_CHECKS.green) },
    ],
    content: () =>
      JSON.stringify({
        thresholds: {
          NETFLIX_4K_MBPS, MIN_NEED_MBPS, RING_UPLOAD_GOOD, RING_UPLOAD_OKAY, RING_1080P_UPLOAD,
          ROOM_KEEP_GREEN, ROOM_KEEP_RED, BUSY_GREEN_MS, BUSY_RED_MS,
        },
        samples: Object.values(SAMPLE_CHECKS).map((c) => grade(c.readings, c.answers)),
      }),
  },
  {
    id: "network:pages",
    group: "network",
    title: "The home network diagnosis pages",
    effect: "Once approved, the website links to these pages and search engines may list them.",
    preview: [
      { label: "The main page", href: "/services/wifi" },
      ...WIFI_PACKAGES.map((p) => ({ label: p.name, href: `/services/wifi/${p.slug}` })),
    ],
    content: () => JSON.stringify({ WIFI_PACKAGES, SYMPTOMS, MONITOR_POINTS }),
  },
  {
    id: "email:wifi-report",
    group: "network",
    title: "Email: your Wi-Fi report",
    effect: "Sent when someone asks for their Wi-Fi report by email.",
    preview: [studio("wifi-report")],
    content: () => rendered("wifi-report"),
  },
  {
    id: "mailing:smartguardian-announce",
    group: "mailings",
    title: "Meet SmartCare Living and SmartGuardian",
    effect: "Lets this email go to the past customers you add in Mailings, fifty a day.",
    preview: [studio("smartguardian-announce")],
    content: () => rendered("smartguardian-announce"),
  },
  {
    id: "mailing:network-diagnosis-a",
    group: "mailings",
    title: "The network service, problem-led version",
    effect: "Lets this email go to the past customers you add in Mailings, fifty a day.",
    preview: [studio("network-diagnosis-a")],
    content: () => rendered("network-diagnosis-a"),
  },
  {
    id: "mailing:network-diagnosis-b",
    group: "mailings",
    title: "The network service, for security customers",
    effect: "Lets this email go to the past customers you add in Mailings, fifty a day.",
    preview: [studio("network-diagnosis-b")],
    content: () => rendered("network-diagnosis-b"),
  },
];

export const itemById = (id: string) => SIGNOFF_ITEMS.find((i) => i.id === id) ?? null;

/** The item's fingerprint: sixteen hex characters of a SHA-256 of its content. */
export function fingerprint(item: SignoffItem): string {
  return createHash("sha256").update(`${item.id}\n${item.content()}`).digest("hex").slice(0, 16);
}

/** Studio entries that have an item, for the studio to show their state. */
export const itemForStudioEntry = (entryId: string) =>
  SIGNOFF_ITEMS.find((i) => i.preview.some((p) => p.href === `/crm/emails?e=${entryId}`)) ?? null;

/* Every studio entry, so a new message cannot be added without deciding
   whether it needs signing off. */
export const STUDIO_IDS = ENTRIES.map((e) => e.id);
