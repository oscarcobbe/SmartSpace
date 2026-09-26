/**
 * What the ads cost and what came back, live, by month.
 *
 * ── WHAT THE TWO SHADES MEAN ─────────────────────────────────────
 *
 * Solid: money from a customer an ad is known to have reached before they
 * paid. Either the payment itself carried a Google click id, or the customer's
 * own enquiry did: they booked a consultation or sent the form after landing
 * on an ad URL, then paid later by link or invoice. Both are read, not guessed.
 *
 * Grey: an estimate, and only for money whose customer cannot be traced
 * either way. Each untraced payment is first matched to its customer in the
 * enquiry log (src/lib/crm/how-they-came.ts). A customer whose visits show
 * organic search, a referral or a business card counts as not from ads, and
 * adds nothing. Only a payment with no usable trail at all is estimated, at
 * the share of traceable customers who came through an ad over this month and
 * the two before it.
 *
 * ── TWO PREMISES THIS REPLACES, BOTH WRONG ───────────────────────
 *
 * "The click id capture died on 12 August." It did not. Every ad sale landed
 * on a gbraid URL and was captured, and from 17 August to 5 September every
 * website buyer with a record arrived through organic search or ChatGPT. The
 * capture did break later, from 6 to 21 September, when the consent gate lost
 * most records; those buyers read as unknown here, not as organic.
 *
 * "Google Ads is the only marketing this business does, so every euro is the
 * ad return." Also not true: organic search carried late August. Counting
 * every euro drew September at about 13x, the strict version drew 0.0x, and
 * the swing between them is why the owner saw different figures every time.
 *
 * ── WHAT IS LEFT OUT ─────────────────────────────────────────────
 *
 * Subscription renewals. They are real revenue and they are recurring billing
 * from customers won months ago, so no ad can claim one as a sale in the month
 * it is charged.
 *
 * ── ONE SOURCE FOR THE MONEY ─────────────────────────────────────
 *
 * Charges, every one that succeeded and was not refunded, the same list
 * Stripe's own dashboard adds up. Checkout sessions and the enquiry log are
 * read only to learn who paid and how they came.
 */
import { unstable_cache } from "next/cache";
import { fetchPeriods } from "./ads-periods";
import type { Site } from "./db";
import {
  EnquiryIndex, dublinStamp, fetchEnquiries, readTrail,
  type Came, type Payer, type Visit,
} from "./how-they-came";

export interface RoasMonth {
  /** yyyy-mm */
  key: string;
  /** "May 2026" */
  label: string;
  spend: number;
  /** Money from customers an ad is known to have reached. Drawn solid. */
  back: number;
  /** The part of `back` traced through the customer's enquiry rather than the payment. */
  backViaEnquiry: number;
  /** Estimated from ads, of the money whose customer cannot be traced. Drawn grey. */
  estimated: number;
  /** Every euro Stripe took that month, subscription renewals excluded. */
  taken: number;
  /** Money from customers whose visits show they came some other way. */
  notFromAds: number;
  /** Money whose customer cannot be traced either way. The grey is a share of this. */
  unseen: number;
  /** Of the customers who could be traced, the share that came through an ad,
      over this month and the two before it. What the grey is worked out at. */
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
  /** False when the enquiry log could not be read, so every payment without
      a click id fell to the estimate. Said on the chart when it happens. */
  trailRead: boolean;
}

export type RoasLiveResult = { ok: true; data: RoasLive } | { ok: false; reason: string };

export const ROAS_LIVE_TAG = "crm-roas-live";
const MONTHS = 12;

const label = (key: string) =>
  new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric", timeZone: "Europe/Dublin" })
    .format(new Date(`${key}-01T12:00:00Z`));

interface Payment {
  month: string;
  amount: number;
  /** Who, for counting customers rather than payments when working out the share. */
  person: string;
  came: Came;
  /** How an "ad" verdict was reached: on the payment, or on the customer's enquiry. */
  via: "click" | "enquiry" | null;
}

interface Session {
  id: string; created: number; payment_intent?: string | null; client_reference_id?: string | null;
  metadata?: Record<string, string>; payment_link?: string | null;
  customer_details?: { email?: string | null; phone?: string | null; name?: string | null } | null;
}

/**
 * Every charge since `sinceUnix`, each with a verdict on how its customer came.
 *
 * A charge knows nothing about click ids; they live on the checkout session
 * that produced it, and on the customer's earlier enquiries. So both are read
 * and joined to the charge. The money itself is counted once, from the charge.
 * Refunds and failures are left out.
 */
async function payments(sinceUnix: number): Promise<{ list: Payment[]; trailRead: boolean }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  /* Without the key there is no money to draw, and an empty list here drew
     every month as "nothing came back". Saying so is the honest answer. */
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment, so what came back cannot be read.");
  const headers = { Authorization: `Bearer ${key}` };

  const [enquiries, sessionList] = await Promise.all([
    fetchEnquiries(),
    (async () => {
      const out: Session[] = [];
      let after: string | null = null;
      for (let page = 0; page < 40; page++) {
        const qs = new URLSearchParams({ limit: "100", "created[gte]": String(sinceUnix) });
        if (after) qs.set("starting_after", after);
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions?${qs}`, {
          headers, cache: "no-store", signal: AbortSignal.timeout(20_000),
        });
        const body = (await res.json()) as { data?: Session[]; has_more?: boolean; error?: { message?: string } };
        if (body.error) throw new Error(`Stripe: ${body.error.message ?? "unknown error"}`);
        const data = body.data ?? [];
        out.push(...data);
        if (!body.has_more || data.length === 0) break;
        after = data[data.length - 1]!.id;
      }
      return out;
    })(),
  ]);
  const index = enquiries ? new EnquiryIndex(enquiries) : null;

  const sessionByIntent = new Map<string, Session>();
  for (const s of sessionList) if (s.payment_intent) sessionByIntent.set(s.payment_intent, s);

  const list: Payment[] = [];
  let after: string | null = null;
  for (let page = 0; page < 40; page++) {
    const qs = new URLSearchParams({ limit: "100", "created[gte]": String(sinceUnix), "expand[]": "data.customer" });
    if (after) qs.set("starting_after", after);
    const res = await fetch(`https://api.stripe.com/v1/charges?${qs}`, {
      headers, cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    type Who = { email?: string | null; phone?: string | null; name?: string | null };
    const body = (await res.json()) as {
      data?: { id: string; created: number; amount: number; status: string; refunded: boolean;
               payment_intent?: string | null; description?: string | null; receipt_email?: string | null;
               billing_details?: Who | null; customer?: (Who & { id: string }) | string | null }[];
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

      const s = c.payment_intent ? sessionByIntent.get(c.payment_intent) : undefined;
      const cust = c.customer && typeof c.customer === "object" ? c.customer : null;
      const who = [c.billing_details, cust, s?.customer_details].filter(Boolean) as Who[];
      const payer: Payer = {
        emails: [c.receipt_email, ...who.map((w) => w.email)].filter((x): x is string => Boolean(x)),
        phones: who.map((w) => w.phone).filter((x): x is string => Boolean(x)),
        names: who.map((w) => w.name).filter((x): x is string => Boolean(x)),
      };
      const person = (payer.emails[0] ?? payer.phones[0] ?? payer.names[0] ?? c.id).trim().toLowerCase();
      const month = new Date(c.created * 1000).toISOString().slice(0, 7);
      const amount = c.amount / 100;

      const clicked = Boolean(s && ((s.metadata?.gclid ?? "").trim() || (s.client_reference_id ?? "").trim()));
      if (clicked) {
        list.push({ month, amount, person, came: "ad", via: "click" });
        continue;
      }

      /* The website checkout records its own visit; a payment link does not. */
      const visits: Visit[] = [];
      if (s && !s.payment_link) {
        const m = s.metadata ?? {};
        visits.push({
          at: dublinStamp(s.created), gclid: m.gclid, landingPage: m.landing_page, referrer: m.referrer,
          utmSource: m.utm_source, utmMedium: m.utm_medium,
        });
      }
      /* Enquiries up to a day after the payment, because the log writes the
         order row for a payment a moment after Stripe records it. */
      if (index) visits.push(...index.find(payer, dublinStamp(c.created + 86_400)));
      const came = readTrail(visits);
      list.push({ month, amount, person, came, via: came === "ad" ? "enquiry" : null });
    }
    if (!body.has_more || data.length === 0) break;
    after = data[data.length - 1]!.id;
  }
  return { list, trailRead: index !== null };
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
  const { list, trailRead } = site === "smart-space"
    ? await payments(Math.floor(since.getTime() / 1000))
    : { list: [] as Payment[], trailRead: true };

  const byMonth = new Map<string, Payment[]>();
  for (const p of list) byMonth.set(p.month, [...(byMonth.get(p.month) ?? []), p]);

  const spendByMonth = new Map<string, number>();
  for (const m of periods.data.month) {
    if (m.key >= since.toISOString().slice(0, 7)) spendByMonth.set(m.key, m.cost);
  }

  const keySet = new Set<string>();
  spendByMonth.forEach((_, k) => keySet.add(k));
  byMonth.forEach((_, k) => keySet.add(k));
  const keys = Array.from(keySet).sort();
  const sum = (ps: Payment[]) => ps.reduce((t, p) => t + p.amount, 0);
  const kept = keys.filter((k) => (spendByMonth.get(k) ?? 0) > 0 || sum(byMonth.get(k) ?? []) > 0).slice(-MONTHS);

  /*
   * The rate the grey is drawn at: of the customers whose way in is known,
   * the share who came through an ad, over this month and the two before it.
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

  const months: RoasMonth[] = kept.map((k, i) => {
    const ps = byMonth.get(k) ?? [];
    const ad = ps.filter((p) => p.came === "ad");
    const unseen = sum(ps.filter((p) => p.came === "unknown"));
    const share = shareAt(i);
    return {
      key: k, label: label(k), spend: spendByMonth.get(k) ?? 0,
      back: sum(ad),
      backViaEnquiry: sum(ad.filter((p) => p.via === "enquiry")),
      estimated: Math.round(unseen * share),
      taken: sum(ps),
      notFromAds: sum(ps.filter((p) => p.came === "not-ad")),
      unseen, share,
      sales: ps.length, tiedSales: ad.length,
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
    trailRead,
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
