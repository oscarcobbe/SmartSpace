/**
 * "How did you find us?", the one optional question on the contact form, the
 * callback form, the free consultation, the cart's checkout and the Book Now
 * checkout on the installation pages.
 *
 * It is there so an enquiry from a Google ad can be counted without a cookie:
 * the click id reaches the site only when the visitor lets it. Oscar chose it
 * on 27 September 2026, as one optional select near the end of each form, with
 * nothing added around it.
 *
 * The answers are the keys of the CRM's FOUND_US (src/lib/crm/labels.ts), so
 * what the site writes, what Nigel picks by hand in the CRM and what the
 * FourWinds weekly report counts are one list. Two of the CRM's keys are not
 * offered: "unknown" is what not answering already means, and "website" is
 * where every one of these forms is.
 *
 * Where an answer goes, which the weekly report reads exactly:
 *   request body     found_us, one of FOUND_US_KEYS; empty or missing is no answer
 *   CRM lead         custom.found_us
 *   leads sheet row  "found: <key>" as the last " | " item of Notes; the Apps
 *                    Script writes a fixed set of columns, and Notes is the one
 *                    the site adds to
 *   Stripe checkout  metadata.found_us, read back by the Stripe webhook
 *   leads feed       foundUs on each lead and free consultation that has one
 *
 * scripts/check-found-us.mjs fails the build if any of these stops carrying it.
 */
import { FOUND_US } from "@/lib/crm/labels";

/** CRM keys a visitor is not offered, and why, above. */
const NOT_OFFERED = new Set(["unknown", "website"]);

/** What a visitor reads, where it is worded differently from the CRM's label. */
const VISITOR_WORDING: Record<string, string> = {
  google_search: "Google search",
  recommended: "Recommended by someone",
  existing_customer: "I'm already a customer",
};

/** The answers a form may send, in the order the select lists them. */
export const FOUND_US_KEYS: readonly string[] = Object.keys(FOUND_US).filter((k) => !NOT_OFFERED.has(k));

export const FOUND_US_OPTIONS: ReadonlyArray<{ value: string; label: string }> = FOUND_US_KEYS.map((value) => ({
  value,
  label: VISITOR_WORDING[value] ?? FOUND_US[value],
}));

/**
 * The answer in a request body, or "" for no answer. Anything that is not
 * exactly one of FOUND_US_KEYS is no answer: the value is written to the CRM,
 * the sheet and Stripe, so nothing else from the browser gets that far.
 */
export function foundUsFrom(value: unknown): string {
  const key = typeof value === "string" ? value.trim() : "";
  return FOUND_US_KEYS.includes(key) ? key : "";
}

/** A sheet row's Notes with the answer added as its last item, or unchanged when there is none. */
export function notesWithFoundUs(notes: string | undefined, foundUs: string): string | undefined {
  const key = foundUsFrom(foundUs);
  if (!key) return notes;
  return notes ? `${notes} | found: ${key}` : `found: ${key}`;
}

/**
 * The answer a sheet row's Notes carries, and the Notes without it.
 *
 * Only the last " | " item is read, because that is where the site writes it:
 * a contact form's Notes is "<Topic>: <message>", and whatever the visitor
 * typed comes before the answer. A value typed into the sheet by hand as
 * "Google ads" or "google-ads" is read as its key, as the weekly report reads
 * it; a value that is not an answer is left in the Notes.
 */
export function foundUsInNotes(notes: unknown): { foundUs: string; notes: string } {
  const text = notes === null || notes === undefined ? "" : String(notes);
  const parts = text.split("|");
  const m = /^\s*found\s*:\s*(.*?)\s*$/i.exec(parts[parts.length - 1]);
  const key = m ? foundUsFrom(m[1].toLowerCase().replace(/[\s-]+/g, "_")) : "";
  if (!key) return { foundUs: "", notes: text.trim() };
  return { foundUs: key, notes: parts.slice(0, -1).join("|").trim() };
}
