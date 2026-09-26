/**
 * Feed text, made fit to put in front of a person.
 *
 * The feeds write the same things several ways: a slot is "10:00 - 12:00" from
 * one source and "12:30\u201314:30" from another, and a date arrives as
 * "23/09/2026, 11:21". The house rule is no en or em dashes on screen, and a
 * diary that writes one slot two ways reads as two kinds of thing.
 */

const EN = "\u2013";
const EM = "\u2014";

/** Any dash between two times becomes " to ": "10:00 to 12:00". */
export function slotText(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "-" || s === EN || s === EM) return "";
  return s
    .replace(/(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})/g, "$1 to $2")
    .replace(/[\u2013\u2014]/g, "-");
}

/** Free text from a feed with its en and em dashes turned into plain hyphens. */
export function plainText(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "-" || s === EN || s === EM) return "";
  return s.replace(/\s*[\u2013\u2014]\s*/g, " - ");
}

/** "23/09/2026, 11:21" or "2026-09-23 11:21" as "23 Sept". Falls back to the input. */
export function shortDay(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "-") return "";
  let y: number, m: number, d: number;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3]; }
  else if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else return s.split(",")[0] ?? s;
  return new Intl.DateTimeFormat("en-IE", { timeZone: "UTC", day: "numeric", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, d, 12)));
}
