/**
 * The two questions the front page is actually being asked about the diary.
 *
 * "Where do I need to be next" and "who just booked" are different orderings of
 * the same rows, and the overview panel was answering neither. It filtered on
 * the `upcoming` flag and then rendered the rows in whatever order the feed
 * happened to return them, so 5 October sat above 23 September and the panel
 * could not be read as a plan for the week.
 */
import { bookingIso } from "./booking-date";
import { fetchLeads, partialFeed, type Lead } from "./leads";
import { fetchMarks, orderKey } from "./order-marks";
import type { Site } from "./db";

const clean = (v: string | undefined | null) => {
  const s = String(v ?? "").trim();
  return !s || s === "-" ? "" : s;
};

/* Moved to display.ts so client components can use it without pulling the
   feed readers into the browser bundle. Re-exported for the callers here. */
import { displayName } from "./display";
export { displayName };

/** True when we are showing a stand-in rather than a name somebody gave us. */
export const nameIsStandIn = (l: Lead) => clean(l.name) === "";

/**
 * When the booking was MADE, which is not when the job is.
 *
 * The feed writes this field two ways: "18/09/2026, 11:21" from Stripe and
 * "2026-09-14 15:23" from the enquiry table. Day-first is assumed for the
 * slashed form because the site is Irish, and the ISO form needs no help.
 */
export function bookedAtIso(raw: string | undefined | null): string | null {
  const s = clean(raw);
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}`;

  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    const [, d, m, y, hh = "00", mm = "00"] = dmy;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm}`;
  }

  return null;
}

/** The start time inside "10:00-12:00" or "10:00 – 12:00", for ordering a day. */
const slotStart = (raw: string | undefined | null) => {
  const m = clean(raw).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : "99:99";
};

/** Today in Dublin, never the server's timezone. */
const todayDublin = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

export interface DiaryRow {
  job: Lead;
  /** Job date, ISO, for upcoming. */
  on: string | null;
  /** When it was booked, ISO, for just-booked. */
  bookedAt: string | null;
  label: string;
  slot: string;
  name: string;
  standIn: boolean;
}

export interface Diary {
  upcoming: DiaryRow[];
  justBooked: DiaryRow[];
  /** The feed could not be read at all. */
  problem: string | null;
  /** It was read, but something the diary depends on was missing. */
  warnings: string[];
}

const label = (on: string) =>
  new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short",
  }).format(new Date(`${on}T12:00:00Z`));

/**
 * One customer, one row.
 *
 * A booking reaches us twice, once as a Stripe payment and once as a Calendly
 * slot, so the same job appears under both. Keyed on who plus the day plus the
 * start time: the day matters, because keying on the slot alone merges the same
 * person's 10:00 job in June with their 10:00 job in October.
 */
function collapse(rows: DiaryRow[]): DiaryRow[] {
  const out: DiaryRow[] = [];
  const at = new Map<string, number>();
  for (const r of rows) {
    const who =
      clean(r.job.email).toLowerCase() ||
      clean(r.job.phone).replace(/\D/g, "").slice(-9) ||
      "";
    const key = who ? `${who}|${r.on ?? ""}|${r.slot}` : "";
    const i = key ? at.get(key) : undefined;
    if (!key || i === undefined) {
      if (key) at.set(key, out.length);
      out.push(r);
      continue;
    }
    /* Keep whichever row knows more. The paid one usually carries the address. */
    const paid = (x: DiaryRow) => clean(x.job.amount) !== "";
    const keep = paid(r) && !paid(out[i]!) ? r : out[i]!;
    const other = keep === r ? out[i]! : r;
    out[i] = {
      ...keep,
      name: keep.standIn && !other.standIn ? other.name : keep.name,
      standIn: keep.standIn && other.standIn,
      job: {
        ...keep.job,
        address: clean(keep.job.address) || other.job.address,
        details: [...(keep.job.details ?? []), ...(other.job.details ?? [])],
      },
    };
  }
  return out;
}

export async function fetchDiary(site: Site, limit = 6): Promise<Diary> {
  const [feed, marks] = await Promise.all([fetchLeads(site), fetchMarks(site)]);
  if (!feed.ok) return { upcoming: [], justBooked: [], problem: feed.reason, warnings: [] };
  const warnings = [partialFeed(feed.data), marks.problem ?? null].filter((w): w is string => Boolean(w));

  const today = todayDublin();

  const rows: DiaryRow[] = feed.data.leads
    /* A job cancelled by phone is still paid in Stripe and still holds its
       Calendly slot. It must not appear as somewhere to be. */
    .filter((l) => marks.get(orderKey(l))?.state !== "cancelled")
    .map((job) => {
      const on = bookingIso(job.bookingDate);
      return {
        job,
        on,
        bookedAt: bookedAtIso(job.date),
        label: on ? label(on) : "",
        slot: slotStart(job.bookingSlot),
        name: displayName(job),
        standIn: nameIsStandIn(job),
      };
    });

  const upcoming = collapse(rows.filter((r) => r.on !== null && r.on >= today))
    .sort((a, b) => a.on!.localeCompare(b.on!) || a.slot.localeCompare(b.slot))
    .slice(0, limit);

  /* Who booked most recently, whenever their job happens to be. Rows with no
     parseable booked-at date sort last rather than to the top, which is what
     an empty string would have done. */
  const justBooked = collapse(rows.filter((r) => r.on !== null))
    .sort((a, b) => (b.bookedAt ?? "").localeCompare(a.bookedAt ?? ""))
    .slice(0, limit);

  return { upcoming, justBooked, problem: null, warnings };
}
