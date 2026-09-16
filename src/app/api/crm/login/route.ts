/**
 * Ask for a sign-in link.
 *
 * Always answers the same thing, whether or not the address is on the list. An
 * endpoint that says "no such user" is an endpoint that will tell a stranger
 * which addresses are real, and there are two.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { allowedSites, mintLinkToken } from "@/lib/crm/auth";
import { crmConfigured, type Site } from "@/lib/crm/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Three attempts per address per fifteen minutes. Not to stop a determined
   attacker, who learns nothing here anyway, but to stop a stuck form or a
   retry loop filling somebody's inbox with sign-in links. */
const attempts = new Map<string, number[]>();
function rateLimitOk(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < 15 * 60_000);
  if (recent.length >= 3) return false;
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

export async function POST(request: Request) {
  if (!crmConfigured()) return new NextResponse("Not found", { status: 404 });

  const { email, site } = (await request.json().catch(() => ({}))) as { email?: string; site?: Site };
  const address = (email ?? "").trim().toLowerCase();
  const target: Site = site === "smartcareliving" ? "smartcareliving" : "smart-space";

  const same = { ok: true, message: "If that address can sign in, the link is on its way." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) return NextResponse.json(same);
  if (!rateLimitOk(address)) return NextResponse.json(same);

  try {
    const sites = await allowedSites(address);
    if (!sites || !sites.includes(target)) return NextResponse.json(same);

    const token = await mintLinkToken(address, target, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown");
    const origin = new URL(request.url).origin;
    const link = `${origin}/api/crm/session?token=${encodeURIComponent(token)}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    await new Resend(apiKey).emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Smart Space <hello@smart-space.ie>",
      to: address,
      subject: "Your sign-in link",
      text: `Sign in here: ${link}\n\nThe link works once and expires in fifteen minutes. If you did not ask for it, ignore this email and nothing happens.`,
      html:
        `<p>Sign in here:</p>` +
        `<p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#0d0d5e;color:#fff;border-radius:6px;text-decoration:none;font-family:Helvetica,Arial,sans-serif">Open the CRM</a></p>` +
        `<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#555">The link works once and expires in fifteen minutes. If you did not ask for it, ignore this email and nothing happens.</p>`,
    });
    return NextResponse.json(same);
  } catch (err) {
    console.error("[crm/login]", err instanceof Error ? err.message : err);
    /* Still the same answer. A failure here must not become the one response
       that differs and therefore tells a stranger the address was real. */
    return NextResponse.json(same);
  }
}
