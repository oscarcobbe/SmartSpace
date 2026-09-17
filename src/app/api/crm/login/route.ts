/**
 * Sign in with the password.
 *
 * No email, no link, no waiting. He types the password and he is in, which is
 * what was asked for.
 *
 * The rate limit is the only thing standing between a one character password
 * and anybody who finds /crm, so it is deliberately strict: ten attempts from
 * an address in fifteen minutes, then a lockout for the rest of that window.
 * Keyed on the IP rather than on the attempt, so a wrong guess costs the
 * guesser a slot whatever the answer was.
 */
import { NextResponse } from "next/server";
import { passwordOk, makeSessionCookie, COOKIE } from "@/lib/crm/auth";
import { crmConfigured, THIS_SITE } from "@/lib/crm/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, number[]>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  /* Pruned here rather than on a timer: the map only ever holds addresses that
     have tried recently, and a serverless instance is short lived anyway. */
  if (attempts.size > 5000) attempts.clear();
  return recent.length > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  if (!crmConfigured()) return new NextResponse("Not found", { status: 404 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (tooMany(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  if (!password || !passwordOk(password)) {
    return NextResponse.json({ ok: false, error: "That is not the password." }, { status: 401 });
  }

  /* The session records who and which business. There is one password and one
     user, so the email is the site's owner rather than something typed. */
  const email = process.env.CRM_OWNER_EMAIL?.trim() || "nigel@smart-space.ie";
  const { value, maxAge } = makeSessionCookie(email, THIS_SITE);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, value, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge,
  });
  return res;
}
