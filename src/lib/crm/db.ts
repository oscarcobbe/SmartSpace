/**
 * The CRM database, reached over PostgREST with the service key.
 *
 * A separate Supabase project from the FourWinds portal, on purpose. This
 * deployment needs a key that can write leads, and the portal's key would hand
 * this site full read access to FourWinds' own outreach prospects, client
 * contracts and email log. It is also Nigel's data: if it ever moves, it moves
 * as one project rather than as an extraction.
 *
 * Two credentials, and both are needed. The publishable key identifies the
 * project and opens nothing by itself; every policy on every CRM table also
 * requires the shared secret, sent as X-CRM-Key and compared inside the
 * database against a row in a schema PostgREST does not serve.
 *
 * This replaced the service role key, which is only obtainable by hand from the
 * Supabase dashboard. It is also stricter: the service key bypasses RLS on
 * every table in the database including any added later, where this grants
 * exactly the ten CRM tables and is revoked with one UPDATE.
 *
 * Verified rather than assumed, against the live project: the publishable key
 * alone returns [] for crm_users while the database holds two rows, a wrong
 * secret returns [], a write without the header is refused with 401, and both
 * work with the secret present.
 */

const URL_ = process.env.SMARTCRM_URL?.trim();
/* The publishable key, which opens nothing on its own: every policy on every
   CRM table requires the shared secret below as well. */
const ANON = process.env.SMARTCRM_ANON_KEY?.trim();
/* The shared secret, sent as X-CRM-Key. PostgREST publishes request headers to
   SQL, so the policies read it and compare it against a row in a schema
   PostgREST does not serve. */
const KEY = process.env.SMARTCRM_KEY?.trim();

export type Site = "smart-space" | "smartcareliving";

/**
 * Which business a fresh sign in starts on.
 *
 * This used to be the whole answer: the CRM was to be deployed once per site,
 * and the argument for it was that a deployment could only ever under-show
 * rather than leak. Sound, and it left SmartCare Living with no CRM at all,
 * because smartcareliving.ie is static HTML with a few functions and there is
 * nowhere on it to put a Next.js app. Its leads reader, its ads account and
 * its GA4 property all existed and were reachable from nothing.
 *
 * So one deployment now serves both and the session carries which, changed
 * through /api/crm/site. This value is only the starting point. The safety
 * argument survives in a different form: both businesses are the same person's,
 * there is one password, and the switch needs a valid session already.
 */
export const THIS_SITE: Site =
  process.env.CRM_SITE === "smartcareliving" ? "smartcareliving" : "smart-space";

export const crmConfigured = () => Boolean(URL_ && ANON && KEY);

/**
 * Returns null rather than throwing when the CRM is not configured, so a lead
 * capture never fails because the CRM is not set up yet. A lost lead is worse
 * than a lost CRM row.
 */
export async function crm<T = unknown>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T | null> {
  if (!URL_ || !ANON || !KEY) return null;
  const headers: Record<string, string> = {
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
    "X-CRM-Key": KEY,
    "Content-Type": "application/json",
    ...(init.prefer ? { Prefer: init.prefer } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`CRM ${init.method ?? "GET"} ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

/**
 * Find a person, or make one.
 *
 * Matched on email OR phone, whichever arrived, because a phone enquiry has no
 * email and a form submission often has no phone. Insisting on both is how a
 * CRM ends up with three rows for one customer.
 */
export async function upsertContact(site: Site, c: {
  email?: string | null; phone?: string | null; name?: string | null;
  first_name?: string | null; last_name?: string | null;
  address_line1?: string | null; address_line2?: string | null;
  city?: string | null; county?: string | null; eircode?: string | null;
}): Promise<string | null> {
  const email = c.email?.trim().toLowerCase() || null;
  const phone = c.phone?.replace(/[^\d+]/g, "") || null;
  if (!email && !phone) return null;

  const filter = email
    ? `email=eq.${encodeURIComponent(email)}`
    : `phone=eq.${encodeURIComponent(phone!)}`;
  const found = await crm<{ id: string }[]>(`crm_contacts?site=eq.${site}&${filter}&select=id&limit=1`);
  if (found?.length) {
    /* Fill gaps on an existing person without overwriting what is already
       there: a later enquiry that omits the address must not erase it. */
    const patch = Object.fromEntries(
      Object.entries({ ...c, email, phone }).filter(([, v]) => v != null && v !== ""),
    );
    await crm(`crm_contacts?id=eq.${found[0].id}`, {
      method: "PATCH", body: JSON.stringify(patch), prefer: "return=minimal",
    });
    return found[0].id;
  }
  const made = await crm<{ id: string }[]>("crm_contacts", {
    method: "POST",
    body: JSON.stringify({ ...c, site, email, phone }),
    prefer: "return=representation",
  });
  return made?.[0]?.id ?? null;
}

export async function logActivity(site: Site, a: {
  lead_id?: string | null; contact_id?: string | null;
  kind: string; summary: string; detail?: Record<string, unknown>; actor?: string;
}) {
  try {
    await crm("crm_activity", {
      method: "POST",
      body: JSON.stringify({ site, detail: {}, ...a }),
      prefer: "return=minimal",
    });
  } catch {
    /* The trail is worth having and never worth failing a request for. */
  }
}
