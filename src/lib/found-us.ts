/**
 * "How did you hear about us?", the one optional question on the contact form, the
 * callback form, the free consultation, the cart's checkout and the Book Now
 * checkout on the installation pages, with an optional box underneath for the
 * visitor's own words.
 *
 * Oscar chose the question on 27 September 2026 and reworked it on 30
 * September, from advice written for SmartCare Living: about ten answers, one
 * each for Google and for ChatGPT with no "Google ad" answer, because people
 * cannot tell an ad from a result and the click id and UTM tags split paid
 * from organic behind the scenes; and a free-text box that is optional but
 * always visible, because a path like "my sister saw it on ChatGPT, then I
 * Googled you" is exactly what an unknown channel needs to show.
 *
 * The answers are keys of the CRM's FOUND_US (src/lib/crm/labels.ts), so what
 * the site writes, what Nigel picks by hand in the CRM and what the FourWinds
 * weekly report counts are one list. SmartCare Living offers its own subset of
 * the same keys (its api/_lib/found-us.js).
 *
 * Retired answers stay valid on the server. "google_ads" and "organisation"
 * are no longer offered, but Stripe sessions, sheet rows and CRM leads from
 * before 30 September carry them, and the leads feed and the webhook must read
 * those back as they were written.
 *
 * Where an answer goes, which the weekly report reads exactly:
 *   request body     found_us, a CRM key; empty or missing is no answer.
 *                    found_us_detail, the visitor's own words, optional
 *   CRM lead         custom.found_us, custom.found_us_detail
 *   leads sheet row  "heard: <words>" then "found: <key>" as the last " | "
 *                    items of Notes; the Apps Script writes a fixed set of
 *                    columns, and Notes is the one the site adds to
 *   Stripe checkout  metadata.found_us and metadata.found_us_detail, read back
 *                    by the Stripe webhook
 *   leads feed       foundUs and foundUsDetail on each lead and free
 *                    consultation that has them
 *
 * scripts/check-found-us.mjs fails the build if any of these stops carrying it.
 */
import { FOUND_US } from "@/lib/crm/labels";

/** CRM keys that are never an answer: "unknown" is what not answering already
    means, and "website" is where every one of these forms is. */
const NEVER_ANSWERS = new Set(["unknown", "website"]);

/** Every key the server takes as an answer, retired ones included. */
export const ACCEPTED_KEYS: readonly string[] = Object.keys(FOUND_US).filter((k) => !NEVER_ANSWERS.has(k));

/** What this site's forms offer, in order, worded for a visitor. */
export const FOUND_US_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "google_search", label: "Google search" },
  { value: "ai_assistant", label: "ChatGPT or another AI assistant" },
  { value: "social", label: "Facebook or Instagram" },
  { value: "recommended", label: "Recommended by a friend or family member" },
  { value: "van", label: "Saw our van" },
  { value: "press", label: "Newspaper, radio or online article" },
  { value: "existing_customer", label: "Existing Smart Space customer" },
  { value: "other", label: "Other (please tell us)" },
];

/** The answers a form may send, in the order the select lists them. */
export const FOUND_US_KEYS: readonly string[] = FOUND_US_OPTIONS.map((o) => o.value);

/**
 * The answer in a request body, or "" for no answer. Anything that is not
 * exactly one of ACCEPTED_KEYS is no answer: the value is written to the CRM,
 * the sheet and Stripe, so nothing else from the browser gets that far.
 */
export function foundUsFrom(value: unknown): string {
  const key = typeof value === "string" ? value.trim() : "";
  return ACCEPTED_KEYS.includes(key) ? key : "";
}

/** The box's limit, in characters. */
export const FOUND_US_DETAIL_MAX = 200;

/**
 * The visitor's own words, or "". One line, at most FOUND_US_DETAIL_MAX
 * characters, with control characters and "|" taken out: the sheet's Notes
 * separates its items with "|", so one in the words would split the row.
 * Half of an emoji (a surrogate without its partner) is not text, and is
 * taken out too, including one left by the cut at the limit.
 */
export function foundUsDetailFrom(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f|]+/g, " ")
    .replace(/([\ud800-\udbff][\udc00-\udfff])|[\ud800-\udfff]/g, (_whole, pair?: string) => pair ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FOUND_US_DETAIL_MAX)
    .replace(/[\ud800-\udbff]$/, "")
    .trim();
}

/**
 * A sheet row's Notes with the visitor's words and the answer added as its
 * last items ("heard: ..." then "found: <key>"), or unchanged when there is
 * neither.
 */
export function notesWithFoundUs(notes: string | undefined, foundUs: string, detail: unknown = ""): string | undefined {
  const key = foundUsFrom(foundUs);
  const said = foundUsDetailFrom(detail);
  if (!key && !said) return notes;
  return [notes, said ? `heard: ${said}` : "", key ? `found: ${key}` : ""].filter(Boolean).join(" | ");
}

/**
 * The answer and the visitor's words a sheet row's Notes carries, and the
 * Notes without them.
 *
 * Only the last " | " items are read, because that is where the site writes
 * them: a contact form's Notes is "<Topic>: <message>", and whatever the
 * visitor typed comes before. A value typed into the sheet by hand as "Google
 * ads" or "google-ads" is read as its key, as the weekly report reads it; a
 * value that is not an answer is left in the Notes.
 */
export function foundUsInNotes(notes: unknown): { foundUs: string; detail: string; notes: string } {
  const text = notes === null || notes === undefined ? "" : String(notes);
  const parts = text.split("|");
  let foundUs = "";
  let detail = "";
  const found = /^\s*found\s*:\s*(.*?)\s*$/i.exec(parts[parts.length - 1]);
  const key = found ? foundUsFrom(found[1].toLowerCase().replace(/[\s-]+/g, "_")) : "";
  if (key) {
    foundUs = key;
    parts.pop();
  }
  const heard = parts.length ? /^\s*heard\s*:\s*(.*?)\s*$/i.exec(parts[parts.length - 1]) : null;
  if (heard) {
    detail = foundUsDetailFrom(heard[1]);
    parts.pop();
  }
  if (!foundUs && !detail) return { foundUs: "", detail: "", notes: text.trim() };
  return { foundUs, detail, notes: parts.join("|").trim() };
}

/** The answer as Nigel's lead emails show it: the label, and their own words if any, or "Not answered". */
export function foundUsLine(key: unknown, detail: unknown = ""): string {
  const k = foundUsFrom(key);
  const label = k ? (FOUND_US_OPTIONS.find((o) => o.value === k)?.label ?? k).replace(/ \(please tell us\)$/, "") : "Not answered";
  const words = foundUsDetailFrom(detail);
  return words ? `${label}: "${words}"` : label;
}
