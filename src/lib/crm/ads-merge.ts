/**
 * Google's period buckets with ChatGPT's spend added and our own enquiries in
 * place of Google's conversion count.
 *
 * The trend chart, the period table and yesterday's report all read
 * Bucket.conversions as "enquiries". It was Google's count, consent-limited
 * and mixed with payments and calls (enquiry-count.ts), so the line on the
 * chart and the enquiries in the table above it were two different numbers
 * under one word. Here every bucket's enquiries are ours, from every ad
 * channel, and spend is every channel's, so cost per enquiry divides like by
 * like. Value and return stay Google's own, and are labelled as Google's
 * wherever they are shown.
 *
 * Pure, so a check can run it.
 */
import type { Bucket } from "./period-buckets";
import type { EnquiryBucket } from "./ad-enquiries";

const pct = (now: number, then: number) => (then > 0 ? ((now - then) / then) * 100 : null);

export function withOurEnquiries(
  google: Bucket[],
  chatgpt: Map<string, Bucket> | null,
  ours: Map<string, EnquiryBucket>,
): Bucket[] {
  const out: Bucket[] = [];
  for (const b of google) {
    const c = chatgpt?.get(b.key);
    const e = ours.get(b.key);
    const conversions = e ? e.googleWeb + e.calls + e.chatgpt : 0;
    const cost = b.cost + (c?.cost ?? 0);
    const prev = out[out.length - 1];
    out.push({
      ...b,
      cost,
      clicks: b.clicks + (c?.clicks ?? 0),
      impressions: b.impressions + (c?.impressions ?? 0),
      conversions,
      cpa: conversions > 0 ? cost / conversions : null,
      roas: b.cost > 0 ? b.value / b.cost : null,
      deltaCost: prev ? pct(cost, prev.cost) : null,
      deltaConversions: prev ? pct(conversions, prev.conversions) : null,
    });
  }
  return out;
}
