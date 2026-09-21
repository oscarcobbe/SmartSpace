#!/usr/bin/env node
/**
 * Write down what Google and Stripe said today, for both businesses.
 *
 * The CRM used to read Google Ads live on every page load. Google restates
 * figures as late attributions land, so the same month read twice gave two
 * different answers and the chart appeared to change shape on its own. That is
 * most of why Nigel stopped believing the graphs.
 *
 * This stores what we were told, each day, and the charts read from the store.
 *
 *   node scripts/snapshot-ads.mjs             last 30 days, both businesses
 *   node scripts/snapshot-ads.mjs --days 400  a backfill
 *   node scripts/snapshot-ads.mjs --dry       print, write nothing
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env.production.local"]) {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const DAYS = Number(arg("days", 30));
const DRY = process.argv.includes("--dry");
/* Emit SQL instead of writing. For a first backfill from a machine that has
   the Google and Stripe credentials but not the CRM service key, and for
   anybody who wants to see exactly what would land before it does. */
const SQL = process.argv.includes("--sql");

const ACCOUNTS = { "smart-space": "9994041488", smartcareliving: "9060218843" };

/* SmartCare Living's first campaign ran on the Smart Space account before it
   had its own, and its spend is still on that account's history. Reported as
   Smart Space it makes that account look worse for work it never won. */
const FOREIGN = {
  "smart-space": /smartcareliving|smartcare living/i,
  smartcareliving: /installer|ring |smart space/i,
};

const iso = (d) => d.toISOString().slice(0, 10);
const num = (v) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);

async function adsToken() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Google token refresh failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

async function adsDaily(token, site, from, to) {
  const r = await fetch(`https://googleads.googleapis.com/v25/customers/${ACCOUNTS[site]}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `SELECT segments.date, campaign.name,
                     metrics.cost_micros, metrics.clicks, metrics.impressions,
                     metrics.conversions, metrics.conversions_value
              FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`,
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`Google Ads: ${j.error.message}`);

  const by = new Map();
  for (const row of j.results ?? []) {
    if (FOREIGN[site].test(String(row.campaign?.name ?? ""))) continue;
    const d = row.segments?.date;
    if (!d) continue;
    const cur = by.get(d) ?? { cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0 };
    cur.cost += num(row.metrics?.costMicros) / 1e6;
    cur.clicks += num(row.metrics?.clicks);
    cur.impressions += num(row.metrics?.impressions);
    cur.conversions += num(row.metrics?.conversions);
    cur.value += num(row.metrics?.conversionsValue);
    by.set(d, cur);
  }
  return by;
}

/** Real money taken, by day, from Stripe. Only Smart Space sells this way today. */
async function revenueDaily(site, sinceUnix) {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_READ_KEY;
  if (!key || site !== "smart-space") return new Map();

  const by = new Map();
  let url = `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${sinceUnix}`;
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    const j = await r.json();
    if (j.error) throw new Error(`Stripe: ${j.error.message}`);
    for (const s of j.data ?? []) {
      if (s.payment_status !== "paid") continue;
      const d = new Date(s.created * 1000).toISOString().slice(0, 10);
      const cur = by.get(d) ?? { gross: 0, orders: 0, attributed: 0 };
      cur.gross += (s.amount_total ?? 0) / 100;
      cur.orders += 1;
      /* The click id lives on the checkout session, never on the charge. A
         payment carrying one is money an ad can fairly claim. */
      const g = s.metadata?.gclid || s.metadata?.gclid_stored || s.metadata?.click_id;
      if (g) cur.attributed += (s.amount_total ?? 0) / 100;
      by.set(d, cur);
    }
    url = j.has_more ? `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${sinceUnix}&starting_after=${j.data[j.data.length - 1].id}` : null;
  }
  return by;
}

async function crm(path, init = {}) {
  const base = (process.env.SMARTCRM_URL || "").replace(/\/$/, "");
  const key = process.env.SMARTCRM_KEY;
  if (!base || !key) throw new Error("SMARTCRM_URL and SMARTCRM_KEY must be set");
  const r = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
               Prefer: "resolution=merge-duplicates", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`CRM ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}

const to = new Date();
const from = new Date(Date.now() - DAYS * 86_400_000);
const token = await adsToken();
let failures = 0;

for (const site of Object.keys(ACCOUNTS)) {
  try {
    const ads = await adsDaily(token, site, iso(from), iso(to));
    const rev = await revenueDaily(site, Math.floor(from.getTime() / 1000));

    const adRows = Array.from(ads.entries()).map(([on_date, v]) => ({
      site, on_date,
      cost_cents: Math.round(v.cost * 100),
      clicks: Math.round(v.clicks),
      impressions: Math.round(v.impressions),
      conversions: Number(v.conversions.toFixed(2)),
      conv_value_cents: Math.round(v.value * 100),
      captured_at: new Date().toISOString(),
    }));

    const revRows = Array.from(rev.entries()).map(([on_date, v]) => ({
      site, on_date,
      gross_cents: Math.round(v.gross * 100),
      orders: v.orders,
      attributed_cents: Math.round(v.attributed * 100),
      captured_at: new Date().toISOString(),
    }));

    if (SQL) {
      const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
      if (adRows.length) {
        console.log(`insert into crm_ads_daily (site,on_date,cost_cents,clicks,impressions,conversions,conv_value_cents) values`);
        console.log(adRows.map((r) => `(${q(r.site)},${q(r.on_date)},${r.cost_cents},${r.clicks},${r.impressions},${r.conversions},${r.conv_value_cents})`).join(",\n"));
        console.log(`on conflict (site,on_date) do update set cost_cents=excluded.cost_cents, clicks=excluded.clicks, impressions=excluded.impressions, conversions=excluded.conversions, conv_value_cents=excluded.conv_value_cents, captured_at=now();`);
      }
      if (revRows.length) {
        console.log(`insert into crm_revenue_daily (site,on_date,gross_cents,orders,attributed_cents) values`);
        console.log(revRows.map((r) => `(${q(r.site)},${q(r.on_date)},${r.gross_cents},${r.orders},${r.attributed_cents ?? "null"})`).join(",\n"));
        console.log(`on conflict (site,on_date) do update set gross_cents=excluded.gross_cents, orders=excluded.orders, attributed_cents=excluded.attributed_cents, captured_at=now();`);
      }
      continue;
    }

    console.log(`${site}: ${adRows.length} ad days, ${revRows.length} revenue days`);
    if (DRY) {
      for (const r of adRows.slice(-3)) console.log(`   ${r.on_date}  spend €${(r.cost_cents/100).toFixed(2)}  conv ${r.conversions}  value €${(r.conv_value_cents/100).toFixed(2)}`);
      for (const r of revRows.slice(-3)) console.log(`   ${r.on_date}  taken €${(r.gross_cents/100).toFixed(2)} over ${r.orders}, of which €${((r.attributed_cents??0)/100).toFixed(2)} carried a click id`);
      continue;
    }

    if (adRows.length) await crm("crm_ads_daily?on_conflict=site,on_date", { method: "POST", body: JSON.stringify(adRows) });
    if (revRows.length) await crm("crm_revenue_daily?on_conflict=site,on_date", { method: "POST", body: JSON.stringify(revRows) });
    await crm("crm_ads_snapshot_runs", { method: "POST", body: JSON.stringify([{ site, days_written: adRows.length, ok: true }]) });
  } catch (err) {
    failures++;
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`${site}: FAILED, ${detail}`);
    /* Record the failure too. A run that writes nothing and says nothing looks
       identical to a quiet week, which is the failure mode this whole file is
       meant to remove. */
    if (!DRY) try { await crm("crm_ads_snapshot_runs", { method: "POST", body: JSON.stringify([{ site, days_written: 0, ok: false, detail: detail.slice(0, 500) }]) }); } catch {}
  }
}

process.exit(failures ? 1 : 0);
