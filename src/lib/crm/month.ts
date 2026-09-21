/**
 * The month a row belongs to, from the date the feed writes.
 *
 * Finance charts money by month and Orders lists rows, and the only thing
 * joining them is this conversion. It lives here rather than inside the table
 * because the orders feed cannot be reached from a development machine, so the
 * only way to know the drill-down works is a guard that runs on every build.
 *
 * The feed writes Irish order: "DD/MM/YYYY, HH:MM". Read as American it turns
 * every day up to the twelfth into the wrong month and silently drops the
 * rest, which is a filter that looks like it is working.
 */

/** "2026-09", the key Stripe's month buckets already use. */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** "DD/MM/YYYY, HH:MM" to "YYYY-MM", or null when there is no usable date. */
export function monthOf(date: unknown): string | null {
  if (typeof date !== "string") return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\b/.exec(date.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd), mon = Number(mm);
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${mm}`;
}

/** "2026-09" to "September 2026", for saying out loud which month is showing. */
export function monthLabel(key: string): string {
  if (!isMonthKey(key)) return key;
  const [y, mo] = key.split("-").map(Number);
  /* Europe/Dublin like every other date in the CRM, which the date guard
     insists on and is right to. It cannot move this one: Ireland is never
     behind UTC, so midnight UTC on the first of a month is still that month
     in Dublin, in summer time and out of it. */
  return new Date(Date.UTC(y, mo - 1, 1, 12)).toLocaleDateString("en-IE", {
    timeZone: "Europe/Dublin", month: "long", year: "numeric",
  });
}
