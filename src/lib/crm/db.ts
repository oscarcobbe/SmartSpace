/**
 * The CRM database, reached over PostgREST with the service key.
 *
 * A separate Supabase project from the FourWinds portal, on purpose. This
 * deployment needs a key that can write leads, and the portal's key would hand
 * this site full read access to FourWinds' own outreach prospects, client
 * contracts and email log. It is also Nigel's data: if it ever moves, it moves
 * as one project rather than as an extraction.
 *
 * Every table has RLS on and no policies at all, so the anon key reads nothing
 * and this key is the only way in. Verified rather than assumed: crm_users
 * holds two rows and the anon key returns an empty array for it.
 */

const URL_ = process.env.SMARTCRM_URL?.trim();
const KEY = process.env.SMARTCRM_SERVICE_KEY?.trim();

export type Site = "smart-space" | "smartcareliving";

/**
 * Which of the two businesses this deployment is. The CRM is built into each
 * site separately rather than hosted centrally, so a deployment only ever
 * shows its own data and a misconfigured value can only ever under-show, not
 * leak the other business's rows into this one.
 */
export const THIS_SITE: Site =
  process.env.CRM_SITE === "smartcareliving" ? "smartcareliving" : "smart-space";

export const crmConfigured = () => Boolean(URL_ && KEY);

/**
 * Returns null rather than throwing when the CRM is not configured, so a lead
 * capture never fails because the CRM is not set up yet. A lost lead is worse
 * than a lost CRM row.
 */
export async function crm<T = unknown>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T | null> {
  if (!URL_ || !KEY) return null;
  const headers: Record<string, string> = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
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
