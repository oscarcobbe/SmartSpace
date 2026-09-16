/**
 * What the bank says, as opposed to what Stripe says.
 *
 * Finance is built on Stripe balance transactions, which is every card payment
 * and nothing else. Transfers in, cash out, subscriptions paid by standing
 * order and the bank's own fees are all invisible there. These are the
 * statement lines somebody imported, kept separate rather than mixed in,
 * because adding them to the Stripe figures would double count every card
 * payment on the day it settles into the bank.
 */
import { crm, crmConfigured, type Site } from "./db";

export interface BankRow {
  id: string;
  happened_on: string;
  description: string;
  counterparty: string | null;
  amount_cents: number;
  fee_cents: number;
  balance_cents: number | null;
  kind: string | null;
}

export interface BankSummary {
  rows: BankRow[];
  inCents: number;
  outCents: number;
  netCents: number;
  feesCents: number;
  latestBalanceCents: number | null;
  latestOn: string | null;
  count: number;
}

/** Null when nothing has ever been imported, which the page renders as an offer. */
export async function fetchBank(site: Site, months = 12): Promise<BankSummary | null> {
  if (!crmConfigured()) return null;

  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - months);
  const from = since.toISOString().slice(0, 10);

  const rows = await crm<BankRow[]>(
    `crm_bank_lines?site=eq.${site}&happened_on=gte.${from}` +
      `&select=id,happened_on,description,counterparty,amount_cents,fee_cents,balance_cents,kind` +
      `&order=happened_on.desc&limit=2000`,
  ).catch(() => null);

  if (!rows || rows.length === 0) return null;

  let inCents = 0, outCents = 0, feesCents = 0;
  for (const r of rows) {
    if (r.amount_cents >= 0) inCents += r.amount_cents;
    else outCents += -r.amount_cents;
    feesCents += r.fee_cents ?? 0;
  }

  /* The newest line that carried a balance, not the newest line. A statement
     can end on a row the export left the balance off, and reporting null there
     would read as "no bank balance" rather than "not on that line". */
  const withBalance = rows.find((r) => r.balance_cents != null);

  return {
    rows,
    inCents,
    outCents,
    feesCents,
    netCents: inCents - outCents,
    latestBalanceCents: withBalance?.balance_cents ?? null,
    latestOn: rows[0]?.happened_on ?? null,
    count: rows.length,
  };
}
