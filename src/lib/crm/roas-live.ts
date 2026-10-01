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
 * ── GOOGLE'S, AND CHATGPT'S ──────────────────────────────────────
 *
 * Every figure on the chart is Google's: Google's spend, and money from
 * customers a Google ad reached. Money from customers a ChatGPT ad reached is
 * read too and kept apart, as chatgptBack, for the ChatGPT ads panel to set
 * against ChatGPT's own spend (openai-ads.ts). The arithmetic is in
 * roas-months.ts.
 *
 * ── ONE SOURCE FOR THE MONEY ─────────────────────────────────────
 *
 * Charges, every one that succeeded and was not refunded, the same list
 * Stripe's own dashboard adds up. Checkout sessions, invoices and the enquiry
 * log are read only to learn whose sale it was, who paid and how they came.
 *
 * ── WHOSE SALE ───────────────────────────────────────────────────
 *
 * Both businesses take payment through one Stripe account. This used to tell
 * them apart by the charge's description, which Stripe leaves empty on every
 * checkout and payment link, so EUR 2,746 of SmartCare Living's SmartGuardian
 * installs sat in Smart Space's bars (1 October 2026). Each charge is now
 * named by what was sold (payment-names.ts), the rule the portal's report and
 * offline upload use, and SmartCare Living's own money is measured on its own
 * page, traced through its own enquiry sheet.
 */
import { unstable_cache } from "next/cache";
import { fetchPeriods } from "./ads-periods";
import type { Site } from "./db";
import { EnquiryIndex, dublinStamp, gclidOf, readEnquiries, type Enquiry, type Payer } from "./how-they-came";
import { sclEnquiriesShared } from "./leads-scl";
import { businessOf, nameEach, type Naming, type NamingInvoice } from "./payment-names";
import { cameOf, roasMonths, type Payment, type RoasMonth } from "./roas-months";
import { paymentLinkRefs } from "./snapshot";

export type { RoasMonth } from "./roas-months";

/** A payment some ad is known to have reached, for the keyword table. */
export interface AdPayment {
  created: number;
  amount: number;
  came: "ad" | "chatgpt-ad";
  gclid: string | null;
}

export interface RoasLive {
  months: RoasMonth[];
  /** Google's spend, and Google's back and estimate, over the months shown. */
  spend: number;
  back: number;
  estimated: number;
  /** Money from customers a ChatGPT ad reached, over the same months. Not part of back. */
  chatgptBack: number;
  from: string;
  to: string;
  /** False when the enquiry log could not be read, so every payment without
      a click id fell to the estimate. Said on the chart when it happens. */
  trailRead: boolean;
  /** Payments an ad reached, with the click when it is known. */
  adPayments: AdPayment[];
  /** Charges no rule could name, so they are in neither business. */
  unnamed: { count: number; amount: number };
}

export type RoasLiveResult = { ok: true; data: RoasLive } | { ok: false; reason: string };

export const ROAS_LIVE_TAG = "crm-roas-live";
const MONTHS = 12;
const DAY = 86_400;

const label = (key: string) =>
  new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric", timeZone: "Europe/Dublin" })
    .format(new Date(`${key}-01T12:00:00Z`));

interface Session {
  id: string; created: number; payment_intent?: string | null; client_reference_id?: string | null;
  payment_status?: string; metadata?: Record<string, string>; payment_link?: string | null;
  customer_details?: { email?: string | null; phone?: string | null; name?: string | null } | null;
  line_items?: { data?: { description?: string | null }[] };
}

interface Invoice {
  id: string; created: number; amount_paid?: number; billing_reason?: string | null;
  status_transitions?: { paid_at?: number | null };
  lines?: { data?: { description?: string | null }[] };
  payments?: { data?: { payment?: { payment_intent?: string | null; charge?: string | null } }[] };
}

type Who = { email?: string | null; phone?: string | null; name?: string | null };
interface Charge {
  id: string; created: number; amount: number; status: string; refunded: boolean;
  payment_intent?: string | null; description?: string | null; receipt_email?: string | null;
  billing_details?: Who | null; customer?: (Who & { id: string }) | string | null;
}

/** Every page of a Stripe list, or a thrown error: a short list draws wrong bars quietly. */
async function all<T extends { id: string }>(key: string, path: string): Promise<T[]> {
  const out: T[] = [];
  let after: string | null = null;
  for (let page = 0; page < 40; page++) {
    const res = await fetch(`https://api.stripe.com/v1/${path}${after ? `&starting_after=${after}` : ""}`, {
      headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as { data?: T[]; has_more?: boolean; error?: { message?: string } };
    if (body.error) throw new Error(`Stripe: ${body.error.message ?? "unknown error"}`);
    const data = body.data ?? [];
    out.push(...data);
    if (!body.has_more || data.length === 0) return out;
    after = data[data.length - 1]!.id;
  }
  throw new Error("Stripe has more than forty pages for this window; refusing to draw from a partial list.");
}

/** The business's own record of who got in touch, and how they arrived. Null when unreadable. */
async function trailOf(site: Site): Promise<Enquiry[] | null> {
  if (site === "smartcareliving") {
    const r = await sclEnquiriesShared();
    return r.ok ? r.rows : null;
  }
  const r = await readEnquiries();
  return r.ok ? r.rows : null;
}

/**
 * Every charge since `sinceUnix` that is this business's sale, each with a
 * verdict on how its customer came.
 *
 * A charge knows nothing about click ids; they live on the checkout session
 * that produced it, and on the customer's earlier enquiries. So both are read
 * and joined to the charge. The money itself is counted once, from the charge.
 * Refunds, failures and subscription renewals are left out.
 */
async function payments(site: Site, sinceUnix: number) {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  /* Without the key there is no money to draw, and an empty list here drew
     every month as "nothing came back". Saying so is the honest answer. */
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment, so what came back cannot be read.");

  const [enquiries, sessions, invoices, charges, refs] = await Promise.all([
    trailOf(site),
    all<Session>(key, `checkout/sessions?limit=100&created[gte]=${sinceUnix - 2 * DAY}&expand[]=data.line_items`),
    all<Invoice>(key, `invoices?limit=100&status=paid&created[gte]=${sinceUnix - 35 * DAY}&expand[]=data.payments`),
    all<Charge>(key, `charges?limit=100&created[gte]=${sinceUnix}&expand[]=data.customer`),
    paymentLinkRefs(),
  ]);
  const index = enquiries ? new EnquiryIndex(enquiries) : null;

  const sessionByIntent = new Map<string, Session>();
  const naming: Naming = { byIntent: new Map(), invoices: [] };
  for (const s of sessions) {
    if (!s.payment_intent) continue;
    sessionByIntent.set(s.payment_intent, s);
    const text = (s.line_items?.data ?? []).map((l) => l.description).filter(Boolean).join(" / ");
    if (s.payment_status === "paid" && text) naming.byIntent.set(s.payment_intent, text);
  }
  naming.invoices = invoices
    .filter((i) => (i.amount_paid ?? 0) > 0)
    .map((i): NamingInvoice => ({
      id: i.id, cents: i.amount_paid ?? 0, at: i.status_transitions?.paid_at ?? i.created,
      text: (i.lines?.data ?? []).map((l) => l.description).filter(Boolean).join(" / "),
      reason: i.billing_reason ?? null,
      paidBy: i.payments
        ? new Set((i.payments.data ?? []).flatMap((p) => [p.payment?.payment_intent, p.payment?.charge]).filter((x): x is string => Boolean(x)))
        : null,
    }));

  const paid = charges.filter((c) => c.status === "succeeded" && !c.refunded && c.amount > 0);
  const names = nameEach(
    paid.map((c) => ({ id: c.id, intent: c.payment_intent ?? null, amount: c.amount, created: c.created, description: c.description ?? null })),
    naming,
  );

  const list: Payment[] = [];
  const unnamed = { count: 0, amount: 0 };
  for (const c of paid) {
    const n = names.get(c.id);
    const whose = businessOf(n?.name);
    if (!n || !whose) { unnamed.count++; unnamed.amount += c.amount / 100; continue; }
    if (whose !== site) continue;
    /* Recurring billing, not a sale an ad can claim this month. */
    if (n.renewal) continue;

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

    /* The payment's own click first, then the customer's enquiries up to a
       day after it, because the log writes the order row for a payment a
       moment after Stripe records it (roas-months.ts, cameOf). */
    const found = index ? index.find(payer, dublinStamp(c.created + DAY)) : [];
    const verdict = cameOf(s, found, site);
    const m = s?.metadata ?? {};
    const linkClick = s?.client_reference_id ? refs.get(s.client_reference_id) : undefined;
    const gclid = verdict.came === "ad"
      ? ((m.gclid ?? "").trim() || linkClick || gclidOf(found)) || null
      : null;
    list.push({ month, amount: c.amount / 100, person, ...verdict, gclid, created: c.created });
  }
  return { list, trailRead: index !== null, unnamed };
}

async function read(site: Site): Promise<RoasLive> {
  const periods = await fetchPeriods(site);
  if (!periods.ok) throw new Error(periods.reason);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - MONTHS, 1);
  since.setUTCHours(0, 0, 0, 0);

  const { list, trailRead, unnamed } = await payments(site, Math.floor(since.getTime() / 1000));

  const spendByMonth = new Map<string, number>();
  for (const m of periods.data.month) {
    if (m.key >= since.toISOString().slice(0, 7)) spendByMonth.set(m.key, m.cost);
  }

  const months = roasMonths(list, spendByMonth, thisMonth, label, MONTHS);

  return {
    months,
    spend: months.reduce((s, m) => s + m.spend, 0),
    back: months.reduce((s, m) => s + m.back, 0),
    estimated: months.reduce((s, m) => s + m.estimated, 0),
    chatgptBack: months.reduce((s, m) => s + m.chatgptBack, 0),
    from: months[0]?.label ?? "",
    to: months[months.length - 1]?.label ?? "",
    trailRead,
    adPayments: list
      .filter((p): p is Payment & { came: "ad" | "chatgpt-ad" } => p.came === "ad" || p.came === "chatgpt-ad")
      .map((p) => ({ created: p.created ?? 0, amount: p.amount, came: p.came, gclid: p.gclid ?? null })),
    unnamed,
  };
}

export async function fetchRoasLive(site: Site): Promise<RoasLiveResult> {
  try {
    const data = await unstable_cache(
      async () => read(site),
      /* v3: payments are named by what was sold, SmartCare Living is measured,
         and the ad payments travel with their clicks. A copy cached before it
         would draw the old split for a minute after the deploy. */
      ["crm-roas-live", "v3", site],
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
