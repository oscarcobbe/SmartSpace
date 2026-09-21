/**
 * Write down what Google and Stripe said today, for both businesses.
 *
 * ── WHY THE CHARTS STOPPED BEING BELIEVED ────────────────────────
 *
 * The CRM read Google Ads live on every page load. Google restates figures for
 * up to three days as late attributions land, so the same month read twice
 * gave two different answers and the chart appeared to change shape on its
 * own. A chart that moves when nothing happened is a chart nobody trusts, and
 * that is most of why Nigel stopped trusting these.
 *
 * So this records what we were told, once a day, and the charts read from the
 * record. The live API is still there for "what changed in the account this
 * week", which is a question about now rather than a question about history.
 *
 * ── WHY IT RUNS ON VERCEL AND NOT ON A LAPTOP ────────────────────
 *
 * Every credential this needs is marked sensitive on the Vercel project, which
 * means `vercel env pull` writes empty strings for them and no machine here
 * can run it. Rather than keep a second copy of this logic in a script that
 * cannot be run, there is one copy, and /api/cron/snapshot-ads calls it.
 */
import { ADS_ACCOUNT, isForeign, iso, num, search, type AdSite } from "./google-ads";
import { crm, type Site } from "./db";

const SITES: AdSite[] = ["smart-space", "smartcareliving"];

export interface SnapshotSiteResult {
  site: Site;
  ok: boolean;
  adDays: number;
  revenueDays: number;
  detail?: string;
}

interface AdDay { cost: number; clicks: number; impressions: number; conversions: number; value: number }
interface RevDay { gross: number; orders: number; attributed: number }

/** Spend by day for one business, with the other business's campaigns dropped. */
async function adsByDay(site: AdSite, from: string, to: string): Promise<Map<string, AdDay>> {
  const rows = await search(
    ADS_ACCOUNT[site],
    `SELECT segments.date, campaign.id, campaign.name,
            metrics.cost_micros, metrics.clicks, metrics.impressions,
            metrics.conversions, metrics.conversions_value
     FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`,
  );

  const by = new Map<string, AdDay>();
  for (const row of rows) {
    const r = row as Record<string, Record<string, unknown>>;
    const date = String(r.segments?.date ?? "");
    if (!date) continue;
    /* SmartCare Living's first campaign ran on the Smart Space account before
       it had one of its own. Counted as Smart Space it makes that account look
       worse for work it never won. */
    if (isForeign(site, String(r.campaign?.id ?? ""), String(r.campaign?.name ?? ""))) continue;

    const cur = by.get(date) ?? { cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0 };
    cur.cost += num(r.metrics?.costMicros) / 1e6;
    cur.clicks += num(r.metrics?.clicks);
    cur.impressions += num(r.metrics?.impressions);
    cur.conversions += num(r.metrics?.conversions);
    cur.value += num(r.metrics?.conversionsValue);
    by.set(date, cur);
  }
  return by;
}

/**
 * Real money taken, by day, from Stripe.
 *
 * Checkout sessions rather than charges, because the Google click id is put on
 * the session's metadata at checkout and never reaches the charge. Reading
 * charges is how you conclude no payment ever came from an ad.
 */
async function revenueByDay(site: AdSite, sinceUnix: number): Promise<Map<string, RevDay>> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  /* Only Smart Space sells online. SmartCare Living's ads produce enquiries
     that are invoiced elsewhere, so it has no takings to record and a zero
     here would read as "the ads earned nothing". */
  if (!key || site !== "smart-space") return new Map();

  const by = new Map<string, RevDay>();
  let after: string | null = null;
  for (let page = 0; page < 40; page++) {
    const qs = new URLSearchParams({ limit: "100", "created[gte]": String(sinceUnix) });
    if (after) qs.set("starting_after", after);
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions?${qs}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as {
      data?: { id: string; created: number; amount_total?: number; payment_status?: string;
               metadata?: Record<string, string> }[];
      has_more?: boolean;
      error?: { message?: string };
    };
    if (body.error) throw new Error(`Stripe: ${body.error.message ?? "unknown error"}`);

    const data = body.data ?? [];
    for (const s of data) {
      if (s.payment_status !== "paid") continue;
      const date = new Date(s.created * 1000).toISOString().slice(0, 10);
      const cur = by.get(date) ?? { gross: 0, orders: 0, attributed: 0 };
      const amount = (s.amount_total ?? 0) / 100;
      cur.gross += amount;
      cur.orders += 1;
      const gclid = s.metadata?.gclid || s.metadata?.gclid_stored || s.metadata?.click_id;
      if (gclid) cur.attributed += amount;
      by.set(date, cur);
    }
    if (!body.has_more || data.length === 0) break;
    after = data[data.length - 1]!.id;
  }
  return by;
}

/**
 * Pull both feeds and store them, one row per day per business.
 *
 * Every day is rewritten on every run rather than only the new ones, because
 * restatement is the whole reason this exists: a day recorded on Tuesday is
 * often wrong by Thursday, and a store that never revisits it preserves the
 * wrong figure forever.
 */
export async function runSnapshot(days = 30): Promise<SnapshotSiteResult[]> {
  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);
  const out: SnapshotSiteResult[] = [];

  for (const site of SITES) {
    try {
      const ads = await adsByDay(site, iso(from), iso(now));
      const rev = await revenueByDay(site, Math.floor(from.getTime() / 1000));
      const capturedAt = new Date().toISOString();

      const adRows = Array.from(ads.entries()).map(([on_date, v]) => ({
        site, on_date,
        cost_cents: Math.round(v.cost * 100),
        clicks: Math.round(v.clicks),
        impressions: Math.round(v.impressions),
        conversions: Number(v.conversions.toFixed(2)),
        conv_value_cents: Math.round(v.value * 100),
        captured_at: capturedAt,
      }));

      const revRows = Array.from(rev.entries()).map(([on_date, v]) => ({
        site, on_date,
        gross_cents: Math.round(v.gross * 100),
        orders: v.orders,
        attributed_cents: Math.round(v.attributed * 100),
        captured_at: capturedAt,
      }));

      if (adRows.length) {
        await crm("crm_ads_daily?on_conflict=site,on_date", {
          method: "POST", body: JSON.stringify(adRows),
          prefer: "resolution=merge-duplicates,return=minimal",
        });
      }
      if (revRows.length) {
        await crm("crm_revenue_daily?on_conflict=site,on_date", {
          method: "POST", body: JSON.stringify(revRows),
          prefer: "resolution=merge-duplicates,return=minimal",
        });
      }
      await crm("crm_ads_snapshot_runs", {
        method: "POST",
        body: JSON.stringify([{ site, days_written: adRows.length, ok: true }]),
        prefer: "return=minimal",
      });
      out.push({ site, ok: true, adDays: adRows.length, revenueDays: revRows.length });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      /* Record the failure too. A run that writes nothing and says nothing is
         indistinguishable from a quiet week, which is the exact confusion this
         file exists to remove. */
      try {
        await crm("crm_ads_snapshot_runs", {
          method: "POST",
          body: JSON.stringify([{ site, days_written: 0, ok: false, detail: detail.slice(0, 500) }]),
          prefer: "return=minimal",
        });
      } catch { /* the store is what just failed; do not fail twice over it */ }
      out.push({ site, ok: false, adDays: 0, revenueDays: 0, detail });
    }
  }
  return out;
}
