/**
 * Which ad groups and keywords bring enquiries and money, from our own record.
 *
 * ── WHY NOT GOOGLE'S PER-KEYWORD CONVERSIONS ─────────────────────
 *
 * Google credits a keyword only with what it saw, and it sees a website
 * enquiry only from a visitor who accepted cookies. On 1 October 2026
 * SmartCare Living's "Alerts family, not a call centre" ad group had brought
 * four of the seven enquiries from ads, on EUR 62, and Google's own figure for
 * it was none. Ranked on Google's number it was the ad group to cut.
 *
 * So each enquiry and each payment an ad reached is joined, by its click id,
 * to the keyword that click came from (ad-clicks.ts). Spend and clicks are
 * Google's, because only Google knows them. Calls from the ad's call button
 * are Google's too, because they never touch the website, and Google does
 * credit them to the keyword that showed the ad.
 *
 * An iPhone click carries no gclid, and Google will not say which keyword it
 * was. Those enquiries and payments are counted on their own line rather than
 * guessed onto a keyword.
 */
import { unstable_cache } from "next/cache";
import type { Site } from "./db";
import { fetchAdEnquiries } from "./ad-enquiries";
import { readAdClicks } from "./ad-clicks";
import { campaignSources, iso, num, search } from "./google-ads";
import { fetchRoasLive } from "./roas-live";

export interface WorkingRow {
  key: string;
  /** The keyword, or the ad group's name. */
  name: string;
  /** For a keyword: its ad group, and how it matches. */
  adGroup: string;
  matchType: string;
  campaign: string;
  cost: number;
  clicks: number;
  impressions: number;
  /** Google's own conversion count, for comparison only. */
  googleConversions: number;
  /** Calls from the ad's call button, as Google credits them. */
  calls: number;
  /** Website enquiries whose click came from here. */
  web: number;
  sales: number;
  back: number;
}

export interface Working {
  from: string;
  to: string;
  adGroups: WorkingRow[];
  keywords: WorkingRow[];
  /** Enquiries and payments from a Google ad whose keyword is not known. */
  unknown: { web: number; sales: number; back: number };
  /** Null when everything read; otherwise what could not be, in a sentence. */
  partial: string | null;
}

export type WorkingResult = { ok: true; data: Working } | { ok: false; reason: string };

export const WORKING_DAYS = 90;

const blank = (key: string, name: string, adGroup = "", matchType = "", campaign = ""): WorkingRow => ({
  key, name, adGroup, matchType, campaign,
  cost: 0, clicks: 0, impressions: 0, googleConversions: 0, calls: 0, web: 0, sales: 0, back: 0,
});

type Row = Record<string, Record<string, unknown>>;

async function read(site: Site): Promise<Working> {
  const now = new Date();
  const from = iso(new Date(now.getTime() - WORKING_DAYS * 86_400_000));
  const to = iso(now);
  const fromUnix = Date.parse(`${from}T00:00:00Z`) / 1000;

  const groups = new Map<string, WorkingRow>();
  const keywords = new Map<string, WorkingRow>();
  const kwKey = (ag: string, crit: string) => `${ag}~${crit}`;

  for (const src of campaignSources(site)) {
    const [agRows, kwRows, actionRows, agCalls, kwCalls] = await Promise.all([
      search(src.customerId,
        `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
                metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions
           FROM ad_group WHERE segments.date BETWEEN '${from}' AND '${to}'`),
      search(src.customerId,
        `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
                ad_group_criterion.criterion_id, ad_group_criterion.keyword.text,
                ad_group_criterion.keyword.match_type,
                metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions
           FROM keyword_view WHERE segments.date BETWEEN '${from}' AND '${to}'`),
      search(src.customerId, "SELECT conversion_action.id, conversion_action.type FROM conversion_action"),
      search(src.customerId,
        `SELECT campaign.id, campaign.name, ad_group.id, segments.conversion_action, metrics.all_conversions
           FROM ad_group WHERE segments.date BETWEEN '${from}' AND '${to}'`),
      search(src.customerId,
        `SELECT campaign.id, campaign.name, ad_group.id, ad_group_criterion.criterion_id,
                segments.conversion_action, metrics.all_conversions
           FROM keyword_view WHERE segments.date BETWEEN '${from}' AND '${to}'`),
    ]);
    const callActions = new Set(
      (actionRows as Row[]).filter((r) => r.conversionAction?.type === "AD_CALL").map((r) => String(r.conversionAction?.id)),
    );
    const mine = (r: Row) => src.keep(String(r.campaign?.id ?? ""), String(r.campaign?.name ?? ""));

    for (const r of agRows as Row[]) {
      if (!mine(r)) continue;
      const id = String(r.adGroup?.id ?? "");
      const g = groups.get(id) ?? blank(id, String(r.adGroup?.name ?? "Unnamed"), "", "", String(r.campaign?.name ?? ""));
      g.cost += num(r.metrics?.costMicros) / 1e6;
      g.clicks += num(r.metrics?.clicks);
      g.impressions += num(r.metrics?.impressions);
      g.googleConversions += num(r.metrics?.conversions);
      groups.set(id, g);
    }
    for (const r of kwRows as Row[]) {
      if (!mine(r)) continue;
      const crit = r.adGroupCriterion as { criterionId?: string; keyword?: { text?: string; matchType?: string } } | undefined;
      const key = kwKey(String(r.adGroup?.id ?? ""), String(crit?.criterionId ?? ""));
      const k = keywords.get(key) ?? blank(key, crit?.keyword?.text ?? "Unnamed", String(r.adGroup?.name ?? ""),
        crit?.keyword?.matchType ?? "", String(r.campaign?.name ?? ""));
      k.cost += num(r.metrics?.costMicros) / 1e6;
      k.clicks += num(r.metrics?.clicks);
      k.impressions += num(r.metrics?.impressions);
      k.googleConversions += num(r.metrics?.conversions);
      keywords.set(key, k);
    }
    const isCall = (r: Row) => callActions.has(String(r.segments?.conversionAction ?? "").split("/").pop() ?? "");
    for (const r of agCalls as Row[]) {
      if (!mine(r) || !isCall(r)) continue;
      const g = groups.get(String(r.adGroup?.id ?? ""));
      if (g) g.calls += num(r.metrics?.allConversions);
    }
    for (const r of kwCalls as Row[]) {
      if (!mine(r) || !isCall(r)) continue;
      const crit = r.adGroupCriterion as { criterionId?: string } | undefined;
      const k = keywords.get(kwKey(String(r.adGroup?.id ?? ""), String(crit?.criterionId ?? "")));
      if (k) k.calls += num(r.metrics?.allConversions);
    }
  }

  /* Our side: enquiries and payments a Google ad reached in the window. */
  const [enq, roas] = await Promise.all([fetchAdEnquiries(site), fetchRoasLive(site)]);
  const missing: string[] = [];
  const adEnquiries = enq.ok ? enq.data.enquiries.filter((e) => e.came === "ad" && e.day >= from && e.day <= to) : [];
  if (!enq.ok) missing.push(`the enquiries could not be read (${enq.reason})`);
  const adPayments = roas.ok ? roas.data.adPayments.filter((p) => p.came === "ad" && p.created >= fromUnix) : [];
  if (!roas.ok) missing.push(`the payments could not be read (${roas.reason})`);

  const clicks = await readAdClicks(site, [...adEnquiries, ...adPayments].map((x) => x.gclid ?? "").filter(Boolean));
  if (!clicks) missing.push("the store of clicks could not be read, so every enquiry is on the unknown line");

  const unknown = { web: 0, sales: 0, back: 0 };
  const place = (gclid: string | null, add: (r: WorkingRow) => void, other: () => void) => {
    const c = gclid ? clicks?.get(gclid) : undefined;
    if (!c) { other(); return; }
    const g = groups.get(c.ad_group_id) ?? blank(c.ad_group_id, c.ad_group_name, "", "", c.campaign_name);
    groups.set(c.ad_group_id, g);
    add(g);
    if (c.criterion_id) {
      const key = kwKey(c.ad_group_id, c.criterion_id);
      const k = keywords.get(key) ?? blank(key, c.keyword || "Unnamed", c.ad_group_name, c.match_type, c.campaign_name);
      keywords.set(key, k);
      add(k);
    }
  };
  for (const e of adEnquiries) place(e.gclid, (r) => { r.web++; }, () => { unknown.web++; });
  for (const p of adPayments) {
    place(p.gclid, (r) => { r.sales++; r.back += p.amount; }, () => { unknown.sales++; unknown.back += p.amount; });
  }

  return {
    from, to,
    adGroups: Array.from(groups.values()),
    keywords: Array.from(keywords.values()),
    unknown,
    partial: missing.length ? `Not everything could be read: ${missing.join("; ")}.` : null,
  };
}

export const WORKING_TAG = "crm-ads-working";

export async function fetchWorking(site: Site): Promise<WorkingResult> {
  try {
    const data = await unstable_cache(
      async () => read(site),
      ["crm-ads-working", "v1", site],
      { revalidate: 60, tags: [WORKING_TAG, `${WORKING_TAG}:${site}`] },
    )();
    return { ok: true, data };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: /abort|timeout/i.test(raw) ? "Google Ads took too long to answer. It is usually back on the next load." : raw };
  }
}
