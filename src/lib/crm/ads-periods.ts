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
 * row back a day. The bucketing is in period-buckets.ts, shared with ChatGPT
 * ads (openai-ads.ts) so both channels count a week the same way.
 */
import { unstable_cache } from "next/cache";
import { ADS_ACCOUNT, isForeign, iso, num, search, type AdSite } from "./google-ads";
import { periodsOf, type Bucket, type DayRow, type Periods } from "./period-buckets";

export type { Bucket, Grain, Periods } from "./period-buckets";

export type PeriodsResult = { ok: true; data: Periods } | { ok: false; reason: string };

/**
 * ── WHY THIS IS CACHED, AND WHY IT THROWS INSIDE THE CACHE ───────
 *
 * Google Ads is quota'd and this was read fresh on every page load. Once each
 * headline tile opened a page of its own, a reader clicking along the row paid
 * for the same reads seven times in a minute: the same shape of problem the
 * ROAS timeout fix set out to stop, on an API that answers with a quota rather
 * than with a slow read.
 *
 * Sixty seconds, throwing inside the cache so a failure is never what gets
 * stored. A bad read is retried by the next request rather than served for the
 * rest of the minute, which is the bug that made the Overview look unfixed
 * after it had been fixed twice.
 */
export const PERIODS_TAG = "crm-ads-periods";

export async function fetchPeriods(site: AdSite, days = 400): Promise<PeriodsResult> {
  try {
    return await unstable_cache(
      async () => {
        const r = await readPeriods(site, days);
        if (!r.ok) throw new Error(r.reason);
        return r;
      },
      ["crm-ads-periods", site, String(days)],
      { revalidate: 60, tags: [PERIODS_TAG, `${PERIODS_TAG}:${site}`] },
    )();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const reason = /abort|timeout/i.test(raw)
      ? "Google Ads took too long to answer. It is usually back on the next load."
      : raw;
    return { ok: false, reason };
  }
}

async function readPeriods(site: AdSite, days = 400): Promise<PeriodsResult> {
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

  return { ok: true, data: periodsOf(Array.from(byDate.values()), iso(from), iso(now)) };
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
