/**
 * Signing in, without a password existing at all.
 *
 * The brief asked for nigel@smart-space.ie with the password "n". This system
 * holds customer names, addresses, phone numbers, what they paid and when
 * somebody is coming to their house, and /crm is linked from a public homepage,
 * so the login page gets crawled and a one-character password falls to the
 * first automated attempt.
 *
 * A magic link removes the question. He types his address, we email a link, he
 * clicks it. Nothing to remember, nothing to leak, and closer to what the brief
 * wanted than a password was.
 *
 * Two tokens, deliberately different:
 *
 *   the LINK token is single use and lives fifteen minutes. It is stored as a
 *   SHA-256 hash, so the database never holds anything that would let a reader
 *   sign in, and it is marked used the moment it is exchanged.
 *
 *   the SESSION cookie lasts thirty days, is httpOnly and SameSite=Lax so it
 *   survives arriving from a link in an email, and carries its own signature so
 *   a tampered cookie fails before any query runs.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { crm, THIS_SITE, type Site } from "./db";

const SESSION_DAYS = 30;
const LINK_MINUTES = 15;
export const COOKIE = "crm_session";

const secret = () => {
  const s = process.env.CRM_SESSION_SECRET?.trim();
  if (!s) throw new Error("CRM_SESSION_SECRET is not set");
  return s;
};

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/**
 * Which company domain gets into which CRM.
 *
 * Anyone with a mailbox on the business's own domain can sign in, so a new
 * person in the office does not have to wait for somebody to add them to a
 * table. The mailbox is the credential: a link is emailed to it and only
 * whoever can open that mailbox can use the link.
 *
 * Set CRM_EMAIL_DOMAINS to override, comma separated. Deliberately does not
 * include fourwindsdigital.com: this is Nigel's customer data, and our access
 * is a named row in crm_users rather than a standing right for a whole domain.
 */
const DOMAIN_SITES: Record<string, Site> = {
  "smart-space.ie": "smart-space",
  "smartcareliving.ie": "smartcareliving",
};

function sitesForDomain(address: string): Site[] | null {
  const domain = address.split("@")[1];
  if (!domain) return null;

  const override = process.env.CRM_EMAIL_DOMAINS?.trim();
  if (override) {
    const allowed = override.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
    return allowed.includes(domain) ? [THIS_SITE] : null;
  }

  const site = DOMAIN_SITES[domain];
  /* Only ever this deployment's own site. An address on the other business's
     domain is not a way into this one, whatever the table says. */
  return site && site === THIS_SITE ? [site] : null;
}

/**
 * Is this address allowed in at all, and to which sites.
 *
 * A named row wins, because it can grant access to both businesses and can be
 * removed to revoke somebody. The domain rule is the fallback.
 */
export async function allowedSites(email: string): Promise<Site[] | null> {
  const address = email.trim().toLowerCase();

  const rows = await crm<{ sites: Site[] }[]>(
    `crm_users?email=eq.${encodeURIComponent(address)}&select=sites&limit=1`,
  );
  const named = rows?.[0]?.sites;
  if (named?.length) return named;

  return sitesForDomain(address);
}

export async function mintLinkToken(email: string, site: Site, ip: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await crm("crm_sessions", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      token_hash: sha256(token),
      email: email.trim().toLowerCase(),
      site,
      expires_at: new Date(Date.now() + LINK_MINUTES * 60_000).toISOString(),
      ip,
    }),
  });
  return token;
}

/** Exchange a link token once. Returns null for expired, unknown or reused. */
export async function redeemLinkToken(token: string): Promise<{ email: string; site: Site } | null> {
  const hash = sha256(token);
  const rows = await crm<{ email: string; site: Site; expires_at: string; used_at: string | null }[]>(
    `crm_sessions?token_hash=eq.${hash}&select=email,site,expires_at,used_at&limit=1`,
  );
  const row = rows?.[0];
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return null;
  await crm(`crm_sessions?token_hash=eq.${hash}`, {
    method: "PATCH", prefer: "return=minimal",
    body: JSON.stringify({ used_at: new Date().toISOString() }),
  });
  return { email: row.email, site: row.site };
}

export function makeSessionCookie(email: string, site: Site): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = Buffer.from(JSON.stringify({ email, site, expires })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return { value: `${payload}.${sig}`, maxAge: SESSION_DAYS * 86_400 };
}

export function readSessionCookie(value: string | undefined): { email: string; site: Site } | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { email, site, expires } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!email || !site || Date.now() > expires) return null;
    return { email, site };
  } catch { return null; }
}
