/**
 * Every Google ad click and the keyword behind it, kept in crm_ad_clicks.
 *
 * Google answers "which keyword was this click" from click_view, one day per
 * query and only for the last ninety days. An enquiry's click id is what ties
 * it to a keyword, and an enquiry is often looked at months after the click,
 * so the nightly snapshot writes each day's clicks down while Google still
 * has them (supabase/migrations/0003_ad_clicks.sql).
 *
 * Both accounts are read and each click is filed under the business whose
 * campaign it was, by the same rule as every other figure (isForeign).
 */
import { ADS_ACCOUNT, isForeign, iso, search, type AdSite } from "./google-ads";
import { crm, type Site } from "./db";

export interface AdClick {
  gclid: string;
  site: Site;
  click_date: string;
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  criterion_id: string;
  keyword: string;
  match_type: string;
  device: string;
}

const ACCOUNTS: AdSite[] = ["smart-space", "smartcareliving"];

/** One day's clicks on one account, each filed under its business. */
async function clicksOn(account: AdSite, day: string): Promise<AdClick[]> {
  const rows = await search(
    ADS_ACCOUNT[account],
    `SELECT click_view.gclid, click_view.keyword, click_view.keyword_info.text,
            click_view.keyword_info.match_type, segments.date, segments.device,
            campaign.id, campaign.name, ad_group.id, ad_group.name
       FROM click_view WHERE segments.date = '${day}'`,
  );
  const other: Site = account === "smart-space" ? "smartcareliving" : "smart-space";
  const out: AdClick[] = [];
  for (const row of rows as Record<string, Record<string, unknown>>[]) {
    const cv = (row.clickView ?? {}) as { gclid?: string; keyword?: string; keywordInfo?: { text?: string; matchType?: string } };
    if (!cv.gclid) continue;
    const campaignId = String(row.campaign?.id ?? "");
    const campaignName = String(row.campaign?.name ?? "");
    out.push({
      gclid: cv.gclid,
      site: isForeign(account, campaignId, campaignName) ? other : account,
      click_date: String(row.segments?.date ?? day),
      campaign_id: campaignId,
      campaign_name: campaignName,
      ad_group_id: String(row.adGroup?.id ?? ""),
      ad_group_name: String(row.adGroup?.name ?? ""),
      /* "customers/1/adGroupCriteria/{ad group}~{criterion}" */
      criterion_id: String(cv.keyword ?? "").split("~")[1] ?? "",
      keyword: cv.keywordInfo?.text ?? "",
      match_type: cv.keywordInfo?.matchType ?? "",
      device: String(row.segments?.device ?? ""),
    });
  }
  return out;
}

export interface ClickCapture { ok: boolean; days: number; clicks: number; failedDays: string[] }

/**
 * The last `days` complete days of clicks, written over whatever is there,
 * starting `skip` days further back. Three nightly, because Google can add a
 * late click to a recent day; the rest of Google's ninety days is filled by
 * asking for older stretches with skip. A day Google will not answer is named
 * rather than skipped in silence.
 */
export async function captureAdClicks(days = 3, skip = 0): Promise<ClickCapture> {
  const failedDays: string[] = [];
  let clicks = 0;
  const now = Date.now();
  for (let back = skip + 1; back <= skip + days; back++) {
    const day = iso(new Date(now - back * 86_400_000));
    for (const account of ACCOUNTS) {
      try {
        const rows = await clicksOn(account, day);
        if (rows.length) {
          await crm("crm_ad_clicks?on_conflict=gclid", {
            method: "POST", body: JSON.stringify(rows),
            prefer: "resolution=merge-duplicates,return=minimal",
          });
        }
        clicks += rows.length;
      } catch (err) {
        failedDays.push(`${account} ${day}: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`);
      }
    }
  }
  return { ok: failedDays.length === 0, days, clicks, failedDays };
}

/**
 * The stored clicks for these click ids, by gclid. Null when the store cannot
 * be read, so a reader can say so rather than file everything as unknown.
 *
 * Asked for by id, thirty at a time, rather than by date: the store answers at
 * most a thousand rows a request, and a date range of clicks passes that
 * within months, after which the read would quietly come back short.
 */
export async function readAdClicks(site: Site, gclids: string[]): Promise<Map<string, AdClick> | null> {
  const ids = Array.from(new Set(gclids.filter((g) => /^[A-Za-z0-9_-]{8,200}$/.test(g))));
  const out = new Map<string, AdClick>();
  try {
    for (let i = 0; i < ids.length; i += 30) {
      const chunk = ids.slice(i, i + 30).map((g) => `"${g}"`).join(",");
      const rows = await crm<AdClick[]>(`crm_ad_clicks?site=eq.${site}&gclid=in.(${encodeURIComponent(chunk)})&select=*`);
      if (!rows) return null;
      for (const r of rows) out.set(r.gclid, r);
    }
    return out;
  } catch {
    return null;
  }
}
