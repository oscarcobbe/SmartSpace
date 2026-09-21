/**
 * Orders, read from the dashboard that already exists.
 *
 * /api/admin/leads is 1,100 lines that reconcile Stripe charges, Calendly
 * events and the contact-form sheet into one list, including the dedupe that
 * stops a paid order and its install booking showing as two customers. None of
 * that is worth reimplementing here, and a second copy of it would drift from
 * the first within a month, so the CRM asks it the same question the admin page
 * asks and renders the answer differently.
 *
 * The call is server to server: ADMIN_KEY never reaches the browser, which is
 * the whole reason this is a server component and not a fetch from the page.
 */

import { unstable_cache } from "next/cache";
import { THIS_SITE, type Site } from "./db";

export interface QA {
  question: string;
  answer: string;
}

export interface Lead {
  date: string;
  type: "Paid Order" | "Installation" | "Consultation" | "Contact Enquiry" | "Upcoming";
  name: string;
  email: string;
  phone: string;
  address: string;
  product: string;
  amount: string;
  bookingDate: string;
  bookingSlot: string;
  status: string;
  upcoming?: boolean;
  orderId: string;
  details?: QA[];
}

export interface LeadsPayload {
  leads: Lead[];
  count: number;
  generated: string;
  stripeUpcomingPayout?: string;
  sourceErrors?: { source: string; message: string }[];
}

function baseUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://smart-space.ie";
}

export type LeadsResult =
  | { ok: true; data: LeadsPayload }
  | { ok: false; reason: string };

/**
 * The two businesses keep their orders in different places, and every page
 * above this asks the same question, so the choice is made once here.
 *
 * Smart Space has /api/admin/leads, which reconciles Stripe, Calendly and a
 * sheet. SmartCare Living has a Google Sheet its own site writes to and reads
 * back through api/dashboard-data. Neither page nor component needs to know.
 */
/**
 * One minute of cache in front of the orders feed.
 *
 * Overview, The diary, Orders and Customers each call this, and every one of
 * them is force-dynamic, so opening any of them went out to the sheet,
 * Calendly and Stripe again from scratch. Measured on production: six to eight
 * seconds a page on Smart Space and fifteen on SmartCare Living, for figures
 * that change a few times a day. A CRM that slow is one he stops opening.
 *
 * Sixty seconds is short enough that nothing on screen is meaningfully stale
 * and long enough that moving between the four pages is instant. The Refresh
 * button in the header clears this by tag, so "read it again" still means
 * now, not up to a minute ago.
 */
export const LEADS_TAG = "crm-leads";

/*
 * A failure is never cached.
 *
 * ── WHAT THIS COST ───────────────────────────────────────────────
 *
 * The fetchers return { ok: false, reason } rather than throwing, which is a
 * perfectly ordinary value, so unstable_cache stored it and served it for the
 * next sixty seconds. One slow read on a cold function poisoned the whole
 * minute after it, and the reader got "the orders feed could not be read"
 * back in about a second: far too fast to be a timeout, which is the tell.
 *
 * It also made the thing look unfixed. The orders feed was repaired twice and
 * the page kept showing the same error, because a single cold failure stuck
 * around long enough to be the next thing anybody saw.
 *
 * So the cache is given something to throw on. Nothing is stored, and the
 * very next request tries again instead of being told the stale bad news.
 */
export async function fetchLeads(site: Site = THIS_SITE): Promise<LeadsResult> {
  try {
    return await unstable_cache(
      async () => {
        const r = site === "smartcareliving"
          ? await (await import("./leads-scl")).fetchSclLeads()
          : await fetchSmartSpaceLeads();
        if (!r.ok) throw new Error(r.reason);
        return r;
      },
      ["crm-leads", site],
      { revalidate: 60, tags: [LEADS_TAG, `${LEADS_TAG}:${site}`] },
    )();
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "The orders feed could not be read." };
  }
}

async function fetchSmartSpaceLeads(): Promise<LeadsResult> {
  const key = process.env.ADMIN_KEY?.trim();
  if (!key) return { ok: false, reason: "ADMIN_KEY is not set on this deployment." };

  try {
    const res = await fetch(`${baseUrl()}/api/admin/leads`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      /* The upstream talks to Stripe, Calendly and Sheets in turn. Thirty
         seconds is generous for that and still short enough that a hung
         dependency shows the reader an error instead of a spinner. */
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ok: false, reason: `The orders feed answered ${res.status}.` };
    return { ok: true, data: (await res.json()) as LeadsPayload };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "The orders feed could not be reached." };
  }
}

/** "€139.00" and "139" both become 139. Returns 0 for "-" and for junk. */
export function euros(amount: string | undefined | null): number {
  const n = parseFloat(String(amount ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const moneyExact = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
