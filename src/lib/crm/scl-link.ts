/**
 * Signed calls between the CRM and smartcareliving.ie, with the secret the two
 * already share for leads (CRM_HMAC_SECRET on both). Three shapes:
 *   daily(msg)   HMAC of "msg:YYYY-MM-DD" (UTC); today's or yesterday's is accepted
 *   body(text)   HMAC of a request body, as the lead webhook does
 *   stopToken(id) the token in a customer's "Stop these emails" link
 */
import { createHmac, timingSafeEqual } from "crypto";

const secret = () => process.env.CRM_HMAC_SECRET?.trim() || "";
const hmac = (s: string, msg: string) => createHmac("sha256", s).update(msg).digest("hex");
const day = (back: number) => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);
function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const sclLinkConfigured = () => Boolean(secret());
export const signDaily = (msg: string) => hmac(secret(), `${msg}:${day(0)}`);
export function verifyDaily(msg: string, sig: string | null): boolean {
  const s = secret();
  return Boolean(s && sig && [0, 1].some((b) => same(hmac(s, `${msg}:${day(b)}`), sig)));
}
export const signBody = (body: string) => hmac(secret(), body);
export function verifyBody(body: string, sig: string | null): boolean {
  const s = secret();
  return Boolean(s && sig && same(hmac(s, body), sig));
}
export const stopToken = (leadId: string) => hmac(secret(), `stop:${leadId}`).slice(0, 24);
