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

    /*
     * A local run must not send real email.
     *
     * This repository's .env.local carries Smart Space's production Resend
     * credentials, because the live site's receipts run on them. So a
     * developer opening the CRM on localhost and typing an address into the
     * sign-in box sent that person a genuine "Your sign-in link" email from
     * the client's own account. It happened twice in one sitting, to Nigel,
     * during a demo, and the link in it pointed at localhost so it was
     * useless as well as unexpected.
     *
     * Outside production the link is printed to the server log instead, which
     * is also how you sign in locally. CRM_ALLOW_REAL_EMAIL=true is the
     * deliberate override for anyone who genuinely needs to test delivery.
     */
    const localRun =
      process.env.NODE_ENV !== "production" && process.env.CRM_ALLOW_REAL_EMAIL !== "true";
    if (localRun) {
      console.log(`\n[crm/login] local run, no email sent. Sign-in link for ${address}:\n${link}\n`);
      /* Handed back to the page as well as logged. Printing it only to the
         server log meant whoever was sitting in front of the browser had no
         way to get in without somebody reading the terminal for them. Never
         reaches a real deployment: localRun is false whenever NODE_ENV is
         production. */
      return NextResponse.json({ ...same, devLink: link });
    }

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
