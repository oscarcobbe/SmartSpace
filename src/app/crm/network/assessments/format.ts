/** Dates on the assessment pages, always in Dublin time (scripts/check-crm-dates.mjs holds every formatter to it). */

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", ...o }).format(new Date(iso));

/** "Tue 14 Oct, 10:00" */
export const when = (iso: string | null | undefined) =>
  iso ? fmt(iso, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "";

/** "14 Oct" */
export const day = (iso: string | null | undefined) => (iso ? fmt(iso, { day: "numeric", month: "short" }) : "");

/** "21:10" */
export const clock = (iso: string | null | undefined) => (iso ? fmt(iso, { hour: "2-digit", minute: "2-digit", hour12: false }) : "");

/** A datetime-local input's value, "2026-10-14T10:00", in Dublin time. */
export function inputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
}

/** "just now", "4 min ago", "3 hours ago", "2 days ago" */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} days ago`;
}

export const secondsSince = (iso: string | null | undefined, now = Date.now()) => (iso ? (now - Date.parse(iso)) / 1000 : null);

/** The colour of each stage's pill. */
export const STAGE_TONE: Record<string, string> = {
  booked: "bg-slate-100 text-slate-700 ring-slate-500/20",
  visit: "bg-sky-50 text-sky-800 ring-sky-600/20",
  trial: "bg-amber-50 text-amber-800 ring-amber-600/20",
  collected: "bg-violet-50 text-violet-800 ring-violet-600/20",
  reported: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  closed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-600/20",
};
