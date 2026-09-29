/**
 * Unsubscribe, from the link in every mailing and from the one-click button
 * mail apps show.
 *
 * A GET only shows a page with a button, because mail security scanners open
 * every link in an email and would otherwise unsubscribe people who never
 * clicked. The POST records the opt-out: from that button, or straight from
 * the mail app under RFC 8058 (List-Unsubscribe=One-Click). The address goes
 * on crm_outreach_blocks, the permanent opt-out list every send checks, and
 * nothing deletes from it.
 */
import { crm, crmConfigured } from "@/lib/crm/db";
import { readUnsubscribeToken } from "@/lib/email/mailing-rules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!DOCTYPE html><html lang="en-IE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#f1efea;font-family:Helvetica,Arial,sans-serif;color:#1C1A18;">
<main style="max-width:480px;margin:10vh auto;background:#fff;border-radius:12px;padding:32px 28px;">
<img src="https://smart-space.ie/Logo1.png" width="110" alt="Smart Space" style="display:block;margin-bottom:24px;">
<h1 style="font-size:22px;margin:0 0 12px;">${title}</h1>${body}
</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

function emailFrom(request: Request): string | null {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim();
  const t = new URL(request.url).searchParams.get("t");
  if (!secret || !t) return null;
  return readUnsubscribeToken(t, secret);
}

export async function GET(request: Request) {
  const email = emailFrom(request);
  if (!email) {
    return page(
      "This link has not worked",
      `<p style="line-height:1.6;">Reply to the email with the word unsubscribe and we'll take you off the list.</p>`,
      400,
    );
  }
  const t = new URL(request.url).searchParams.get("t") ?? "";
  return page(
    "Unsubscribe from Smart Space emails",
    `<p style="line-height:1.6;">This stops our announcements to <strong>${email.replace(/[<>&"]/g, "")}</strong>. You'll still hear from us about any booking or order of your own.</p>
<form method="post" action="/api/email/unsubscribe?t=${encodeURIComponent(t)}" style="margin-top:20px;">
<button type="submit" style="background:#1C1A18;color:#fff;border:0;border-radius:999px;padding:12px 22px;font-size:15px;font-weight:700;cursor:pointer;">Unsubscribe</button>
</form>`,
  );
}

export async function POST(request: Request) {
  const email = emailFrom(request);
  if (!email) return page("This link has not worked", `<p style="line-height:1.6;">Reply to the email with the word unsubscribe and we'll take you off the list.</p>`, 400);
  if (!crmConfigured()) {
    console.error("[unsubscribe] CRM not configured; could not record an opt-out");
    return page("That did not save", `<p style="line-height:1.6;">Please reply to the email with the word unsubscribe and we'll take you off the list.</p>`, 503);
  }
  try {
    const already = await crm<{ email: string }[]>(`crm_outreach_blocks?email=ilike.${encodeURIComponent(email)}&select=email&limit=1`);
    if (!already?.length) {
      await crm("crm_outreach_blocks", {
        method: "POST",
        prefer: "return=minimal",
        body: JSON.stringify({ email, reason: "Unsubscribed from a Smart Space email", added_by: "the recipient" }),
      });
    }
  } catch (err) {
    console.error("[unsubscribe] could not record:", err);
    return page("That did not save", `<p style="line-height:1.6;">Please reply to the email with the word unsubscribe and we'll take you off the list.</p>`, 500);
  }
  return page("You're unsubscribed", `<p style="line-height:1.6;">We won't send announcements to ${email.replace(/[<>&"]/g, "")} again.</p>`);
}
