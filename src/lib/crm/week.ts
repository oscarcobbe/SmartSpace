/**
 * The diary: what is booked, by day.
 *
 * Orders is a list sorted by when the enquiry arrived, which answers "what came
 * in" and not "what is on". For a business whose whole operation is a van
 * arriving somewhere at a time, those are different questions and the second
 * one is the one asked every morning.
 */
import { fetchLeads, type Lead } from "./leads";
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
  booked: number;
  problem: string | null;
}

/** "21/09/2026" and "2026-09-21" both become 2026-09-21. Anything else, null. */
function toIso(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s === "-") return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  return null;
}

/** Today in Dublin, not in whatever timezone the server happens to run in. */
function todayDublin(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export async function fetchWeek(site: Site, daysAhead = 14): Promise<Week> {
  const feed = await fetchLeads(site);
  if (!feed.ok) {
    return { days: [], overdue: [], booked: 0, problem: feed.reason };
  }

  const today = todayDublin();
  const withDate = feed.data.leads
    .map((l) => ({ l, on: toIso(l.bookingDate) }))
    .filter((x): x is { l: Lead; on: string } => x.on !== null);

  const byDay = new Map<string, Lead[]>();
  const overdue: Lead[] = [];
  for (const { l, on } of withDate) {
    if (on < today) {
      /* A booking in the past that is still marked upcoming never got closed
         off. Worth surfacing: it is either done and unrecorded, or missed. */
      if (l.upcoming) overdue.push(l);
      continue;
    }
    (byDay.get(on) ?? byDay.set(on, []).get(on)!).push(l);
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
      jobs: (byDay.get(date) ?? []).sort((a, b) => (a.bookingSlot || "").localeCompare(b.bookingSlot || "")),
    });
  }

  return {
    days,
    overdue: overdue.slice(0, 20),
    booked: days.reduce((n, d) => n + d.jobs.length, 0),
    problem: null,
  };
}
