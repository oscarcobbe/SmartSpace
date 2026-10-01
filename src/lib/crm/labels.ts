/**
 * What things are called on screen.
 *
 * The database stores "contact_form", "lead_created" and "stripe" because they
 * are keys. Nigel was reading those keys. Anything a person sees gets a name a
 * person would use, and anything without a mapping falls back to a tidied
 * version of the key rather than to nothing, so a new source never renders as
 * an empty cell.
 */

const tidy = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const SOURCES: Record<string, string> = {
  stripe: "Paid online",
  contact_form: "Contact form",
  quiz: "Quiz",
  booking: "Booking",
  "urgent-callback": "Urgent callback",
  urgent_callback: "Urgent callback",
  checkout_free: "Free consultation",
  wifi_check: "Wi-Fi check",
  website: "Website",
  phone: "Rang in",
  voicemail: "Left a voicemail",
  in_person: "Met on an installation",
  referral: "Recommended",
  walk_in: "Walk in",
  unknown: "Enquiry",
};

/** How somebody found the business, for enquiries logged by hand (custom.found_us). */
export const FOUND_US: Record<string, string> = {
  unknown: "Did not say",
  google_ads: "A Google ad",
  google_search: "Google search, not an ad",
  ai_assistant: "ChatGPT or another AI assistant",
  social: "Facebook or Instagram",
  website: "Our website",
  recommended: "Recommended",
  hse_memory_room: "HSE Memory Technology Room",
  clinician: "GP, public health nurse or occupational therapist",
  home_care: "Home care provider or carer",
  van: "Saw our van",
  press: "Newspaper, radio or online article",
  organisation: "An organisation",
  existing_customer: "Already a customer",
  smart_space_customer: "Existing Smart Space customer",
  other: "Something else",
};

/*
 * How this enquiry found the business. What somebody chose by hand wins; a
 * website enquiry carrying a Google Ads click id is a Google ad without anyone
 * having to say so; anything else is not known. The weekly report counts the
 * same way, so what Nigel sees here is what the report counts.
 */
export function foundUsOf(l: { gclid?: string | null; custom?: Record<string, unknown> | null }): string {
  const chosen = typeof l.custom?.found_us === "string" ? (l.custom.found_us as string) : "";
  if (chosen && chosen !== "unknown" && FOUND_US[chosen]) return chosen;
  if ((l.gclid ?? "").trim()) return "google_ads";
  return "unknown";
}

/**
 * The same, in words, for the customer's page, with the click that shows it.
 *
 * A ChatGPT ad has no FOUND_US key of its own, deliberately: the FourWinds
 * weekly report counts ChatGPT ad enquiries from the click id (custom.oppref)
 * and never from found_us, so a key Nigel could also pick by hand would let
 * the CRM and the report disagree. So it is read here, from the click, and
 * only where nobody chose an answer and no Google click says otherwise: the
 * same order how-they-came.ts keeps, Google's click first.
 */
export function foundUsLabel(l: { gclid?: string | null; custom?: Record<string, unknown> | null }): string {
  const key = foundUsOf(l);
  if (key !== "unknown") return `${FOUND_US[key] ?? key}${l.gclid ? " (the click was recorded)" : ""}`;
  if (chatGptAdClick(l)) return "A ChatGPT ad (the click was recorded)";
  return FOUND_US.unknown;
}

/** Whether the lead carries a ChatGPT ad click (custom.oppref, kept only under an Accept that names OpenAI). */
export function chatGptAdClick(l: { custom?: Record<string, unknown> | null }): boolean {
  return typeof l.custom?.oppref === "string" && l.custom.oppref.trim() !== "";
}

export const sourceLabel = (key: string | null | undefined) =>
  key ? SOURCES[key] ?? tidy(key) : "Enquiry";

const KINDS: Record<string, string> = {
  lead_created: "Enquiry received",
  status: "Status changed",
  note: "Note",
  task: "Next step",
};

export const kindLabel = (key: string) => KINDS[key] ?? tidy(key);

/**
 * Statuses read as a pipeline, so they are coloured as one: grey while nothing
 * has happened, amber while it is in Nigel's hands, green when it is money, red
 * when it is gone. Six separate hues, which is what this had, made teal and
 * green indistinguishable at pill size and gave "quoted" the same visual weight
 * as "won".
 */
export const STATUS_PILL: Record<string, string> = {
  new: "bg-sky-50 text-sky-800 ring-sky-600/20",
  contacted: "bg-slate-100 text-slate-700 ring-slate-500/20",
  quoted: "bg-amber-50 text-amber-800 ring-amber-600/20",
  booked: "bg-amber-50 text-amber-800 ring-amber-600/20",
  installed: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  lost: "bg-rose-50 text-rose-800 ring-rose-600/20",
  spam: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  installed: "Installed",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

/** A phone number a CRM can dial. Irish mobiles arrive as 087..., not +353. */
export const telHref = (phone: string | null | undefined) => {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  return `tel:${digits.startsWith("+") ? digits : digits.replace(/^0/, "+353")}`;
};

/*
 * Nigel's traffic light on an enquiry: how good a lead it is, set by him on
 * the call or after it. Stored on the lead as custom.lead_light, so it needs
 * no new column; the history keeps who set it, when, and any note.
 */
export type LeadLight = "green" | "amber" | "red";
export const LIGHTS: LeadLight[] = ["green", "amber", "red"];
export const LIGHT_LABEL: Record<LeadLight, string> = {
  green: "Good lead",
  amber: "Maybe",
  red: "Not a lead",
};
export const LIGHT_DOT: Record<LeadLight, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-400",
  red: "bg-red-500",
};
export const LIGHT_PILL: Record<LeadLight, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-900 ring-amber-600/25",
  red: "bg-red-50 text-red-800 ring-red-600/20",
};
export function lightOf(custom: Record<string, unknown> | null | undefined): LeadLight | null {
  const v = custom?.lead_light;
  return v === "green" || v === "amber" || v === "red" ? v : null;
}
