/**
 * Money out against money back, read from the daily store.
 *
 * ── WHY THIS DOES NOT READ GOOGLE DIRECTLY ───────────────────────
 *
 * Google restates the last few days as late attributions land, so a chart
 * drawn live from the API changes shape between two loads of the same page.
 * /api/cron/snapshot-ads writes one row per day per business and this reads
 * those rows, so the history stops moving on its own.
 *
 * ── WHY THERE ARE THREE ANSWERS AND NOT ONE ──────────────────────
 *
 * "Return on ad spend" sounds like one number and is really three. Picking one
 * quietly would mislead, and the three mislead in different directions:
 *
 *   google  what Google recorded against the ads. Mostly placeholder values
 *           set per conversion action rather than real prices, mixed with a
 *           few real Stripe amounts. It is the number the old chart drew and
 *           it is the least true of the three.
 *   ad      money Stripe actually took on a checkout that carried a Google
 *           click id. Real euro, conservatively attributed: if the click id
 *           was not captured the payment is not counted, so this can only
 *           ever understate.
 *   all     every euro Stripe took, including work that came from the van, a
 *           neighbour or a phone call that never saw an ad. Real euro,
 *           generously attributed, so it can only ever overstate.
 *
 * The truth for any month sits between `ad` and `all`. Both are shown, and the
 * chart says which is on screen rather than calling either of them ROAS.
 */
import { crm, type Site } from "./db";

export type Grain = "day" | "week" | "month";

export interface RoasBucket {
  key: string;
  label: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  /** What Google recorded against the ads. */
  googleValue: number;
  /** Stripe money on a checkout that carried a Google click id. */
  adRevenue: number;
  /** Every euro Stripe took in the period. */
  allRevenue: number;
  orders: number;
  /** True while the bucket is still running, so its bars read low. */
  partial: boolean;
  /** First and last day with data in this bucket, for marking the blind run. */
  start: string;
  end: string;
  /**
   * Spend inside this bucket that falls after attribution stopped working.
   * The bar still shows the whole spend, because it was really spent, but the
   * return printed over it is worked out on the rest: charging a month for
   * money it had no way of being credited for is how August came to read as a
   * loss when it was not.
   */
  spendBlind: number;
}

/** One set of totals for the whole window, so the headline figures do not
 *  change when the reader switches between daily, weekly and monthly. */
export interface RoasTotals {
  spend: number;
  clicks: number;
  conversions: number;
  googleValue: number;
  adRevenue: number;
  allRevenue: number;
  /** Days included. */
  days: number;
}

export interface RoasData {
  day: RoasBucket[];
  week: RoasBucket[];
  month: RoasBucket[];
  from: string;
  to: string;
  /** When the store was last written for this business. */
  capturedAt: string | null;
  /**
   * Whether this business takes money in a way we can read at all. SmartCare
   * Living's enquiries are invoiced off-platform, so it has no takings and a
   * zero would read as "the ads earned nothing".
   */
  revenueKnown: boolean;
  /** Last day a payment carried a Google click id, or null if none ever did. */
  lastAttributed: string | null;
  /** Days since then on which money was spent and nothing could be attributed. */
  blindDays: number;
  /** Money taken during those blind days: real income no ad can be credited for. */
  blindRevenue: number;
  /** Everything up to and including the last day attribution worked. */
  counted: RoasTotals;
  /** Everything after it, which no ad can be credited or blamed for. */
  excluded: RoasTotals;
}

export type RoasResult = { ok: true; data: RoasData } | { ok: false; reason: string };

interface AdRow {
  on_date: string; cost_cents: number; clicks: number; impressions: number;
  conversions: number | string; conv_value_cents: number; captured_at: string;
}
interface RevRow {
  on_date: string; gross_cents: number; orders: number; attributed_cents: number | null;
}

const cents = (v: unknown) => (typeof v === "number" ? v : parseInt(String(v ?? 0), 10) || 0) / 100;
const numOf = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);

/**
 * Monday of the week containing this yyyy-mm-dd, without leaving strings.
 *
 * Dates arrive already in the account's own timezone. This machine is set to
 * America/Denver, and passing them through a local Date would shift every row
 * back a day.
 */
function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d!);
  const dow = new Date(utc).getUTCDay();
  return new Date(utc - (dow === 0 ? 6 : dow - 1) * 86_400_000).toISOString().slice(0, 10);
}

const dayLabel = (k: string) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short" })
    .format(new Date(`${k}T12:00:00Z`));

/* Just the date. "w/c" on every one of twenty-four weekly labels is
   twenty-four repetitions of a fact the axis already establishes, and it was
   what pushed them into overlapping. */
const weekLabel = (k: string) => dayLabel(k);

const monthLabel = (k: string) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", month: "short", year: "numeric" })
    .format(new Date(`${k}-01T12:00:00Z`));

interface DayCell {
  date: string;
  spend: number; clicks: number; impressions: number; conversions: number;
  googleValue: number; adRevenue: number; allRevenue: number; orders: number;
}

function roll(cells: DayCell[], keyOf: (d: string) => string, labelOf: (k: string) => string,
              openKey: string, lastAttributed: string | null): RoasBucket[] {
  const by = new Map<string, RoasBucket>();
  for (const c of cells) {
    const key = keyOf(c.date);
    let b = by.get(key);
    if (!b) {
      b = { key, label: labelOf(key), spend: 0, clicks: 0, impressions: 0, conversions: 0,
            googleValue: 0, adRevenue: 0, allRevenue: 0, orders: 0, partial: key === openKey,
            start: c.date, end: c.date, spendBlind: 0 };
      by.set(key, b);
    }
    if (lastAttributed && c.date > lastAttributed) b.spendBlind += c.spend;
    if (c.date < b.start) b.start = c.date;
    if (c.date > b.end) b.end = c.date;
    b.spend += c.spend; b.clicks += c.clicks; b.impressions += c.impressions;
    b.conversions += c.conversions; b.googleValue += c.googleValue;
    b.adRevenue += c.adRevenue; b.allRevenue += c.allRevenue; b.orders += c.orders;
  }
  /* Array.from rather than a spread: spreading a Map iterator needs
     downlevelIteration, which this tsconfig does not set. */
  return Array.from(by.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export async function fetchRoas(site: Site, days = 400): Promise<RoasResult> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  let ads: AdRow[] | null;
  let rev: RevRow[] | null;
  try {
    [ads, rev] = await Promise.all([
      crm<AdRow[]>(
        `crm_ads_daily?site=eq.${site}&on_date=gte.${since}` +
        `&select=on_date,cost_cents,clicks,impressions,conversions,conv_value_cents,captured_at` +
        `&order=on_date.asc&limit=1000`,
      ),
      crm<RevRow[]>(
        `crm_revenue_daily?site=eq.${site}&on_date=gte.${since}` +
        `&select=on_date,gross_cents,orders,attributed_cents&order=on_date.asc&limit=1000`,
      ),
    ]);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }

  if (!ads) return { ok: false, reason: "The CRM database is not configured on this deployment." };
  if (ads.length === 0) {
    return { ok: false, reason: "Nothing has been recorded for this business yet. The daily pull runs at 03:10." };
  }

  const revByDate = new Map<string, RevRow>();
  for (const r of rev ?? []) revByDate.set(r.on_date, r);

  const cells: DayCell[] = ads.map((a) => {
    const r = revByDate.get(a.on_date);
    return {
      date: a.on_date,
      spend: cents(a.cost_cents),
      clicks: numOf(a.clicks),
      impressions: numOf(a.impressions),
      conversions: numOf(a.conversions),
      googleValue: cents(a.conv_value_cents),
      adRevenue: r ? cents(r.attributed_cents ?? 0) : 0,
      allRevenue: r ? cents(r.gross_cents) : 0,
      orders: r ? numOf(r.orders) : 0,
    };
  });

  /* Money can land on a day the ads did not run, and dropping it would
     understate every month it falls in. */
  for (const r of rev ?? []) {
    if (revByDate.has(r.on_date) && !ads.some((a) => a.on_date === r.on_date)) {
      cells.push({
        date: r.on_date, spend: 0, clicks: 0, impressions: 0, conversions: 0, googleValue: 0,
        adRevenue: cents(r.attributed_cents ?? 0), allRevenue: cents(r.gross_cents), orders: numOf(r.orders),
      });
    }
  }
  cells.sort((a, b) => a.date.localeCompare(b.date));

  const today = new Date().toISOString().slice(0, 10);
  const from = cells[0]!.date;
  const to = cells[cells.length - 1]!.date;

  /* The click id is written at checkout and stopped being written in August.
     Every payment since is invisible to attribution whatever caused it, so the
     chart has to say "not known" rather than draw a zero and let it read as a
     collapse. */
  const withClickId = (rev ?? []).filter((r) => cents(r.attributed_cents ?? 0) > 0);
  const lastAttributed = withClickId.length ? withClickId[withClickId.length - 1]!.on_date : null;
  const blind = lastAttributed ? cells.filter((c) => c.date > lastAttributed) : [];
  const blindDays = blind.filter((c) => c.spend > 0).length;
  const blindRevenue = blind.reduce((s, c) => s + c.allRevenue, 0);

  const sum = (xs: DayCell[]): RoasTotals => ({
    spend: xs.reduce((s, c) => s + c.spend, 0),
    clicks: xs.reduce((s, c) => s + c.clicks, 0),
    conversions: xs.reduce((s, c) => s + c.conversions, 0),
    googleValue: xs.reduce((s, c) => s + c.googleValue, 0),
    adRevenue: xs.reduce((s, c) => s + c.adRevenue, 0),
    allRevenue: xs.reduce((s, c) => s + c.allRevenue, 0),
    days: xs.length,
  });
  /* Totals are taken over days, never over whichever buckets are on screen.
     Rolled per grain they came out differently for the same window, because a
     week that straddles the break is excluded whole while the month it sits in
     is not, and a headline figure that moves when you change the x axis is the
     sort of thing that cost these charts their credibility in the first
     place. */
  const countedCells = lastAttributed ? cells.filter((c) => c.date <= lastAttributed) : cells;
  const excludedCells = lastAttributed ? cells.filter((c) => c.date > lastAttributed) : [];

  const capturedAt = ads.reduce<string | null>(
    (latest, a) => (!latest || a.captured_at > latest ? a.captured_at : latest), null,
  );

  return {
    ok: true,
    data: {
      day: roll(cells, (d) => d, dayLabel, today, lastAttributed).slice(-90),
      week: roll(cells, mondayOf, weekLabel, mondayOf(today), lastAttributed),
      month: roll(cells, (d) => d.slice(0, 7), monthLabel, today.slice(0, 7), lastAttributed),
      from, to, capturedAt,
      revenueKnown: (rev ?? []).length > 0,
      lastAttributed, blindDays, blindRevenue,
      counted: sum(countedCells),
      excluded: sum(excludedCells),
    },
  };
}
