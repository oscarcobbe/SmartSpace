import { NextResponse } from "next/server";
import { COOKIE, makeSessionCookie, readSessionCookie } from "@/lib/crm/auth";
import type { Site } from "@/lib/crm/db";

export const runtime = "nodejs";

const ALLOWED: Site[] = ["smart-space", "smartcareliving"];

/**
 * Switch which of the two businesses the CRM is showing.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * The CRM was built to be deployed once per site, with CRM_SITE naming the
 * business, and the comment in db.ts argued that this was the safe shape
 * because a misconfigured value could only under-show rather than leak.
 *
 * That was sound and it left SmartCare Living with no CRM at all.
 * smartcareliving.ie is static HTML with a few functions, so there is nowhere
 * on it to deploy a Next.js app, and there never was going to be. Every SCL
 * code path existed and was reachable from nothing: its leads reader, its ads
 * account, its GA4 property. smartcareliving.ie/crm answered 404 because there
 * was no second deployment for it to be.
 *
 * So one deployment serves both, and the safety argument still holds for a
 * different reason: both businesses belong to the same person, there is one
 * password, and the switch is only offered to somebody who already has a valid
 * session. Nothing crosses between parties, because there is only one party.
 */
export async function POST(request: Request) {
  const current = readSessionCookie(request.headers.get("cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1]);
  if (!current) {
    return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  }

  const { site } = (await request.json().catch(() => ({}))) as { site?: string };
  if (!site || !ALLOWED.includes(site as Site)) {
    return NextResponse.json({ ok: false, error: "Not a business this CRM knows." }, { status: 400 });
  }

  /* The email travels unchanged. It names the owner, not the business, and
     rewriting it here would quietly change who the audit trail says acted. */
  const { value, maxAge } = makeSessionCookie(current.email, site as Site);
  const res = NextResponse.json({ ok: true, site });
  res.cookies.set(COOKIE, value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
  return res;
}
