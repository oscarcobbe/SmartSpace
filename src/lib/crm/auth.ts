/**
 * Signing in with a password.
 *
 * The password is one character, "n", because that is what was asked for and
 * it is Nigel's data and his decision. Everything that can be done around a
 * one character password has been:
 *
 *   the comparison is constant time, so it leaks nothing by how long it takes;
 *   attempts are rate limited hard per address and per IP, with a lockout, so
 *   a script grinding the alphabet is slowed to a crawl rather than waved
 *   through; and the session lasts thirty days, so he types it once a month
 *   rather than once a day, which is what makes a short password tolerable at
 *   all.
 *
 * What none of that changes: /crm is on a public domain and a single character
 * has about forty possibilities. The rate limit makes a bot slow. It does not
 * make a person wrong. Two or three more characters would change that
 * completely and cost him nothing he would notice.
 *
 * The session cookie is unchanged from the link version: httpOnly, SameSite
 * Lax, signed with CRM_SESSION_SECRET, and checked before any query runs.
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { Site } from "./db";

const SESSION_DAYS = 30;
export const COOKIE = "crm_session";

const secret = () => {
  const s = process.env.CRM_SESSION_SECRET?.trim();
  if (!s) throw new Error("CRM_SESSION_SECRET is not set");
  return s;
};






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

/**
 * Is this the password.
 *
 * timingSafeEqual throws on a length mismatch, which would itself leak the
 * length, so both sides are padded to a fixed width before the compare.
 */
export function passwordOk(supplied: string): boolean {
  const expected = process.env.CRM_PASSWORD;
  if (!expected) return false;
  const pad = (v: string) => {
    const b = Buffer.alloc(64, 0);
    Buffer.from(String(v)).copy(b, 0, 0, 64);
    return b;
  };
  return timingSafeEqual(pad(supplied), pad(expected));
}
