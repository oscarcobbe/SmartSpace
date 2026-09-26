/**
 * The diary: what is booked, by day.
 *
 * Orders is a list sorted by when the enquiry arrived, which answers "what came
 * in" and not "what is on". For a business whose whole operation is a van
 * arriving somewhere at a time, those are different questions and the second
 * one is the one asked every morning.
 */
import { fetchLeads, partialFeed, type Lead } from "./leads";
import { bookingIso } from "./booking-date";
import { fetchMarks, orderKey } from "./order-marks";
import type { Site } from "./db";

export interface Day {
  date: string;          // YYYY-MM-DD
  label: string;         // Thursday 18 September
  isToday: boolean;
  jobs: Lead[];
}

export interface Week {
  days: Day[];
  /** Anything booked before today that was never marked done. */
  overdue: Lead[];
  /**
   * Everything booked beyond the fortnight, in the order it happens.
   *
   * The day panels stop at fourteen days, and anything past that used to
   * vanish: a job booked three weeks out existed in the feed, was counted
   * nowhere, and appeared on nothing until it drifted inside the window. The
   * question this page is asked is "where am I going next", and next does not
   * stop on the fourteenth day.
   */
  later: { on: string; label: string; job: Lead }[];
  booked: number;
  problem: string | null;
  /** Read, but incomplete: a source behind the feed, or the cancelled marks. */
  warnings: string[];
}

/* One parser, shared with the orders join. The local one here handled ISO and
   dd/mm/yyyy and returned null for Calendly's "Thu, 17 Sep, 15:00", so every
   Calendly consultation and installation was filtered out of this page: it
   looked calm because the rows were gone, not because the diary was empty. */
const toIso = (raw: string | undefined) => bookingIso(raw);

const emailKey = (v: string | undefined) => {
  const t = String(v ?? "").trim().toLowerCase();
  return t && t !== "-" ? t : null;
};
const phoneKey = (v: string | undefined) => {
  const d = String(v ?? "").replace(/[^\d]/g, "");
  return d.length >= 9 ? d.slice(-9) : null;
};
/** "12:30 – 14:30" and "12:30-14:30" are the same slot. */
const slotKey = (v: string | undefined) => String(v ?? "").replace(/[^\d]/g, "");

/**
 * One job per job.
 *
 * A booked installation arrives twice, because upstream they are two different
 * things: Calendly holds the appointment and Stripe holds the payment. The
 * Orders table already joins them. The diary did not, so every job was listed
 * once as an Installation and again as a Paid Order, at the same time, at the
 * same address, and the count at the top of the page was roughly double the
 * work. Somebody reading it on a Monday would plan the wrong week.
 *
 * Same person, same day, same slot is the same job. The paid row wins, because
 * it carries the amount and the product the customer actually chose, and any
 * detail only the appointment row has is carried across rather than dropped.
 */
function collapse(jobs: Lead[]): Lead[] {
  const out: Lead[] = [];
  const seen = new Map<string, number>();
  for (const l of jobs) {
    const who = emailKey(l.email) ?? phoneKey(l.phone);
    const key = who ? `${who}|${slotKey(l.bookingSlot)}` : null;
    const at = key ? seen.get(key) : undefined;
    if (key == null || at === undefined) {
      if (key) seen.set(key, out.length);
      out.push(l);
      continue;
    }
    const kept = out[at];
    const paid = (x: Lead) => String(x.amount ?? "").replace(/[^\d.]/g, "") !== "";
    const winner = paid(l) && !paid(kept) ? l : kept;
    const other = winner === kept ? l : kept;
    out[at] = {
      ...winner,
      /* Whichever row is kept, take anything the other one alone knew. */
      address: String(winner.address ?? "").trim() && winner.address !== "-" ? winner.address : other.address,
      details: [...(winner.details ?? []), ...(other.details ?? [])],
    };
  }
  return out;
}

/** Today in Dublin, not in whatever timezone the server happens to run in. */
function todayDublin(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export async function fetchWeek(site: Site, daysAhead = 14): Promise<Week> {
  const [feed, marks] = await Promise.all([fetchLeads(site), fetchMarks(site)]);
  if (!feed.ok) {
    return { days: [], later: [], overdue: [], booked: 0, problem: feed.reason, warnings: [] };
  }

  const today = todayDublin();
  const withDate = feed.data.leads
    /* A job cancelled on the phone is still paid in Stripe and still has its
       Calendly slot, so nothing upstream drops it. The diary is the one place
       it must not appear: it is a van going somewhere nobody is expecting it. */
    .filter((l) => marks.get(orderKey(l))?.state !== "cancelled")
    .map((l) => ({ l, on: toIso(l.bookingDate) }))
    .filter((x): x is { l: Lead; on: string } => x.on !== null);

  const byDay = new Map<string, Lead[]>();
  const overdue: Lead[] = [];
  /* Filled while bucketing so the later list comes from the same pass. */
  const ahead: { on: string; job: Lead }[] = [];
  for (const { l, on } of withDate) {
    if (on < today) {
      /* A booking in the past that is still marked upcoming never got closed
         off. Worth surfacing: it is either done and unrecorded, or missed. */
      if (l.upcoming) overdue.push(l);
      continue;
    }
    (byDay.get(on) ?? byDay.set(on, []).get(on)!).push(l);
    ahead.push({ on, job: l });
  }

  const days: Day[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    days.push({
      date,
      label: new Intl.DateTimeFormat("en-IE", {
        timeZone: "Europe/Dublin", weekday: "long", day: "numeric", month: "long",
      }).format(d),
      isToday: i === 0,
      jobs: collapse(byDay.get(date) ?? []).sort((a, b) => (a.bookingSlot || "").localeCompare(b.bookingSlot || "")),
    });
  }

  const lastDay = days[days.length - 1]?.date ?? today;
  const later = collapse(ahead.filter((x) => x.on > lastDay).map((x) => x.job))
    .map((job) => ({ job, on: ahead.find((a) => a.job === job)?.on ?? lastDay }))
    .sort((a, b) => a.on.localeCompare(b.on) || (a.job.bookingSlot || "").localeCompare(b.job.bookingSlot || ""))
    .map((x) => ({
      ...x,
      label: new Intl.DateTimeFormat("en-IE", {
        timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "long",
      }).format(new Date(`${x.on}T12:00:00Z`)),
    }));

  return {
    days,
    later,
    overdue: overdue.slice(0, 20),
    booked: days.reduce((n, d) => n + d.jobs.length, 0),
    problem: null,
    warnings: [partialFeed(feed.data), marks.problem ?? null].filter((w): w is string => Boolean(w)),
  };
}
