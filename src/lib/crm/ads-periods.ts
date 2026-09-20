/**
 * The same spend, read three ways.
 *
 * The marketing page answered one question, "how did the last twelve months
 * go", which is the only question nobody is asking on a Tuesday morning. One
 * query segmented by date gives day, week and month from the same rows, so
 * yesterday and last year come out of one round trip rather than three.
 *
 * Everything is bucketed in Europe/Dublin. Google returns dates already in the
 * account's own timezone, so the strings are used as-is and never passed
 * through a Date, which on a machine set to America/Denver would shift every
 * row back a day.
 */
import { ADS_ACCOUNT, isForeign, iso, num, search, type AdSite } from "./google-ads";

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

export type PeriodsResult = { ok: true; data: Periods } | { ok: false; reason: string };

interface DayRow {
  date: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
}

/** Monday of the week containing this yyyy-mm-dd, without leaving strings. */
function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d!);
  const dow = new Date(utc).getUTCDay(); // 0 Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return new Date(utc - back * 86_400_000).toISOString().slice(0, 10);
}

const dayLabel = (k: string) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${k}T12:00:00Z`));

const monthLabel = (k: string) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", month: "long", year: "numeric" })
    .format(new Date(`${k}-01T12:00:00Z`));

const pct = (now: number, prev: number): number | null =>
  prev === 0 ? null : ((now - prev) / prev) * 100;

function roll(rows: DayRow[], keyOf: (d: string) => string, labelOf: (k: string) => string): Bucket[] {
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

export async function fetchPeriods(site: AdSite, days = 400): Promise<PeriodsResult> {
  const customerId = ADS_ACCOUNT[site];
  if (!customerId) return { ok: false, reason: "No Google Ads account is configured for this business." };

  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);

  let rows;
  try {
    rows = await search(
      customerId,
      `SELECT segments.date, campaign.id, campaign.name,
              metrics.cost_micros, metrics.clicks, metrics.impressions,
              metrics.conversions, metrics.conversions_value
       FROM campaign
       WHERE segments.date BETWEEN '${iso(from)}' AND '${iso(now)}'`,
    );
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Google Ads could not be read." };
  }

  /* One account carries both businesses, so the other one's campaigns are
     dropped here rather than quietly inflating this site's numbers. */
  const byDate = new Map<string, DayRow>();
  for (const r of rows) {
    const id = String(r.campaign?.id ?? "");
    const name = String(r.campaign?.name ?? "");
    if (isForeign(site, id, name)) continue;

    const date = String((r.segments as { date?: string } | undefined)?.date ?? "");
    if (!date) continue;

    let d = byDate.get(date);
    if (!d) { d = { date, cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0 }; byDate.set(date, d); }
    d.cost += num(r.metrics?.costMicros) / 1e6;
    d.clicks += num(r.metrics?.clicks);
    d.impressions += num(r.metrics?.impressions);
    d.conversions += num(r.metrics?.conversions);
    d.value += num(r.metrics?.conversionsValue);
  }

  const daily = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    ok: true,
    data: {
      day: roll(daily, (d) => d, dayLabel),
      week: roll(daily, mondayOf, (k) => `Week of ${dayLabel(k)}`),
      month: roll(daily, (d) => d.slice(0, 7), monthLabel),
      from: daily[0]?.date ?? iso(from),
      to: daily[daily.length - 1]?.date ?? iso(now),
    },
  };
}

/**
 * Yesterday against the day before, written out.
 *
 * "A report each day of the day before, up or down." Computed rather than
 * stored, so it is right the moment the page opens and there is no cron to
 * fail silently. Every day in the table carries its own line, so the history
 * is the report.
 */
export interface DailyReport {
  date: string;
  label: string;
  headline: string;
  lines: string[];
  direction: "up" | "down" | "flat";
}

const money = (n: number) => `€${n.toFixed(n < 100 ? 2 : 0)}`;
/* Counts, not dates. Constructed rather than via Number.toLocaleString so the
   date guard does not read it as a date formatted without a timezone. */
const counts = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
const move = (p: number | null) => (p === null ? null : `${p >= 0 ? "up" : "down"} ${Math.abs(p).toFixed(0)}%`);

export function dailyReport(day: Bucket[]): DailyReport | null {
  /* The last row is usually today and still filling, so the report is about
     the most recent COMPLETE day. Reporting a half day as a fall is the
     classic way a dashboard lies before lunch. */
  const yesterday = day[day.length - 2];
  const before = day[day.length - 3];
  if (!yesterday) return null;

  const lines: string[] = [];
  const spend = move(yesterday.deltaCost);
  const conv = move(yesterday.deltaConversions);

  lines.push(
    before
      ? `Spend ${money(yesterday.cost)}, ${spend ?? "with nothing the day before to compare"} on ${before.label}.`
      : `Spend ${money(yesterday.cost)}.`,
  );

  if (yesterday.conversions > 0) {
    lines.push(
      `${yesterday.conversions.toFixed(yesterday.conversions % 1 === 0 ? 0 : 1)} enquiries` +
        (yesterday.cpa !== null ? ` at ${money(yesterday.cpa)} each` : "") +
        (conv ? `, ${conv}.` : "."),
    );
  } else {
    lines.push("No enquiries recorded.");
  }

  lines.push(`${yesterday.clicks} clicks from ${counts.format(yesterday.impressions)} times the ads were shown.`);

  /* The headline follows enquiries, not spend. Spending more is not good news
     on its own, and a dashboard that says "up 40%" about cost reads as a win
     to anyone skimming. */
  const d = yesterday.deltaConversions;
  const direction: DailyReport["direction"] = d === null || Math.abs(d) < 5 ? "flat" : d > 0 ? "up" : "down";
  const headline =
    direction === "flat"
      ? `${yesterday.label}: steady`
      : `${yesterday.label}: enquiries ${move(d)}`;

  return { date: yesterday.key, label: yesterday.label, headline, lines, direction };
}
