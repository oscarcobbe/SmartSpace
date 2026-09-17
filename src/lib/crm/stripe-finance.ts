/**
 * Finance, read from Stripe's balance transactions rather than from charges.
 *
 * A charge tells you what the customer was billed. A balance transaction tells
 * you what actually landed, what Stripe took, and what went back out as a
 * refund, which is the number that has to agree with the bank. Reporting gross
 * charges as "revenue" overstates every month by the card fee, and a refunded
 * order stays in the total for ever.
 *
 * Twelve months, paged in hundreds, oldest bucket first.
 */

const API = "https://api.stripe.com/v1";

export interface MonthRow {
  key: string;        // 2026-09
  label: string;      // Sep 26
  gross: number;      // money in, before fees
  fees: number;       // what Stripe took
  refunds: number;    // money returned, positive
  net: number;        // gross - fees - refunds
  payments: number;   // count of successful payments
  /*
   * The same month counted only as far into it as today is into this one.
   *
   * The overview compared this month against the whole of last month, so on
   * the 17th it set seventeen days against thirty-one and reported "down 45%"
   * every single month until the last day of it. The comparison has to be
   * like for like or it is not a comparison, and a figure that is wrong in a
   * predictable direction is worse than no figure.
   *
   * Measured by elapsed time from each month's own start rather than by day
   * number, so it lands on the same hour of the same day and February being
   * short cannot quietly widen the window.
   */
  netToDate: number;
  paymentsToDate: number;
  /** True when this is a whole month, so to-date and final are the same. */
  completeToDate: boolean;
}

export interface FinanceData {
  months: MonthRow[];
  gross: number;
  fees: number;
  refunds: number;
  net: number;
  payments: number;
  averageOrder: number;
  available: number;
  pending: number;
  lastPayout: { amount: number; arrival: string; status: string } | null;
}

export type FinanceResult = { ok: true; data: FinanceData } | { ok: false; reason: string };

interface BalanceTransaction {
  id: string;
  created: number;
  currency: string;
  amount: number;
  fee?: number;
  type: string;
}

interface StripeList<T> {
  data: T[];
  has_more: boolean;
}

interface BalanceBucket {
  amount: number;
  currency: string;
}

async function stripe<T>(path: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment.");
  const res = await fetch(`${API}/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${String(y).slice(2)}`;
};

export async function fetchFinance(monthsBack = 12): Promise<FinanceResult> {
  try {
    /* Start of the month monthsBack-1 ago, so the earliest bucket is a whole
       month and the chart does not open on a stub that reads as a collapse. */
    const now = new Date();
    const from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1) / 1000;

    const buckets = new Map<string, MonthRow>();
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1 - i), 1));
      const key = monthKey(d);
      buckets.set(key, {
        key, label: monthLabel(key), gross: 0, fees: 0, refunds: 0, net: 0, payments: 0,
        netToDate: 0, paymentsToDate: 0, completeToDate: false,
      });
    }

    /* How far into the current month we are. A transaction counts toward its
       own month's to-date figure when it sits within the same span measured
       from that month's first instant. */
    const startOfThisMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const elapsed = now.getTime() - startOfThisMonth;
    const toDate = new Map<string, { gross: number; fees: number; refunds: number; payments: number }>();
    buckets.forEach((_, key) => toDate.set(key, { gross: 0, fees: 0, refunds: 0, payments: 0 }));

    let after: string | null = null;
    let guard = 0;
    do {
      const qs = `balance_transactions?limit=100&created[gte]=${Math.floor(from)}${after ? `&starting_after=${after}` : ""}`;
      const page: StripeList<BalanceTransaction> = await stripe(qs);
      for (const t of page.data) {
        const at = new Date(t.created * 1000);
        const b = buckets.get(monthKey(at));
        if (!b) continue;
        if (t.currency !== "eur") continue;
        const amount = t.amount / 100;
        const fee = (t.fee ?? 0) / 100;
        const monthStart = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1);
        const d = at.getTime() - monthStart < elapsed ? toDate.get(b.key) : undefined;
        if (t.type === "charge" || t.type === "payment") {
          b.gross += amount;
          b.fees += fee;
          b.payments += 1;
          if (d) { d.gross += amount; d.fees += fee; d.payments += 1; }
        } else if (t.type === "refund" || t.type === "payment_refund") {
          /* Stripe reports a refund as a negative amount. Carry it as a
             positive "refunds" figure and subtract it once, rather than
             letting a sign flip quietly cancel part of the month's gross. */
          b.refunds += Math.abs(amount);
          b.fees += fee;
          if (d) { d.refunds += Math.abs(amount); d.fees += fee; }
        } else if (t.type === "adjustment" || t.type === "stripe_fee") {
          b.fees += Math.abs(amount) + fee;
          if (d) d.fees += Math.abs(amount) + fee;
        }
      }
      after = page.has_more && page.data.length ? page.data[page.data.length - 1].id : null;
    } while (after && ++guard < 40);

    const months = Array.from(buckets.values());
    for (const m of months) {
      m.net = m.gross - m.fees - m.refunds;
      const d = toDate.get(m.key) ?? { gross: 0, fees: 0, refunds: 0, payments: 0 };
      m.netToDate = d.gross - d.fees - d.refunds;
      m.paymentsToDate = d.payments;
      /* A month whose whole length is already inside the elapsed window has
         nothing left to count, so its to-date figure IS its final one, and
         saying "the same 17 days" about it would be a lie. */
      const days = new Date(Date.UTC(Number(m.key.slice(0, 4)), Number(m.key.slice(5, 7)), 0)).getUTCDate();
      m.completeToDate = days * 86_400_000 <= elapsed;
    }

    const sum = (f: (m: MonthRow) => number) => months.reduce((s, m) => s + f(m), 0);
    const payments = sum((m) => m.payments);

    let available = 0, pending = 0;
    let lastPayout: FinanceData["lastPayout"] = null;
    try {
      const bal = await stripe<{ available?: BalanceBucket[]; pending?: BalanceBucket[] }>("balance");
      const eur = (arr: BalanceBucket[] | undefined) =>
        (arr ?? []).filter((x) => x.currency === "eur").reduce((s, x) => s + x.amount / 100, 0);
      available = eur(bal.available);
      pending = eur(bal.pending);
      const payouts = await stripe<StripeList<{ amount: number; arrival_date: number; status: string }>>("payouts?limit=1");
      const p = payouts.data?.[0];
      if (p) {
        lastPayout = {
          amount: p.amount / 100,
          arrival: new Date(p.arrival_date * 1000).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric" }),
          status: p.status,
        };
      }
    } catch {
      /* Balance and payouts are extra detail. The months are the page, and
         losing the bank-side figures must not blank the chart. */
    }

    return {
      ok: true,
      data: {
        months,
        gross: sum((m) => m.gross),
        fees: sum((m) => m.fees),
        refunds: sum((m) => m.refunds),
        net: sum((m) => m.net),
        payments,
        averageOrder: payments ? sum((m) => m.gross) / payments : 0,
        available,
        pending,
        lastPayout,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Stripe could not be reached." };
  }
}
