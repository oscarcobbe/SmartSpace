/**
 * Exchange a link token for a session, once.
 *
 * A GET because it is reached by clicking a link in an email, which is also why
 * the cookie is SameSite=Lax: Strict would drop it on that first arrival and
 * land him back on the login page having just signed in.
 */
import { NextResponse } from "next/server";
import { redeemLinkToken, makeSessionCookie, COOKIE } from "@/lib/crm/auth";
import { crmConfigured } from "@/lib/crm/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!crmConfigured()) return new NextResponse("Not found", { status: 404 });

  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;
  if (!token) return NextResponse.redirect(`${origin}/crm?error=missing`);

  const claim = await redeemLinkToken(token).catch(() => null);
  if (!claim) return NextResponse.redirect(`${origin}/crm?error=expired`);

  const { value, maxAge } = makeSessionCookie(claim.email, claim.site);
  const res = NextResponse.redirect(`${origin}/crm`);
  res.cookies.set(COOKIE, value, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge,
  });
  return res;
}
