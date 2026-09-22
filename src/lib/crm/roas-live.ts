/**
 * What the ads cost and what came back, live, by month.
 *
 * ── WHAT THE TWO SHADES MEAN ─────────────────────────────────────
 *
 * Solid: money Stripe took on a payment that carried a Google click id. Known.
 * Every website sale that landed on a tagged ad URL since May was captured with
 * its click id, so on the website this is exact.
 *
 * Grey: an estimate, and only for the money whose source cannot be seen. A job
 * paid through a payment link made by hand in Stripe, or through an invoice,
 * has no browser behind it and can never carry a click id, so nobody can say
 * whether that customer first came from an ad. For those the grey assumes they
 * found the business the same way website buyers did over the previous three
 * months: if a third of website money came in through an ad, a third of the
 * unseen money is drawn grey.
 *
 * ── TWO PREMISES THIS REPLACES, BOTH WRONG ───────────────────────
 *
 * "The click id capture died on 12 August." It did not. Reading the landing
 * page on each paid website session: every ad sale landed on a gbraid URL and
 * was captured. From 17 August not one website buyer landed on an ad URL at all.
 * They came through organic Google search, one through ChatGPT.
 *
 * "Google Ads is the only marketing this business does, so every euro is the
 * ad return." Also not true, for the same reason: organic search carried
 * September. Counting every euro would have drawn September at about 13x, the
 * mirror image of the 0.0x the strict version drew. Both were wrong, and the
 * swing between them is why the owner saw different figures every time.
 *
 * ── WHAT IS LEFT OUT ─────────────────────────────────────────────
 *
 * Subscription renewals. They are real revenue and they are recurring billing
 * from customers won months ago, so no ad can claim one as a sale in the month
 * it is charged. Counting them would credit this month's ads with last year's
 * customers.
 *
 * ── ONE SOURCE ───────────────────────────────────────────────────
 *
 * Charges, every one that succeeded and was not refunded, the same list
 * Stripe's own dashboard adds up. Checkout sessions are read only to learn
 * which charge carried a click id and which came through a payment link.
 */
import { unstable_cache } from "next/cache";
import { fetchPeriods } from "./ads-periods";
import type { Site } from "./db";

export interface RoasMonth {
  /** yyyy-mm */
  key: string;
  /** "May 2026" */
  label: string;
  spend: number;
  /** Money on a payment that carried a Google click id. Drawn solid. */
  back: number;
  /** Estimated from ads, of the money whose source cannot be seen. Drawn grey. */
  estimated: number;
  /** Every euro Stripe took that month, subscription renewals excluded. */
  taken: number;
  /** Money on hand-made links and invoices, whose source cannot be seen. */
  unseen: number;
  /** The share of website money that came through an ad, over this month and
      the two before it. What the grey is worked out from. */
  share: number;
  sales: number;
  tiedSales: number;
  /** The month is still running, so its figures are not yet a month's. */
  partial: boolean;
}

export interface RoasLive {
  months: RoasMonth[];
  spend: number;
  back: number;
  estimated: number;
  from: string;
  to: string;
}

export type RoasLiveResult = { ok: true; data: RoasLive } | { ok: false; reason: string };

export const ROAS_LIVE_TAG = "crm-roas-live";
const MONTHS = 12;

const label = (key: string) =>
  new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric", timeZone: "Europe/Dublin" })
    .format(new Date(`${key}-01T12:00:00Z`));

interface MonthMoney {
  taken: number; sales: number; tied: number; tiedSales: number;
  site: number; siteTied: number; unseen: number;
}
const emptyMoney = (): MonthMoney => ({ taken: 0, sales: 0, tied: 0, tiedSales: 0, site: 0, siteTied: 0, unseen: 0 });

/**
 * Every charge, by month, and how much of it carried a click id.
 *
 * A charge knows nothing about click ids; they live on the checkout session
 * that produced it. So the sessions are read too, only to mark which
 * payment_intents were tied, and the money itself is counted once, from the
 * charge. Refunds and failures are left out.
 */
async function chargesByMonth(sinceUnix: number): Promise<Map<string, MonthMoney>> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return new Map();
  const headers = { Authorization: `Bearer ${key}` };

  const tiedIntents = new Set<string>();
  /* Which payments came through the website's own checkout, as opposed to a
     payment link made by hand. Only the website ones say where the buyer came
     from, so only they can set the rate the grey is drawn at. */
  const siteIntents = new Set<string>();
  const linkIntents = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < 40; page++) {
    const qs = new URLSearchParams({ limit: "100", "created[gte]": String(sinceUnix) });
    if (after) qs.set("starting_after", after);
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions?${qs}`, {
      headers, cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as {
      data?: { id: string; payment_intent?: string | null; client_reference_id?: string | null;
               metadata?: Record<string, string>; payment_link?: string | null }[];
      has_more?: boolean; error?: { message?: string };
    };
    if (body.error) throw new Error(`Stripe: ${body.error.message ?? "unknown error"}`);
    const data = body.data ?? [];
    for (const s of data) {
      const tied = Boolean((s.metadata?.gclid ?? "").trim() || (s.client_reference_id ?? "").trim());
      if (!s.payment_intent) continue;
      if (tied) tiedIntents.add(s.payment_intent);
      if (s.payment_link) linkIntents.add(s.payment_intent);
      else siteIntents.add(s.payment_intent);
    }
    if (!body.has_more || data.length === 0) break;
    after = data[data.length - 1]!.id;
  }

  const by = new Map<string, MonthMoney>();
  after = null;
  for (let page = 0; page < 40; page++) {
    const qs = new URLSearchParams({ limit: "100", "created[gte]": String(sinceUnix) });
    if (after) qs.set("starting_after", after);
    const res = await fetch(`https://api.stripe.com/v1/charges?${qs}`, {
      headers, cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as {
      data?: { id: string; created: number; amount: number; status: string; refunded: boolean;
               payment_intent?: string | null; description?: string | null;
               billing_details?: { name?: string | null } | null }[];
      has_more?: boolean; error?: { message?: string };
    };
    if (body.error) throw new Error(`Stripe: ${body.error.message ?? "unknown error"}`);
    const data = body.data ?? [];
    for (const c of data) {
      if (c.status !== "succeeded" || c.refunded || c.amount <= 0) continue;
      const text = `${c.description ?? ""} ${c.billing_details?.name ?? ""}`;
      /* The same split the offline upload uses: SmartCare Living's charges are
         not Smart Space's return. */
      if (/smartguardian|smartcare/i.test(text)) continue;
      /* Recurring billing, not a sale an ad can claim this month. */
      if (/^subscription (creation|update|cycle)/i.test(c.description ?? "")) continue;

      const k = new Date(c.created * 1000).toISOString().slice(0, 7);
      const cur = by.get(k) ?? emptyMoney();
      const amount = c.amount / 100;
      const pi = c.payment_intent ?? "";
      const tied = Boolean(pi && tiedIntents.has(pi));
      cur.taken += amount; cur.sales += 1;
      if (tied) { cur.tied += amount; cur.tiedSales += 1; }
      if (pi && siteIntents.has(pi)) {
        cur.site += amount;
        if (tied) cur.siteTied += amount;
      } else if (!tied) {
        /* A hand-made link or an invoice with no click id: somebody paid, and
           nothing says how they first found the business. */
        cur.unseen += amount;
      }
      by.set(k, cur);
    }
    if (!body.has_more || data.length === 0) break;
    after = data[data.length - 1]!.id;
  }
  return by;
}

async function read(site: Site): Promise<RoasLive> {
  const periods = await fetchPeriods(site);
  if (!periods.ok) throw new Error(periods.reason);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - MONTHS, 1);
  since.setUTCHours(0, 0, 0, 0);

  /* Only Smart Space sells through Stripe. A chart with no money bars is the
     truth for anyone else, not a fault. */
  const money = site === "smart-space"
    ? await chargesByMonth(Math.floor(since.getTime() / 1000))
    : new Map<string, MonthMoney>();

  const spendByMonth = new Map<string, number>();
  for (const m of periods.data.month) {
    if (m.key >= since.toISOString().slice(0, 7)) spendByMonth.set(m.key, m.cost);
  }

  const keySet = new Set<string>();
  spendByMonth.forEach((_, k) => keySet.add(k));
  money.forEach((_, k) => keySet.add(k));
  const keys = Array.from(keySet).sort();
  const kept = keys.filter((k) => (spendByMonth.get(k) ?? 0) > 0 || (money.get(k)?.taken ?? 0) > 0).slice(-MONTHS);

  /*
   * The rate the grey is drawn at: website money through an ad, over this
   * month and the two before it.
   *
   * Three months rather than one, because a job paid by link in September was
   * usually quoted in August from an enquiry in July. The consultation comes
   * first and the payment weeks later, so this month's website buyers are the
   * wrong sample for this month's link payments.
   */
  const shareAt = (i: number) => {
    let site = 0, siteTied = 0;
    for (let j = Math.max(0, i - 2); j <= i; j++) {
      const m = money.get(kept[j]!);
      if (!m) continue;
      site += m.site; siteTied += m.siteTied;
    }
    return site > 0 ? siteTied / site : 0;
  };

  const months: RoasMonth[] = kept.map((k, i) => {
    const m = money.get(k) ?? emptyMoney();
    const share = shareAt(i);
    return {
      key: k, label: label(k), spend: spendByMonth.get(k) ?? 0,
      back: m.tied,
      estimated: Math.round(m.unseen * share),
      taken: m.taken, unseen: m.unseen, share,
      sales: m.sales, tiedSales: m.tiedSales,
      partial: k === thisMonth,
    };
  });

  return {
    months,
    spend: months.reduce((s, m) => s + m.spend, 0),
    back: months.reduce((s, m) => s + m.back, 0),
    estimated: months.reduce((s, m) => s + m.estimated, 0),
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
