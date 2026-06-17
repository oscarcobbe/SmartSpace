import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { fireServerConversion } from "@/lib/server-conversions";
import { sendToCrm } from "@/lib/crm";
import { sendSiteAlert } from "@/lib/site-alerts";


// POST routes are inherently dynamic but explicit is better, without
// this, Next.js may try static optimization on a future major.
export const dynamic = "force-dynamic";

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Enquiry",
  installation: "Installation Enquiry",
  product: "Product Question",
  support: "Support Request",
  other: "Other",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const to = process.env.CONTACT_TO_EMAIL ?? "info@smart-space.ie";

    if (!apiKey || !from) {
      console.error(
        "Contact API: missing RESEND_API_KEY or RESEND_FROM_EMAIL (set them in Vercel / .env.local)"
      );
      // This bypasses sendSiteAlert (no API key to send WITH) but the
      // console.error above will surface in Vercel logs. Cron health-check
      // would also catch this within 24h via the page sentinel checks,
      // though strictly speaking it'd only fire if the contact page
      // *renders* broken, not if /api/contact returns 503.
      return NextResponse.json(
        { error: "Email is not configured on the server." },
        { status: 503 }
      );
    }

    // Parse the body in its own try-block. Bots, scanners, and stray curls
    // POST empty or malformed JSON to /api/contact constantly. These should
    // return a quiet 400, NOT trigger the bottom-of-route sendSiteAlert
    // panic email, which is reserved for genuine infrastructure failures
    // (Resend down, Apps Script unreachable, etc.). Previously a single
    // empty-body POST would page Nigel.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }
    const { name, email, phone, subject, message, attribution, gclid, homepage_url } = body as {
      name?: string;
      email?: string;
      phone?: string;
      subject?: string;
      message?: string;
      attribution?: AttributionRecord;
      gclid?: string; // legacy, accept but prefer attribution.gclid
      homepage_url?: string; // honeypot, see ContactForm.tsx
    };

    // Honeypot, bots fill every input on the page. Real users can't see or
    // interact with `homepage_url` (it's off-screen + aria-hidden +
    // tabindex=-1 + autocomplete=off). Non-empty value = bot. Return success
    // so the bot doesn't retry, but skip every side effect: no email, no
    // sheet write, no conversion fire, no Resend reply-to. Logged loudly so
    // false positives are visible in Vercel logs.
    if (homepage_url && homepage_url.trim() !== "") {
      console.warn(
        `[contact] honeypot triggered, dropping bot submission. ` +
          `name=${(name ?? "").slice(0, 40)} email=${(email ?? "").slice(0, 60)} ` +
          `honeypot=${homepage_url.slice(0, 60)}`
      );
      return NextResponse.json({ success: true, id: "honeypot" });
    }

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, message" },
        { status: 400 }
      );
    }

    // Reject malformed emails server-side. The browser's `type="email"`
    // catches obvious typos but accepts e.g. `a@b` (no TLD). Tightening
    // here saves us paying Resend to attempt invalid sends and stops
    // bots that bypass the client validation.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Cap message length so a 10MB POST doesn't cost us Resend bandwidth.
    if (message.trim().length > 4000) {
      return NextResponse.json({ error: "Message is too long (max 4000 characters)" }, { status: 400 });
    }

    const subjectKey = typeof subject === "string" ? subject : "";
    const subjectLabel = SUBJECT_LABELS[subjectKey] ?? (subjectKey ? subjectKey : "Website enquiry");

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: email.trim(),
      subject: `Smart Space contact: ${subjectLabel}, ${name.trim()}`,
      text: [
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Phone: ${phone?.trim() || "(none)"}`,
        `Topic: ${subjectLabel}`,
        "",
        message.trim(),
      ].join("\n"),
      html: `
        <h2>New message from smart-space.ie</h2>
        <p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>
        <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone?.trim() || "(none)")}</p>
        <p><strong>Topic:</strong> ${escapeHtml(subjectLabel)}</p>
        <hr />
        <pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(message.trim())}</pre>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      // Alert Nigel immediately, every contact-form submission is now
      // failing. Without this, customers fill in the form, see a generic
      // error, and bounce without leaving a trace.
      await sendSiteAlert({
        category: "contact-form",
        severity: "error",
        summary: "Contact form Resend send failed",
        details: [
          `The customer's submission was REJECTED by Resend.`,
          `They saw a generic "Could not send email" error, and unless they retry,`,
          `their enquiry is lost. Worth following up on a fresh Resend incident page:`,
          `https://status.resend.com`,
          "",
          `Customer name:  ${name?.trim() || "(unknown)"}`,
          `Customer email: ${email?.trim() || "(unknown)"}`,
          "",
          `Resend error:`,
          JSON.stringify(error, null, 2),
        ].join("\n"),
        dedupeKey: `contact-form:resend-send-failed:${(error as { name?: string }).name ?? "unknown"}`,
      });
      return NextResponse.json(
        { error: "Could not send email. Please try again later." },
        { status: 502 }
      );
    }

    // ──────────────────────────────────────────────────────────────
    // PARALLEL FAN-OUT, the four side effects below all run at once.
    // Previously they were sequential awaits (auto-reply → logLead →
    // fireServerConversion → void sendToCrm) which cumulatively took
    // 6–13 seconds before the customer saw "Message Sent!". A 2026-05-18
    // mobile QA flagged the form-submit latency as the most likely cause
    // of the 26 → 3 funnel leak in GA4 (users bailing during the wait).
    //
    // Now: Resend lead email (above) is the only sequential step, it's
    // the "did we capture the lead" check and Resend is fast (~500ms).
    // Everything downstream goes through Promise.allSettled so a single
    // failure can't block the other three, and the response goes out as
    // soon as the slowest task finishes (typically logLead at 3–5s),
    // total time roughly cut in half.
    //
    // Note: we MUST await this Promise.allSettled. Vercel kills the
    // serverless function the instant the response is returned, so a
    // bare `void` fire-and-forget silently drops ~30% of these calls.
    // The `allSettled` is the right tool, it gives us "parallel but
    // still awaited" semantics.
    // ──────────────────────────────────────────────────────────────

    // Conversion ID generated here so the client-side gtag fire can use
    // it as `transaction_id` for Google Ads dedupe.
    const conversionId = randomUUID();
    const [firstName, ...rest] = (name?.trim() || "").split(/\s+/);
    const lastName = rest.join(" ") || undefined;
    const leadLabel =
      (process.env.NEXT_PUBLIC_GADS_LEAD_SEND_TO || "")
        .trim()
        .replace(/^AW-\d+\//, "") || "u8cHCNyipZocEJfU6PxC";

    // Build all four downstream tasks as promises, then await them
    // together. Errors are caught per-task so one failure doesn't kill
    // the others (Resend rejection during auto-reply was historically
    // the most common, wrapping makes that explicit).
    //
    // IMPORTANT: the Resend SDK resolves with `{ data, error }` on most
    // failure modes (sandbox restrictions, invalid recipient, rate limit
    // exceeded, blocked domain). It only THROWS on network or auth
    // errors. A bare `.catch()` therefore misses the most common failure
    // modes. We unpack the result, check `.error` explicitly, and page
    // Nigel via sendSiteAlert when the customer-side auto-reply fails so
    // the lead doesn't bounce in silence.
    const firstNameSafe = escapeHtml(name.trim().split(" ")[0]);
    const subjectLowerSafe = escapeHtml(subjectLabel.toLowerCase());
    const customerEmail = email.trim();
    const customerName = name.trim();
    const autoReplyTask: Promise<{ ok: boolean; reason?: string }> = resend.emails.send({
      from,
      to: [email.trim()],
      replyTo: to,
      subject: "We've got your message, Smart Space",
      text: [
        `Hi ${name.trim().split(" ")[0]},`,
        "",
        `Thanks for getting in touch with Smart Space. We've received your enquiry about ${subjectLabel.toLowerCase()} and will be back to you within one business day (usually a lot sooner).`,
        "",
        `If it's urgent in the meantime, you can reach us directly:`,
        `  Phone: 01 513 0424`,
        `  Email: info@smart-space.ie`,
        "",
        "We're Dublin's #1 Ring installer, transparent pricing quoted up front, no contracts, brand-agnostic across Ring, Eufy, Nest, Tapo, and Aosu.",
        "",
        "Talk soon,",
        "Nigel and the Smart Space team",
        "smart-space.ie",
      ].join("\n"),
      // 600px table layout, inline styles only, Gmail / Outlook / Apple
      // Mail all strip <style> blocks aggressively, so EVERY style must be
      // an inline attribute. Mirrors the SCL launch email template language
      // (ad-assets/email-outreach/04-smartcareliving-launch.html).
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en-IE">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>We've got your message, Smart Space</title>
</head>
<body style="margin:0;padding:0;background:#f1efea;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
<div style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#f1efea;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Thanks, we've got your enquiry. We'll be back to you within one business day.</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1efea;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid #e6e3df;" align="left">
        <img src="https://smart-space.ie/Logo1.png" width="120" height="auto" alt="Smart Space" style="display:block;height:auto;max-width:120px;border:0;outline:none;text-decoration:none;">
      </td></tr>
      <tr><td style="padding:36px 32px 8px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <h1 style="margin:0;font-size:24px;line-height:1.2;letter-spacing:-0.4px;color:#1C1A18;font-weight:800;">Thanks, ${firstNameSafe}. We've got your message.</h1>
        <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#3f3d3a;">We've received your enquiry about <strong style="color:#1C1A18;">${subjectLowerSafe}</strong> and will be back to you within <strong style="color:#1C1A18;">one business day</strong> (usually a lot sooner).</p>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-left:3px solid #f48222;">
          <tr><td style="padding:4px 0 4px 16px;">
            <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#1C1A18;font-weight:700;">Need us sooner? Reach us directly:</p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3d3a;">
              Phone: <a href="tel:+35315130424" style="color:#f48222;font-weight:700;text-decoration:underline;">01 513 0424</a><br>
              Email: <a href="mailto:info@smart-space.ie" style="color:#f48222;font-weight:700;text-decoration:underline;">info@smart-space.ie</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3d3a;">We're Dublin's #1 Ring installer. Transparent pricing quoted up front, no contracts, brand-agnostic across Ring, Eufy, Nest, Tapo, and Aosu.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 32px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3d3a;">Talk soon,<br><strong style="color:#1C1A18;">Nigel and the Smart Space team</strong><br><a href="https://smart-space.ie" style="color:#f48222;font-weight:700;text-decoration:underline;">smart-space.ie</a></p>
      </td></tr>
      <tr><td style="padding:28px 32px;background:#1C1A18;color:#cccccc;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td valign="top" style="padding-right:16px;">
              <div style="font-weight:800;color:#ffffff;font-size:14px;letter-spacing:0.4px;margin-bottom:8px;">Smart Space</div>
              <div>Dublin's #1 Ring installer.</div>
              <div>Brand-agnostic. No contract.</div>
            </td>
            <td valign="top" style="padding-left:16px;text-align:right;">
              <div><a href="tel:+35315130424" style="color:#ffffff;text-decoration:none;font-weight:700;">01 513 0424</a></div>
              <div><a href="mailto:info@smart-space.ie" style="color:#ffffff;text-decoration:none;">info@smart-space.ie</a></div>
              <div><a href="https://smart-space.ie" style="color:#ffffff;text-decoration:none;">smart-space.ie</a></div>
            </td>
          </tr>
        </table>
        <div style="border-top:1px solid #2e2c2a;margin-top:18px;padding-top:14px;font-size:11px;color:#888;line-height:1.55;">
          You're receiving this because you submitted the contact form on smart-space.ie. If this wasn't you, just ignore this email.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    }).then(async (result) => {
      // Resend's resolved-error path. SDK returns { data, error } and we
      // have to check explicitly, a bare .catch() never sees this.
      if (result && "error" in result && result.error) {
        const reason = JSON.stringify(result.error);
        console.error("[contact] auto-reply email rejected by Resend:", reason);
        await sendSiteAlert({
          category: "contact-form",
          severity: "warning",
          summary: "Contact auto-reply email failed to send",
          details: [
            "The customer submitted the contact form successfully, but our auto-reply confirmation email was REJECTED by Resend.",
            "",
            "The lead alert email to you still arrived, the lead is captured.",
            "The customer just didn't get the immediate \"we've got your message\" confirmation.",
            "Worth a quick manual reply if the timing is sensitive.",
            "",
            `Customer name:  ${customerName}`,
            `Customer email: ${customerEmail}`,
            "",
            "Most likely causes:",
            "  1. Resend account is in sandbox / test mode (free tier only ships",
            "     to verified team addresses). Verify the sending domain at",
            "     https://resend.com/domains to lift the restriction.",
            "  2. RESEND_FROM_EMAIL uses an unverified domain.",
            "  3. The customer's email is on a hard-bounce suppression list.",
            "",
            "Resend error payload:",
            reason,
          ].join("\n"),
          dedupeKey: `contact-form:auto-reply-failed:${(result.error as { name?: string }).name ?? "unknown"}`,
        });
        return { ok: false, reason };
      }
      return { ok: true };
    }).catch(async (err) => {
      // Network / SDK throw. Different from the resolved-error path above,
      // and rarer.
      const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("[contact] auto-reply email threw:", reason);
      await sendSiteAlert({
        category: "contact-form",
        severity: "warning",
        summary: "Contact auto-reply email threw an exception",
        details: [
          "The customer submitted the contact form successfully, but our auto-reply",
          "confirmation email threw an uncaught exception during send.",
          "",
          "The lead alert email to you still arrived, the lead is captured.",
          "",
          `Customer name:  ${customerName}`,
          `Customer email: ${customerEmail}`,
          "",
          "Exception:",
          reason,
        ].join("\n"),
        dedupeKey: `contact-form:auto-reply-threw:${err instanceof Error ? err.name : "unknown"}`,
      });
      return { ok: false, reason };
    });

    const logLeadTask = logLead({
      type: "Contact Enquiry",
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      attribution: attribution ?? (gclid ? { gclid: gclid.trim() } : undefined),
      notes: `${subjectLabel}: ${message.trim()}`,
      source: "smart-space.ie",
    });

    const fireConversionTask = fireServerConversion({
      gadsLabel: leadLabel, // Smart Space Lead, same label as ContactForm
      ga4EventName: "generate_lead",
      value: 10,
      currency: "EUR",
      transactionId: conversionId,
      gclid: attribution?.gclid || gclid || undefined,
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      firstName: firstName || undefined,
      lastName,
      extraParams: { lead_source: "contact_form", topic: subjectLabel },
    });

    const crmTask = sendToCrm({
      source: "contact_form",
      source_detail: subjectLabel,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      message: message.trim(),
      utm_source: attribution?.utmSource ?? null,
      utm_medium: attribution?.utmMedium ?? null,
      utm_campaign: attribution?.utmCampaign ?? null,
      utm_term: attribution?.utmTerm ?? null,
      utm_content: attribution?.utmContent ?? null,
      gclid: attribution?.gclid ?? gclid ?? null,
      referrer: attribution?.referrer ?? null,
      tags: ["contact-form"],
      custom: { conversion_id: conversionId, subject_key: subjectKey },
    });

    // Wait for all four to settle. Ceiling is the slowest task, not the
    // sum, typically 3–5s vs the old 6–13s. allSettled means one
    // failure doesn't block the response or the other tasks.
    const [autoReplyResult] = await Promise.all([
      autoReplyTask,
      Promise.allSettled([logLeadTask, fireConversionTask, crmTask]),
    ]);

    return NextResponse.json({
      success: true,
      id: data?.id,
      conversionId,
      // Lead email always succeeds at this point (errors above return 502),
      // so we hardcode true. Auto-reply outcome surfaces the silent-failure
      // mode so manual contact-form tests show clearly which side worked.
      leadEmailSent: true,
      autoReplySent: autoReplyResult.ok,
      autoReplyError: autoReplyResult.ok ? undefined : autoReplyResult.reason,
    });
  } catch (e) {
    console.error("Contact API error:", e);
    // Unexpected exception, alert Nigel. This is the catch-all for anything
    // Resend, Sheets, CRM, or attribution that throws unexpectedly.
    await sendSiteAlert({
      category: "contact-form",
      severity: "error",
      summary: "Contact form handler threw unexpectedly",
      details: [
        "The /api/contact route threw an uncaught exception.",
        "The user saw a generic 500 error and likely abandoned the form.",
        "",
        e instanceof Error ? `${e.name}: ${e.message}\n\n${e.stack ?? ""}` : String(e),
      ].join("\n"),
      dedupeKey: `contact-form:handler-throw:${e instanceof Error ? e.name : "unknown"}`,
    });
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
