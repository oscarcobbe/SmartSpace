/**
 * Is every source the CRM reads answering, for each business.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * In September two feeds were reported as working and were not. The copy of
 * each SmartCare Living enquiry to the CRM had never run, because its
 * environment variables were unset, and Google Ads recorded nothing. Both
 * looked fine from every page that was checked, because a page that renders
 * is not a source that answered.
 *
 * So this asks each source the smallest real question it can answer, live,
 * uncached, and says for each one whether it answered, how long it took, and
 * why not. It never returns a customer's name, email or phone: a count at
 * most, which is what tells "answered" apart from "answered with nothing".
 */
import { crm, crmConfigured, unlessWrongKey, WRONG_KEY, type Site } from "./db";
import { readLeadsLive } from "./leads";
import { search, ADS_ACCOUNT } from "./google-ads";
import { probeGa4 } from "./ga4";
import { readEnquiries } from "./how-they-came";

export interface SourceHealth {
  site: Site;
  name: string;
  ok: boolean;
  ms: number;
  error: string | null;
  /** How many rows came back, where that means something. Never the rows. */
  count?: number;
}

const SITES: Site[] = ["smart-space", "smartcareliving"];

async function timed(
  site: Site,
  name: string,
  run: () => Promise<{ count?: number } | void>,
): Promise<SourceHealth> {
  const t0 = Date.now();
  try {
    const r = await run();
    return { site, name, ok: true, ms: Date.now() - t0, error: null, ...(r && r.count !== undefined ? { count: r.count } : {}) };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { site, name, ok: false, ms: Date.now() - t0, error: raw.slice(0, 300) };
  }
}

/** Every table a CRM page reads or writes, asked for one row each. */
const TABLES = ["crm_contacts", "crm_leads", "crm_activity", "crm_tasks", "crm_order_marks", "crm_bank_lines"];

async function database(site: Site) {
  if (!crmConfigured()) throw new Error("SMARTCRM_URL, SMARTCRM_ANON_KEY or SMARTCRM_KEY is not set on this deployment.");
  /* A wrong X-CRM-Key is not refused: every table answers 200 with an empty
     list. So "the tables answered" proves nothing about the key. The nightly
     record gains a row for each business every night and is never
     legitimately empty, so an empty read of it is the refused key. */
  const runs = await crm<unknown[]>(`crm_ads_snapshot_runs?site=eq.${site}&select=id&limit=1`);
  if (!Array.isArray(runs) || runs.length === 0) throw new Error(WRONG_KEY);
  const answers = await Promise.all(
    TABLES.map(async (t) => {
      try {
        const rows = await crm<unknown[]>(`${t}?site=eq.${site}&select=site&limit=1`);
        if (!Array.isArray(rows)) throw new Error("no answer");
        return null;
      } catch (err) {
        return `${t}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }),
  );
  const failed = answers.filter(Boolean);
  if (failed.length) throw new Error(failed.join("; "));
  const contacts = await crm<unknown[]>(`crm_contacts?site=eq.${site}&select=id&limit=1000`);
  return { count: contacts?.length ?? 0 };
}

/**
 * The nightly copy of Google Ads and Stripe that the charts read from.
 * It records its own failures, so the latest run says whether it worked.
 */
async function nightly(site: Site) {
  const [last] = await unlessWrongKey(await crm<{ ran_at: string; ok: boolean; detail: string | null; days_written: number }[]>(
    `crm_ads_snapshot_runs?site=eq.${site}&select=ran_at,ok,detail,days_written&order=ran_at.desc&limit=1`,
  ));
  if (!last) throw new Error("The nightly record has never run for this business.");
  const hours = (Date.now() - Date.parse(last.ran_at)) / 3_600_000;
  if (!last.ok) throw new Error(`The last nightly run, ${Math.round(hours)} hours ago, failed: ${last.detail ?? "no reason recorded"}`);
  if (hours > 30) throw new Error(`The nightly record last ran ${Math.round(hours)} hours ago; it runs every night at 03:10 UTC.`);
  return { count: last.days_written };
}

async function orders(site: Site) {
  const r = await readLeadsLive(site);
  if (!r.ok) throw new Error(r.reason);
  /* A feed that answered but lost one of its own sources is not healthy: the
     list is incomplete and nothing on the page would look wrong. */
  const partial = r.data.sourceErrors ?? [];
  if (partial.length) throw new Error(`Answered, but without ${partial.map((e) => `${e.source} (${e.message})`).join("; ")}`);
  if (r.data.leads.length === 0) throw new Error("Answered with no rows at all, which this feed has never legitimately done.");
  return { count: r.data.leads.length };
}

async function stripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment.");
  const res = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`Stripe answered ${res.status}${res.status === 401 ? ", refusing STRIPE_SECRET_KEY" : ""}: ${body?.error?.message ?? "no reason given"}`);
  }
}

async function googleAds(site: Site) {
  const rows = await search(ADS_ACCOUNT[site], "SELECT customer.id FROM customer LIMIT 1");
  if (!rows.length) throw new Error(`Google Ads answered, but not for account ${ADS_ACCOUNT[site]}.`);
}

async function ga4(site: Site) {
  const sessions = await probeGa4(site);
  return { count: sessions };
}

async function enquiryLog() {
  const r = await readEnquiries();
  if (!r.ok) throw new Error(r.reason);
  return { count: r.rows.length };
}

export async function checkSources(): Promise<{ ok: boolean; checkedAt: string; sources: SourceHealth[] }> {
  const jobs: Promise<SourceHealth>[] = [];
  for (const site of SITES) {
    jobs.push(timed(site, "CRM database", () => database(site)));
    jobs.push(timed(site, site === "smart-space" ? "Orders feed" : "Enquiry sheet", () => orders(site)));
    jobs.push(timed(site, "Stripe", stripe));
    jobs.push(timed(site, "Google Ads", () => googleAds(site)));
    jobs.push(timed(site, "GA4", () => ga4(site)));
    jobs.push(timed(site, "Nightly ads record", () => nightly(site)));
  }
  /* The Smart Space enquiry log is what the return chart traces payments
     through. SmartCare Living's equivalent is its enquiry sheet, above. */
  jobs.push(timed("smart-space", "Enquiry log", enquiryLog));

  const sources = await Promise.all(jobs);
  return { ok: sources.every((s) => s.ok), checkedAt: new Date().toISOString(), sources };
}
