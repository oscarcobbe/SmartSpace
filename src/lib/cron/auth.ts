/**
 * The Bearer check every cron route makes: Vercel's scheduler sends
 * CRON_SECRET, and anything else is refused. Compared in constant time.
 */
import { timingSafeEqual } from "crypto";

export function cronAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
