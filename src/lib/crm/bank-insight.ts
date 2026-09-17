/**
 * What the bank statement actually says.
 *
 * The finance page showed money in, money out and the difference between
 * them. Three numbers, none of which answers a question anybody has. The
 * difference in particular is the most misleading figure on the page: an
 * account can show a healthy net movement while the trading underneath it
 * loses money every month, because money moved in from somewhere else counts
 * as money in.
 *
 * That is not hypothetical. On the statement this was written against, seven
 * months showed a net movement of about +2,000 euro, and underneath it
 * customer takings were roughly 6,800 euro short of the outgoings, with the
 * gap closed by transfers from a sister company. Both figures are true. Only
 * one of them tells you how the business is doing.
 *
 * So this separates money EARNED from money MOVED, sorts the spending into
 * things a person recognises, and says what it means.
 */
import type { BankRow } from "./bank";
import type { Finding } from "./findings";
import { changePct, say } from "./findings";

const eur = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(cents / 100);

/**
 * Spending categories, in the order they are tested.
 *
 * Order matters: the first pattern that matches wins, so the specific ones
 * come before the general. "Google Ads" has to be tested before anything that
 * would catch the word Google, or the advertising line disappears into
 * software.
 */
const CATEGORIES: { label: string; test: RegExp }[] = [
  { label: "Advertising", test: /google\s*\*?\s*ads|googleads|\bfacebook\b|\bmeta\b|linkedin|adwords/i },
  { label: "Owner drawings", test: /\bto\s+(nigel|oscar)\b|drawings|salary/i },
  { label: "Between our own accounts", test: /smartspace current|smart\s*space\s*techn|own transfer|savings vault/i },
  { label: "Stock and equipment", test: /amazon|ring europe|harvey norman|ikea|screwfix|toolstation|b\s*&\s*q|woodie|argos|altumview|paypal/i },
  { label: "Vehicle and insurance", test: /volkswagen|\bvw\b|circle k|applegreen|maxol|toll|\bfuel\b|insurance|\bnct\b|motor tax/i },
  { label: "Software and services", test: /anthropic|openai|fiverr|vercel|godaddy|canva|resend|adobe|microsoft|dropbox|zoom|stripe fee|xero|quickbooks/i },
  { label: "Phone and internet", test: /three|vodafone|eir\b|sky\b|virgin media/i },
  { label: "Food and sundries", test: /lidl|tesco|supervalu|centra|dunnes|\bspar\b|aldi|costa|starbucks/i },
  { label: "Bank charges", test: /\bfee\b|charge/i },
];

export function categorise(row: BankRow): string {
  const text = `${row.description ?? ""} ${row.counterparty ?? ""}`;
  for (const c of CATEGORIES) if (c.test.test(text)) return c.label;
  return "Everything else";
}

/** Money that came in because somebody bought something, not because it was moved. */
const EARNED = /stripe|card payment from|sumup|revolut pay|customer/i;
/** Money moved in from another account we control, or a supplier paying us back. */
const MOVED = /smart\s*space\s*techn|own transfer|from savings|transfer from/i;
const REFUND = /refund/i;

export interface BankBreakdown {
  earnedCents: number;
  movedInCents: number;
  refundCents: number;
  otherInCents: number;
  outCents: number;
  /** Earned minus everything that went out. The real trading position. */
  tradingCents: number;
  categories: { label: string; cents: number; share: number }[];
  months: { key: string; inCents: number; outCents: number; netCents: number; earnedCents: number }[];
  findings: Finding[];
}

export function bankBreakdown(rows: BankRow[]): BankBreakdown {
  let earned = 0, movedIn = 0, refunds = 0, otherIn = 0, out = 0;
  const byCat = new Map<string, number>();
  const byMonth = new Map<string, { inCents: number; outCents: number; netCents: number; earnedCents: number }>();

  for (const r of rows) {
    const a = r.amount_cents ?? 0;
    const text = `${r.description ?? ""} ${r.counterparty ?? ""}`;
    const key = (r.happened_on ?? "").slice(0, 7);
    const m = byMonth.get(key) ?? { inCents: 0, outCents: 0, netCents: 0, earnedCents: 0 };

    if (a > 0) {
      m.inCents += a;
      if (REFUND.test(text)) refunds += a;
      else if (MOVED.test(text)) movedIn += a;
      else if (EARNED.test(text)) { earned += a; m.earnedCents += a; }
      else otherIn += a;
    } else if (a < 0) {
      out += -a;
      m.outCents += -a;
      byCat.set(categorise(r), (byCat.get(categorise(r)) ?? 0) + -a);
    }
    m.netCents = m.inCents - m.outCents;
    if (key) byMonth.set(key, m);
  }

  const categories: { label: string; cents: number; share: number }[] = [];
  byCat.forEach((cents, label) => categories.push({ label, cents, share: out ? cents / out : 0 }));
  categories.sort((a, b) => b.cents - a.cents);

  const months: BankBreakdown["months"] = [];
  byMonth.forEach((v, key) => months.push({ key, ...v }));
  months.sort((a, b) => a.key.localeCompare(b.key));

  const trading = earned - out;
  const findings: Finding[] = [];

  if (movedIn > 0 && trading < 0) {
    findings.push({
      kind: "risk",
      title: "The account is not paying for itself yet",
      detail:
        `Customers paid in ${eur(earned)} and ${eur(out)} went out, so trading is ${eur(-trading)} short over this period. ` +
        `The gap is closed by ${eur(movedIn)} moved in from another account. Both figures are true, but only the first one ` +
        `says how the business is doing, and a positive balance hides it.`,
    });
  } else if (trading > 0) {
    findings.push({
      kind: "win",
      title: "Trading covers the outgoings",
      detail: `Customers paid in ${eur(earned)} against ${eur(out)} out, so the business is ${eur(trading)} ahead on its own takings before any money moved between accounts.`,
    });
  }

  const ads = categories.find((c) => c.label === "Advertising");
  if (ads && earned > 0) {
    const share = (ads.cents / earned) * 100;
    findings.push({
      kind: share > 25 ? "risk" : "note",
      title: `Advertising is ${share.toFixed(0)}% of what customers paid`,
      detail:
        `${eur(ads.cents)} on ads against ${eur(earned)} taken. ` +
        (share > 25
          ? "Above about a quarter, the advertising is buying work it barely pays for. Worth knowing what each job is worth before raising it."
          : "That is a normal share for a business still buying its growth."),
    });
  }

  /* The two most recent complete months, like for like. The current month is
     left out: it is a part month and would read as a collapse every time. */
  if (months.length >= 3) {
    const [prev, last] = months.slice(-3, -1);
    const pct = changePct(last.earnedCents, prev.earnedCents);
    if (pct !== null && Math.abs(pct) >= 10) {
      findings.push({
        kind: pct >= 0 ? "win" : "risk",
        title: `Customer takings ${say(pct)} in ${monthName(last.key)}`,
        detail: `${eur(last.earnedCents)} against ${eur(prev.earnedCents)} in ${monthName(prev.key)}. Both are whole months, so this is a real comparison.`,
      });
    }
  }

  const best = [...months].sort((a, b) => b.netCents - a.netCents)[0];
  const worst = [...months].sort((a, b) => a.netCents - b.netCents)[0];
  if (best && worst && best.key !== worst.key) {
    findings.push({
      kind: "note",
      title: `${monthName(best.key)} was the best month, ${monthName(worst.key)} the worst`,
      detail: `${monthName(best.key)} finished ${eur(best.netCents)} up. ${monthName(worst.key)} finished ${eur(worst.netCents)}. Worth knowing what was different.`,
    });
  }

  const biggest = categories[0];
  if (biggest && biggest.share > 0.3) {
    findings.push({
      kind: "note",
      title: `${biggest.label} is ${(biggest.share * 100).toFixed(0)}% of everything spent`,
      detail: `${eur(biggest.cents)} of ${eur(out)}. The single largest thing this account buys.`,
    });
  }

  return { earnedCents: earned, movedInCents: movedIn, refundCents: refunds, otherInCents: otherIn, outCents: out, tradingCents: trading, categories, months, findings };
}

export function monthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IE", { month: "long", year: "numeric", timeZone: "Europe/Dublin" });
}
