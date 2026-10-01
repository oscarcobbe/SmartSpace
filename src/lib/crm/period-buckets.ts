/**
 * Daily ad figures rolled into days, weeks and months, one way for every ad
 * channel.
 *
 * This was the inside of ads-periods.ts, for Google Ads. ChatGPT ads
 * (openai-ads.ts) are bucketed by the same code rather than a copy of it, so a
 * week means the same Monday to Sunday for both and the two can sit side by
 * side without one drifting a day from the other.
 *
 * Everything is bucketed in Europe/Dublin. Both APIs return dates already in
 * the account's own timezone, which is Europe/Dublin for every account this
 * reads, so the strings are used as they are and never passed through a Date,
 * which on a machine set to America/Denver would shift every row back a day.
 *
 * Pure, with no server-only import, so the build checks can load it.
 */

export type Grain = "day" | "week" | "month";

export interface Bucket {
  key: string;
  label: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
  /** Cost per conversion, null when nothing converted. */
  cpa: number | null;
  /** Value back per euro spent, null when nothing was spent. */
  roas: number | null;
  /** Change in cost against the previous bucket, as a percentage. */
  deltaCost: number | null;
  deltaConversions: number | null;
  deltaValue: number | null;
}

export interface Periods {
  day: Bucket[];
  week: Bucket[];
  month: Bucket[];
  from: string;
  to: string;
}

export interface DayRow {
  date: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
}

/** Monday of the week containing this yyyy-mm-dd, without leaving strings. */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d!);
  const dow = new Date(utc).getUTCDay(); // 0 Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return new Date(utc - back * 86_400_000).toISOString().slice(0, 10);
}

export const dayLabel = (k: string) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${k}T12:00:00Z`));

export const monthLabel = (k: string) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", month: "long", year: "numeric" })
    .format(new Date(`${k}-01T12:00:00Z`));

const pct = (now: number, prev: number): number | null =>
  prev === 0 ? null : ((now - prev) / prev) * 100;

export function roll(rows: DayRow[], keyOf: (d: string) => string, labelOf: (k: string) => string): Bucket[] {
  const by = new Map<string, Bucket>();
  for (const r of rows) {
    const key = keyOf(r.date);
    let b = by.get(key);
    if (!b) {
      b = { key, label: labelOf(key), cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0,
            cpa: null, roas: null, deltaCost: null, deltaConversions: null, deltaValue: null };
      by.set(key, b);
    }
    b.cost += r.cost; b.clicks += r.clicks; b.impressions += r.impressions;
    b.conversions += r.conversions; b.value += r.value;
  }

  /* Array.from rather than a spread: spreading a Map iterator needs
     downlevelIteration, which this tsconfig does not set. Third time in this
     repository. */
  const out = Array.from(by.values()).sort((a, b) => a.key.localeCompare(b.key));
  for (let i = 0; i < out.length; i++) {
    const b = out[i]!;
    b.cpa = b.conversions > 0 ? b.cost / b.conversions : null;
    b.roas = b.cost > 0 ? b.value / b.cost : null;
    const prev = out[i - 1];
    if (prev) {
      b.deltaCost = pct(b.cost, prev.cost);
      b.deltaConversions = pct(b.conversions, prev.conversions);
      b.deltaValue = pct(b.value, prev.value);
    }
  }
  return out;
}

/** Daily rows, in any order, as the three grains. from and to fall back to the window asked for. */
export function periodsOf(rows: DayRow[], from: string, to: string): Periods {
  const daily = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  return {
    day: roll(daily, (d) => d, dayLabel),
    week: roll(daily, mondayOf, (k) => `Week of ${dayLabel(k)}`),
    month: roll(daily, (d) => d.slice(0, 7), monthLabel),
    from: daily[0]?.date ?? from,
    to: daily[daily.length - 1]?.date ?? to,
  };
}
