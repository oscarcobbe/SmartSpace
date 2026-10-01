/**
 * What ChatGPT ads cost, read three ways, beside Google's (ads-periods.ts).
 *
 * OpenAI's Insights API, one row per campaign per day, summed per day and
 * rolled into days, weeks and months by the same code as Google's
 * (period-buckets.ts). The request shape, the paging and the error rules are
 * the FourWinds portal's (src/lib/eurus/openai-ads.ts), which reads the same
 * accounts nightly.
 *   https://developers.openai.com/ads/api-reference/insights
 *
 * ── WHICH KEY, AND WHY IT IS CHECKED ─────────────────────────────
 *
 * An Advertiser API key, made in Ads Manager under Settings, "is scoped to one
 * ad account", so the account is whatever the key says it is. One per
 * business, because each has its own account:
 *
 *   Smart Space        OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE
 *   SmartCare Living   OPENAI_ADS_ADVERTISER_KEY_SCL
 *
 * Before any spend is read, GET /ad_account must name the account this
 * business owns (below, confirmed 1 October 2026). A key pasted into the other
 * business's variable would otherwise show one business's ChatGPT spend as the
 * other's, and nothing on the page would look wrong.
 *
 * OPENAI_ADS_API_KEY is never read here. On this site that name holds the
 * Conversions API key, which sends events and reads nothing.
 *
 * ── WHAT ARRIVES ─────────────────────────────────────────────────
 *
 * Spend is a decimal in the account's currency (18.42, or "18.42"), not
 * micros. Dividing it by a million as Google's is would turn a €40 day into
 * €0.00004. Both accounts are in euro and Europe/Dublin; an account that says
 * otherwise is refused rather than drawn in the wrong currency or on the wrong
 * days.
 *
 * Conversions must be asked for in whole days of the account's timezone, over
 * at most 365 days, and no bound may be in the future. So the window is the
 * 365 days that end yesterday, as a date_range of local dates with until
 * inclusive. Today is not in it: today's figures arrive tomorrow.
 *
 * value is not read: the return on ChatGPT ads is the Stripe money traced to a
 * ChatGPT ad (roas-months.ts), not a figure from OpenAI. So every bucket's
 * value is 0 and its roas null.
 *
 * ── NOT CONNECTED IS NOT A FAILURE ───────────────────────────────
 *
 * Without the key, the answer is "ChatGPT ads not connected" and nothing is
 * asked of anybody. A failure with the key set is a reason on the page, never
 * a page that fails.
 *
 * fetch, the environment and the clock are passed in, so
 * scripts/check-openai-ads-spend.mjs can run this with none of them real.
 */
import { unstable_cache } from "next/cache";
import type { Site } from "./db";
import { periodsOf, type DayRow, type Periods } from "./period-buckets";

export const OPENAI_ADS_API = "https://api.ads.openai.com/v1";

/** Where each business's Advertiser API key is read from. */
export const OPENAI_ADS_KEY_ENV: Record<Site, string> = {
  "smart-space": "OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE",
  smartcareliving: "OPENAI_ADS_ADVERTISER_KEY_SCL",
};

/** The ad account each key must belong to. Both EUR, Europe/Dublin. */
export const OPENAI_AD_ACCOUNT: Record<Site, string> = {
  "smart-space": "adacct_6abd50f5d8688195949131d623f78b90",
  smartcareliving: "adacct_6abc732cf0f0819b9b1b7bb89e80e774",
};

export const NOT_CONNECTED = "ChatGPT ads not connected";

/** The Insights fields asked for, in the canonical names the API takes. */
export const OPENAI_ADS_FIELDS = [
  "metadata.readable_time",
  "campaign.id",
  "campaign.name",
  "campaign.impressions",
  "campaign.clicks",
  "campaign.spend",
  "campaign.conversions",
] as const;

/** One row as the API serialises it: canonical names become flat keys. */
export interface OpenAiAdsRow {
  readable_time?: string;
  campaign_id?: string;
  campaign_name?: string | null;
  impressions?: number | string | null;
  clicks?: number | string | null;
  spend?: number | string | null;
  conversions?: number | string | null;
}

export type Fetch = (input: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export interface OpenAiAdAccount {
  id: string;
  name: string | null;
  currency: string | null;
  timezone: string | null;
}

export interface OpenAiPeriods extends Periods {
  account: OpenAiAdAccount;
}

/** connected false: no key on this deployment. connected true: a key, and a reason it was not read. */
export type OpenAiPeriodsResult =
  | { ok: true; data: OpenAiPeriods }
  | { ok: false; connected: boolean; reason: string };

/** The API's own message where it gave one, cut short, never the key. */
async function failure(what: string, res: { status: number; text(): Promise<string> }): Promise<Error> {
  let detail = "";
  try {
    const body = await res.text();
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
      detail = parsed.error?.message ?? parsed.message ?? body;
    } catch {
      detail = body;
    }
  } catch {
    // The status alone is still worth reporting.
  }
  detail = detail.replace(/\s+/g, " ").trim().slice(0, 200);
  return new Error(`OpenAI Ads ${what} answered ${res.status}${detail ? `: ${detail}` : ""}`);
}

export async function getAdAccount(key: string, fetchImpl: Fetch): Promise<OpenAiAdAccount> {
  const res = await fetchImpl(`${OPENAI_ADS_API}/ad_account`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw await failure("ad_account", res);
  const body = (await res.json()) as Record<string, unknown>;
  if (typeof body.id !== "string" || !body.id) {
    throw new Error("OpenAI Ads ad_account answered without an account id");
  }
  return {
    id: body.id,
    name: typeof body.name === "string" ? body.name : null,
    currency: typeof body.currency_code === "string" ? body.currency_code : null,
    timezone: typeof body.timezone === "string" ? body.timezone : null,
  };
}

/**
 * One row per campaign per day, from `since` to `until` inclusive, both local
 * dates. Paged with `after`, 2,000 rows a page, and capped, because a cursor
 * that never ends would otherwise hold the page until its time limit.
 */
export async function dailyCampaignInsights(
  key: string,
  since: string,
  until: string,
  fetchImpl: Fetch,
  maxPages = 25,
): Promise<OpenAiAdsRow[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    throw new Error(`Refusing to ask OpenAI Ads for ${since} to ${until}`);
  }
  const rows: OpenAiAdsRow[] = [];
  let after: string | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams();
    params.set("time_granularity", "daily");
    params.set("aggregation_level", "campaign");
    params.set("limit", "2000");
    for (const field of OPENAI_ADS_FIELDS) params.append("fields[]", field);
    params.append("time_ranges[]", JSON.stringify({ type: "date_range", since, until }));
    if (after) params.set("after", after);

    const res = await fetchImpl(`${OPENAI_ADS_API}/ad_account/insights?${params.toString()}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) throw await failure("insights", res);

    const body = (await res.json()) as { data?: unknown; has_more?: unknown; last_id?: unknown };
    if (!Array.isArray(body.data)) throw new Error("OpenAI Ads insights answered without a data list");
    rows.push(...(body.data as OpenAiAdsRow[]));

    if (body.has_more !== true) return rows;
    if (typeof body.last_id !== "string" || !body.last_id || body.last_id === after) {
      throw new Error("OpenAI Ads insights said there was more but gave no new cursor");
    }
    after = body.last_id;
  }
  throw new Error(`OpenAI Ads insights still had more after ${maxPages} pages`);
}

/** A number the API sent as a number, a decimal string, or nothing. */
function amount(raw: number | string | null | undefined): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Campaign rows summed into one row per day. Spend is euro as sent, never micros. */
export function dailyRows(rows: readonly OpenAiAdsRow[]): DayRow[] {
  const byDay = new Map<string, DayRow>();
  for (const row of rows) {
    const date = row.readable_time ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const day = byDay.get(date) ?? { date, cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0 };
    day.cost += amount(row.spend);
    day.clicks += amount(row.clicks);
    day.impressions += amount(row.impressions);
    day.conversions += amount(row.conversions);
    byDay.set(date, day);
  }
  return Array.from(byDay.values());
}

/** A date in Europe/Dublin, `daysBack` days before `now`'s Dublin date, as yyyy-mm-dd. */
export function dublinDate(now: Date, daysBack: number): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! - daysBack)).toISOString().slice(0, 10);
}

export interface ReadDeps {
  fetchImpl?: Fetch;
  env?: Record<string, string | undefined>;
  now?: Date;
}

const realFetch: Fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });

/** The business's key, or "" when it is not set. Only its own variable. */
export function keyFor(site: Site, env: Record<string, string | undefined> = process.env): string {
  return (env[OPENAI_ADS_KEY_ENV[site]] ?? "").trim();
}

export async function readOpenAiPeriods(site: Site, deps: ReadDeps = {}): Promise<OpenAiPeriodsResult> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? realFetch;
  const now = deps.now ?? new Date();
  const keyEnv = OPENAI_ADS_KEY_ENV[site];
  const key = keyFor(site, env);
  if (!key) return { ok: false, connected: false, reason: `${NOT_CONNECTED}: ${keyEnv} is not set on this deployment.` };

  const until = dublinDate(now, 1);
  const since = dublinDate(now, 365);
  try {
    const account = await getAdAccount(key, fetchImpl);
    const expected = OPENAI_AD_ACCOUNT[site];
    if (account.id !== expected) {
      return { ok: false, connected: true, reason: `${keyEnv} belongs to ad account ${account.id}, not ${expected}, so nothing was read.` };
    }
    if (account.currency && account.currency.toUpperCase() !== "EUR") {
      return { ok: false, connected: true, reason: `Ad account ${account.id} reports in ${account.currency}, and these pages are in euro, so nothing was read.` };
    }
    if (account.timezone && account.timezone !== "Europe/Dublin") {
      return { ok: false, connected: true, reason: `Ad account ${account.id} keeps its days in ${account.timezone}, not Europe/Dublin, so its days would not line up with Google's. Nothing was read.` };
    }
    const rows = await dailyCampaignInsights(key, since, until, fetchImpl);
    const periods = periodsOf(dailyRows(rows), since, until);
    for (const b of [...periods.day, ...periods.week, ...periods.month]) b.roas = null;
    return { ok: true, data: { ...periods, account } };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const reason = /abort|timeout/i.test(raw)
      ? "OpenAI Ads took too long to answer. It is usually back on the next load."
      : raw;
    return { ok: false, connected: true, reason: reason.split(key).join("[key]") };
  }
}

/**
 * Cached for sixty seconds as Google's periods are, throwing inside the cache
 * so a failure is never what gets stored (ads-periods.ts has the account of
 * why). Not connected is answered before the cache: there is nothing to keep.
 */
export const OPENAI_PERIODS_TAG = "crm-openai-ads-periods";

export async function fetchOpenAiPeriods(site: Site): Promise<OpenAiPeriodsResult> {
  if (!keyFor(site)) return readOpenAiPeriods(site);
  try {
    return await unstable_cache(
      async () => {
        const r = await readOpenAiPeriods(site);
        if (!r.ok) throw new Error(r.reason);
        return r;
      },
      ["crm-openai-ads-periods", site],
      { revalidate: 60, tags: [OPENAI_PERIODS_TAG, `${OPENAI_PERIODS_TAG}:${site}`] },
    )();
  } catch (err) {
    return { ok: false, connected: true, reason: err instanceof Error ? err.message : String(err) };
  }
}
