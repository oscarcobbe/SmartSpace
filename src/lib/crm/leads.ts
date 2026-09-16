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

export async function fetchLeads(): Promise<LeadsResult> {
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
