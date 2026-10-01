/**
 * The arithmetic behind the return chart, apart from the reads behind it.
 *
 * roas-live.ts reads Stripe and the enquiry log; this decides how each payment
 * came and adds the payments up by month. Pure, with no server-only import, so
 * scripts/check-how-they-came.mjs can run it on payments made up for the
 * purpose. See roas-live.ts for what the solid and grey bars mean.
 *
 * ── GOOGLE'S FIGURES AND CHATGPT'S ───────────────────────────────
 *
 * back, estimated and share are Google's, set against Google's spend. A
 * payment from a customer a ChatGPT ad reached is "chatgpt-ad"
 * (how-they-came.ts) and counts towards none of them: for Google it is a
 * customer known to have come some other way, which is what it was before
 * ChatGPT ads had a name. It is added up on its own, as chatgptBack, for
 * ChatGPT's spend to be set against.
 */
import { dublinStamp, readTrail, type Came, type Visit } from "./how-they-came";

export interface RoasMonth {
  /** yyyy-mm */
  key: string;
  /** "May 2026" */
  label: string;
  /** Google Ads spend. */
  spend: number;
  /** Money from customers a Google ad is known to have reached. Drawn solid. */
  back: number;
  /** The part of `back` traced through the customer's enquiry rather than the payment. */
  backViaEnquiry: number;
  /** Estimated from Google ads, of the money whose customer cannot be traced. Drawn grey. */
  estimated: number;
  /** Every euro Stripe took that month, subscription renewals excluded. */
  taken: number;
  /** Money from customers whose visits show they came some other way, and not through any ad. */
  notFromAds: number;
  /** Money from customers a ChatGPT ad is known to have reached. Never part of back. */
  chatgptBack: number;
  /** Payments in chatgptBack. */
  chatgptSales: number;
  /** Money whose customer cannot be traced either way. The grey is a share of this. */
  unseen: number;
  /** Of the customers who could be traced, the share that came through a Google
      ad, over this month and the two before it. What the grey is worked out at. */
  share: number;
  sales: number;
  tiedSales: number;
  /** The month is still running, so its figures are not yet a month's. */
  partial: boolean;
}

export interface Payment {
  month: string;
  amount: number;
  /** Who, for counting customers rather than payments when working out the share. */
  person: string;
  came: Came;
  /** How an ad verdict was reached: on the payment, or on the customer's enquiry. */
  via: "click" | "enquiry" | null;
}

/** The parts of a Stripe checkout session that say how its buyer came. */
export interface SessionTrail {
  created: number;
  client_reference_id?: string | null;
  payment_link?: string | null;
  metadata?: Record<string, string>;
}

/**
 * How one payment came: from its own checkout session first, then from the
 * customer's enquiries (already found for this payer).
 *
 * A Google click on the session wins, then a ChatGPT one, the order readTrail
 * keeps. oai_oppref is on the session only under an Accept that named OpenAI
 * (/api/checkout).
 */
export function cameOf(s: SessionTrail | undefined, enquiries: Visit[]): { came: Came; via: Payment["via"] } {
  const m = s?.metadata ?? {};
  if (s && ((m.gclid ?? "").trim() || (s.client_reference_id ?? "").trim())) return { came: "ad", via: "click" };
  if (s && (m.oai_oppref ?? "").trim()) return { came: "chatgpt-ad", via: "click" };

  /* The website checkout records its own visit; a payment link does not. */
  const visits: Visit[] = [];
  if (s && !s.payment_link) {
    visits.push({
      at: dublinStamp(s.created), gclid: m.gclid, landingPage: m.landing_page, referrer: m.referrer,
      utmSource: m.utm_source, utmMedium: m.utm_medium,
    });
  }
  visits.push(...enquiries);
  const came = readTrail(visits);
  return { came, via: came === "ad" || came === "chatgpt-ad" ? "enquiry" : null };
}

/**
 * The payments and Google's spend, month by month: the last `max` months with
 * either spend or money in them.
 */
export function roasMonths(
  list: Payment[],
  spendByMonth: Map<string, number>,
  thisMonth: string,
  labelOf: (key: string) => string,
  max = 12,
): RoasMonth[] {
  const byMonth = new Map<string, Payment[]>();
  for (const p of list) byMonth.set(p.month, [...(byMonth.get(p.month) ?? []), p]);

  const keySet = new Set<string>();
  spendByMonth.forEach((_, k) => keySet.add(k));
  byMonth.forEach((_, k) => keySet.add(k));
  const keys = Array.from(keySet).sort();
  const sum = (ps: Payment[]) => ps.reduce((t, p) => t + p.amount, 0);
  const kept = keys.filter((k) => (spendByMonth.get(k) ?? 0) > 0 || sum(byMonth.get(k) ?? []) > 0).slice(-max);

  /*
   * The rate the grey is drawn at: of the customers whose way in is known,
   * the share who came through a Google ad, over this month and the two before
   * it. A ChatGPT customer is known, and not Google's.
   *
   * Customers, not euros. The question for each untraced payment is how likely
   * it is that this one customer came from an ad, and one large job should not
   * swing that for everybody. Three months rather than one, because a job paid
   * by link in September was usually quoted in August from an enquiry in July.
   */
  const shareAt = (i: number) => {
    const known = new Map<string, boolean>();
    for (let j = Math.max(0, i - 2); j <= i; j++) {
      for (const p of byMonth.get(kept[j]!) ?? []) {
        if (p.came === "unknown") continue;
        known.set(p.person, (known.get(p.person) ?? false) || p.came === "ad");
      }
    }
    if (known.size === 0) return 0;
    let ads = 0;
    known.forEach((v) => { if (v) ads++; });
    return ads / known.size;
  };

  return kept.map((k, i) => {
    const ps = byMonth.get(k) ?? [];
    const ad = ps.filter((p) => p.came === "ad");
    const chatgpt = ps.filter((p) => p.came === "chatgpt-ad");
    const unseen = sum(ps.filter((p) => p.came === "unknown"));
    const share = shareAt(i);
    return {
      key: k, label: labelOf(k), spend: spendByMonth.get(k) ?? 0,
      back: sum(ad),
      backViaEnquiry: sum(ad.filter((p) => p.via === "enquiry")),
      estimated: Math.round(unseen * share),
      taken: sum(ps),
      notFromAds: sum(ps.filter((p) => p.came === "not-ad")),
      chatgptBack: sum(chatgpt),
      chatgptSales: chatgpt.length,
      unseen, share,
      sales: ps.length, tiedSales: ad.length,
      partial: k === thisMonth,
    };
  });
}
