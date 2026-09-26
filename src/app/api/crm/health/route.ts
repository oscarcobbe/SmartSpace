/**
 * GET /api/crm/health
 *
 * Whether every source the CRM reads is answering, for both businesses, as
 * JSON: { ok, checkedAt, sources: [{ site, name, ok, ms, error, count? }] }.
 * No customer data, ever: a count at most.
 *
 * Authorised by `Authorization: Bearer <ADMIN_KEY>`, the key the FourWinds
 * portal already holds for the leads feed, so its daily lead check can call
 * this without a second secret to keep in step. Anything else is a 401 that
 * says nothing about which sources exist.
 *
 * Always answers 200 when authorised, with ok false when a source failed:
 * the check succeeded, and what it found is in the body. A 5xx here would
 * mean the check itself broke, which is a different fact.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkSources } from "@/lib/crm/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* SmartCare Living's sheet can take most of a minute to wake, and every
   source is asked at once, so the whole check takes as long as the slowest. */
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const expected = process.env.ADMIN_KEY?.trim();
  if (!expected) return false;
  const supplied = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!supplied) return false;
  /* Padded to one width so the comparison cannot leak the key's length. */
  const pad = (v: string) => {
    const b = Buffer.alloc(256, 0);
    Buffer.from(v).copy(b, 0, 0, 256);
    return b;
  };
  return timingSafeEqual(pad(supplied), pad(expected)) && supplied.length === expected.length;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const result = await checkSources();
  for (const s of result.sources) {
    if (!s.ok) console.error(`[crm-health] ${s.site} ${s.name} failed in ${s.ms}ms: ${s.error}`);
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
