/**
 * The rules for tagging a hand-made Stripe payment link.
 *
 * Kept apart from the route so they can be tested without standing up a
 * request, an admin key and a mail provider. The failure mode this guards
 * against is quiet: Stripe silently drops a client_reference_id it does not
 * like, so a malformed one produces a link that looks tagged, sends fine, and
 * attributes nothing. Nobody would notice for months.
 *
 * Stripe's limits, from its own documentation: letters, digits, dashes and
 * underscores, up to 200 characters.
 */
import { randomBytes } from "node:crypto";

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,200}$/;

/**
 * Is this click id safe to carry?
 *
 * Google click ids are base64url in practice, so the character rule almost
 * never bites. It bites on the cases that matter: an empty string, a value
 * somebody pasted with a space in it, or a whole URL pasted by mistake.
 */
export function isUsableGclid(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const t = raw.trim();
  return t.length > 0 && t.length <= 180 && /^[A-Za-z0-9_-]+$/.test(t);
}

/**
 * An opaque reference, not the click id itself.
 *
 * Stripe warns that a link carrying URL parameters travels further than you
 * intend, so what goes on the URL is a token that means nothing on its own.
 * The mapping lives in the database.
 */
export function mintToken(): string {
  return `ss${randomBytes(18).toString("base64url")}`;
}

/**
 * The URL as it should be emailed.
 *
 * Returns the original untouched when there is nothing to attach, so the
 * caller has one code path and a link always goes out. A link that sends
 * untagged is the status quo; a link that does not send is a lost sale.
 */
export function withReference(url: URL, token: string | null): URL {
  if (!token || !TOKEN_PATTERN.test(token)) return url;
  const out = new URL(url.toString());
  out.searchParams.set("client_reference_id", token);
  return out;
}
