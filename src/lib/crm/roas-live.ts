/**
 * What the ads cost and what came back from them, live, by month.
 *
 * ── WHAT THIS IS ─────────────────────────────────────────────────
 *
 * One number a month: money out on Google Ads, money in through Stripe on a
 * payment that can be tied to an ad click. Nothing else. The previous chart
 * offered three definitions of "back", three grains, a second axis, a line, an
 * area and a dashed comparison to Google's own figure, and the person it was
 * for said it meant nothing. He was right. This is what he asked for in one
 * sentence: what you spend on ads versus what you got back from ads.
 *
 * ── WHY LIVE ─────────────────────────────────────────────────────
 *
 * The old chart read a nightly record so its history would not restate under
 * the reader. The reader did not want that: he wanted the number now. Spend
 * comes from the same Google Ads read every other figure on the page uses,
 * and money back is read from Stripe the same way the nightly snapshot reads
 * it, so the two cannot disagree about what "from an ad" means. Both are
 * cached for a minute, throwing inside the cache so a bad read is retried by
 * the next request rather than served for the rest of the minute.
 */
import { unstable_cache } from "next/cache";
import { fetchPeriods } from "./ads-periods";
import { paymentLinkRefs, revenueByDay } from "./snapshot";
import type { Site } from "./db";

export interface RoasMonth {
  /** yyyy-mm */
  key: string;
  /** "May 2026" */
  label: string;
  spend: number;
  /** Stripe money on a payment tied to an ad click, in euro. */
  back: number;
  /** The month is still running, so its figures are not yet a month's. */
  partial: boolean;
}

export interface RoasLive {
  months: RoasMonth[];
  spend: number;
  back: number;
  from: string;
  to: string;
}

export type RoasLiveResult = { ok: true; data: RoasLive } | { ok: false; reason: string };

export const ROAS_LIVE_TAG = "crm-roas-live";
const MONTHS = 12;

const label = (key: string) =>
  new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric", timeZone: "Europe/Dublin" })
    .format(new Date(`${key}-01T12:00:00Z`));

async function read(site: Site): Promise<RoasLive> {
  const periods = await fetchPeriods(site);
  if (!periods.ok) throw new Error(periods.reason);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - MONTHS, 1);
  since.setUTCHours(0, 0, 0, 0);

  /* Money back, by month, tied to an ad. Only Smart Space sells through
     Stripe; the read returns nothing for anyone else, and a chart with no
     "back" bars is the truth for that business rather than a fault. */
  const backByMonth = new Map<string, number>();
  if (site === "smart-space") {
    const refs = await paymentLinkRefs();
    const byDay = await revenueByDay(site, Math.floor(since.getTime() / 1000), refs);
    byDay.forEach((v, day) => {
      const k = day.slice(0, 7);
      backByMonth.set(k, (backByMonth.get(k) ?? 0) + v.attributed);
    });
  }

  const spendByMonth = new Map<string, number>();
  for (const m of periods.data.month) {
    if (m.key >= since.toISOString().slice(0, 7)) spendByMonth.set(m.key, m.cost);
  }

  const keySet = new Set<string>();
  spendByMonth.forEach((_, k) => keySet.add(k));
  backByMonth.forEach((_, k) => keySet.add(k));
  const keys = Array.from(keySet).sort();
  const months: RoasMonth[] = keys
    .filter((k) => (spendByMonth.get(k) ?? 0) > 0 || (backByMonth.get(k) ?? 0) > 0)
    .map((k) => ({
      key: k,
      label: label(k),
      spend: spendByMonth.get(k) ?? 0,
      back: backByMonth.get(k) ?? 0,
      partial: k === thisMonth,
    }))
    .slice(-MONTHS);

  return {
    months,
    spend: months.reduce((s, m) => s + m.spend, 0),
    back: months.reduce((s, m) => s + m.back, 0),
    from: months[0]?.label ?? "",
    to: months[months.length - 1]?.label ?? "",
  };
}

export async function fetchRoasLive(site: Site): Promise<RoasLiveResult> {
  try {
    const data = await unstable_cache(
      async () => read(site),
      ["crm-roas-live", site],
      { revalidate: 60, tags: [ROAS_LIVE_TAG, `${ROAS_LIVE_TAG}:${site}`] },
    )();
    return { ok: true, data };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: /abort|timeout/i.test(raw) ? "Stripe or Google took too long to answer. It is usually back on the next load." : raw,
    };
  }
}
