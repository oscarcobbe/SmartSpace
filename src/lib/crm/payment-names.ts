/**
 * Which business a Stripe payment belongs to, and whether it is a renewal.
 *
 * Smart Space and SmartCare Living take payment through one Stripe account.
 * The return chart told them apart by the charge's description, which Stripe
 * leaves empty on every checkout and payment link, so SmartCare Living's
 * SmartGuardian installs were counted as Smart Space money: EUR 1,947 in July
 * 2026, EUR 700 in August and EUR 99 in May, read on 1 October 2026. Finance
 * already read the checkout's line items and had them right; Marketing did
 * not look.
 *
 * The same rule as the FourWinds portal's src/lib/stripe-payment-names.mjs,
 * which names payments for the weekly report and the offline upload, so the
 * three cannot disagree about whose a payment is. A payment is named by what
 * was sold, in this order:
 *
 *   1. its checkout session's line items (the site's checkout, a payment link);
 *   2. the lines of the invoice it paid, joined through the invoice's payments;
 *   3. only when Stripe returned no payments list, an invoice of the same
 *      amount paid within three days;
 *   4. its own description, unless it is one of Stripe's generic phrases.
 *
 * A payment none of these names belongs to neither business. Money in the
 * wrong client's column is worse than money in no column.
 *
 * Pure, with no server-only import, so scripts/check-payment-names.mjs can run
 * it on made-up payments.
 */

/** Every SmartCare Living line names SmartGuardian or SmartCare. */
export const SCL_PATTERN = /smartguardian|smartcare/i;

/** Stripe's own words, written for any subscription or invoice of either business. */
const STRIPE_GENERIC = /^\s*(subscription (creation|update|cycle)|payment for invoice)\s*$/i;

/**
 * Billing reasons that continue a subscription rather than sell one. The
 * first payment ("subscription_create") is the sale; the monthly renewal and a
 * plan change's proration are the same customer again. Oscar, 1 October 2026:
 * first payment only, for the ads.
 */
export const RENEWAL_REASONS = new Set(["subscription_cycle", "subscription_update"]);

export type Business = "smart-space" | "smartcareliving";

export function businessOf(name: string | null | undefined): Business | null {
  const n = String(name ?? "").trim();
  if (!n) return null;
  return SCL_PATTERN.test(n) ? "smartcareliving" : "smart-space";
}

const DAY = 86_400;

export interface NamingInvoice {
  id: string;
  cents: number;
  /** When it was paid, unix seconds. */
  at: number;
  text: string;
  reason: string | null;
  /** Payment intents and charges that settled it; null when Stripe listed none. */
  paidBy: Set<string> | null;
}

export interface Naming {
  /** payment_intent to what its checkout session sold. */
  byIntent: Map<string, string>;
  invoices: NamingInvoice[];
}

export interface PaymentToName {
  id: string;
  intent: string | null;
  /** Cents. */
  amount: number;
  created: number;
  description: string | null;
}

export interface Named {
  name: string;
  via: "session" | "invoice" | "invoice-amount" | "description" | "unnamed";
  renewal: boolean;
}

export function nameEach(payments: PaymentToName[], { byIntent, invoices }: Naming): Map<string, Named> {
  const exact = new Map<string, NamingInvoice>();
  for (const inv of invoices) for (const ref of Array.from(inv.paidBy ?? [])) exact.set(ref, inv);
  const guessable = invoices.filter((i) => i.paidBy === null).map((i) => ({ ...i, used: false }));

  const out = new Map<string, Named>();
  /* Oldest first, so an amount match does not depend on the caller's order. */
  const sorted = [...payments].sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
  for (const p of sorted) {
    const fromSession = p.intent ? byIntent.get(p.intent) : undefined;
    if (fromSession) { out.set(p.id, { name: fromSession, via: "session", renewal: false }); continue; }

    const inv = (p.intent ? exact.get(p.intent) : undefined) ?? exact.get(p.id);
    if (inv?.text) {
      out.set(p.id, { name: inv.text, via: "invoice", renewal: RENEWAL_REASONS.has(inv.reason ?? "") });
      continue;
    }

    /* The closest in time, not the first listed: two subscriptions of one
       price renew on neighbouring days on this account. */
    let best: (typeof guessable)[number] | null = null;
    for (const i of guessable) {
      if (i.used || i.cents !== p.amount || !i.text) continue;
      const gap = Math.abs(i.at - p.created);
      if (gap <= 3 * DAY && (!best || gap < Math.abs(best.at - p.created))) best = i;
    }
    if (best) {
      best.used = true;
      out.set(p.id, { name: best.text, via: "invoice-amount", renewal: RENEWAL_REASONS.has(best.reason ?? "") });
      continue;
    }

    const own = String(p.description ?? "").trim();
    if (own && !STRIPE_GENERIC.test(own)) { out.set(p.id, { name: own, via: "description", renewal: false }); continue; }

    out.set(p.id, { name: "", via: "unnamed", renewal: false });
  }
  return out;
}
