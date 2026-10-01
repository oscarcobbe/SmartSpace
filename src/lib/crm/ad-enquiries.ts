/**
 * Enquiries from ads, read live: the business's own record of every enquiry
 * (enquiry-count.ts says which rows count), and Google's record of the calls
 * placed straight from an ad, which never touch the website.
 *
 * Read on 1 October 2026 against the portal's weekly report for September:
 * Smart Space 4 web enquiries from ads and 4 calls, SmartCare Living 5 and
 * none, the same figures on both.
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Site } from "./db";
import { countEnquiries, type CountedEnquiry } from "./enquiry-count";
import { campaignSources, iso, num, search } from "./google-ads";
import { readEnquiries } from "./how-they-came";
import { sclEnquiriesShared } from "./leads-scl";

export interface AdEnquiries {
  /** Every enquiry counted, from an ad or not, oldest first. */
  enquiries: CountedEnquiry[];
  /** Google's calls from the ad's call button, by Dublin day. */
  callsByDay: Record<string, number>;
  from: string;
  to: string;
}

export type AdEnquiriesResult = { ok: true; data: AdEnquiries } | { ok: false; reason: string };

const DAYS = 400;

/** The AD_CALL conversion actions on an account, by id. */
async function callActions(customerId: string): Promise<Set<string>> {
  const rows = await search(customerId, "SELECT conversion_action.id, conversion_action.type FROM conversion_action");
  const ids = new Set<string>();
  for (const r of rows as Record<string, Record<string, unknown>>[]) {
    if (r.conversionAction?.type === "AD_CALL") ids.add(String(r.conversionAction.id));
  }
  return ids;
}

/**
 * Calls from the ad, by the day they were made, on this business's campaigns.
 * Every AD_CALL action counts whether or not the campaign bids on it, because
 * a call Google recorded is a call however the action is set up.
 */
export async function callsFromAds(site: Site, from: string, to: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const src of campaignSources(site)) {
    const [actions, rows] = await Promise.all([
      callActions(src.customerId),
      search(src.customerId,
        `SELECT segments.date, segments.conversion_action, campaign.id, campaign.name,
                metrics.all_conversions_by_conversion_date
           FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`),
    ]);
    for (const r of rows as Record<string, Record<string, unknown>>[]) {
      if (!src.keep(String(r.campaign?.id ?? ""), String(r.campaign?.name ?? ""))) continue;
      const action = String(r.segments?.conversionAction ?? "").split("/").pop() ?? "";
      if (!actions.has(action)) continue;
      const day = String(r.segments?.date ?? "");
      const n = num(r.metrics?.allConversionsByConversionDate);
      if (day && n) out[day] = (out[day] ?? 0) + n;
    }
  }
  return out;
}

async function read(site: Site): Promise<AdEnquiries> {
  const now = new Date();
  const from = iso(new Date(now.getTime() - DAYS * 86_400_000));
  const to = iso(now);

  const [rows, callsByDay] = await Promise.all([
    site === "smartcareliving" ? sclEnquiriesShared() : readEnquiries(),
    callsFromAds(site, from, to),
  ]);
  if (!rows.ok) throw new Error(rows.reason);

  return { enquiries: countEnquiries(rows.rows, site), callsByDay, from, to };
}

export const AD_ENQUIRIES_TAG = "crm-ad-enquiries";

/* One read per render as well as per minute: Marketing's panels and its
   keyword table ask at the same moment, and the minute's cache only holds an
   answer once the first read has finished. */
export const fetchAdEnquiries = cache(async (site: Site): Promise<AdEnquiriesResult> => {
  try {
    const data = await unstable_cache(
      async () => read(site),
      ["crm-ad-enquiries", "v1", site],
      { revalidate: 60, tags: [AD_ENQUIRIES_TAG, `${AD_ENQUIRIES_TAG}:${site}`] },
    )();
    return { ok: true, data };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: /abort|timeout/i.test(raw) ? "The enquiry record or Google took too long to answer. It is usually back on the next load." : raw };
  }
});

/** Enquiries from each channel in a bucket, keyed as the caller keys its buckets. */
export interface EnquiryBucket {
  /** Website enquiries from a Google ad. */
  googleWeb: number;
  /** Calls from the Google ad's call button. */
  calls: number;
  /** Website enquiries from a ChatGPT ad. */
  chatgpt: number;
  /** Every enquiry, from an ad or not. */
  all: number;
}

export function bucketEnquiries(data: AdEnquiries, keyOf: (day: string) => string): Map<string, EnquiryBucket> {
  const out = new Map<string, EnquiryBucket>();
  const get = (k: string) => {
    let b = out.get(k);
    if (!b) { b = { googleWeb: 0, calls: 0, chatgpt: 0, all: 0 }; out.set(k, b); }
    return b;
  };
  for (const e of data.enquiries) {
    const b = get(keyOf(e.day));
    b.all++;
    if (e.came === "ad") b.googleWeb++;
    else if (e.came === "chatgpt-ad") b.chatgpt++;
  }
  for (const [day, n] of Object.entries(data.callsByDay)) {
    const b = get(keyOf(day));
    b.calls += n;
    b.all += n;
  }
  return out;
}
