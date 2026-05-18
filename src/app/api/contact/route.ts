import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { fireServerConversion } from "@/lib/server-conversions";
import { sendToCrm } from "@/lib/crm";
import { sendSiteAlert } from "@/lib/site-alerts";


// POST routes are inherently dynamic but explicit is better — without
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
      // *renders* broken — not if /api/contact returns 503.
      return NextResponse.json(
        { error: "Email is not configured on the server." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, email, phone, subject, message, attribution, gclid, homepage_url } = body as {
      name?: string;
      email?: string;
      phone?: string;
      subject?: string;
      message?: string;
      attribution?: AttributionRecord;
      gclid?: string; // legacy — accept but prefer attribution.gclid
      homepage_url?: string; // honeypot — see ContactForm.tsx
    };

    // Honeypot — bots fill every input on the page. Real users can't see or
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
      subject: `Smart Space contact: ${subjectLabel} — ${name.trim()}`,
      text: [
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Phone: ${phone?.trim() || "—"}`,
        `Topic: ${subjectLabel}`,
        "",
        message.trim(),
      ].join("\n"),
      html: `
        <h2>New message from smart-space.ie</h2>
        <p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>
        <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone?.trim() || "—")}</p>
        <p><strong>Topic:</strong> ${escapeHtml(subjectLabel)}</p>
        <hr />
        <pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(message.trim())}</pre>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      // Alert Nigel immediately — every contact-form submission is now
      // failing. Without this, customers fill in the form, see a generic
      // error, and bounce without leaving a trace.
      await sendSiteAlert({
        category: "contact-form",
        severity: "error",
        summary: "Contact form Resend send failed",
        details: [
          `The customer's submission was REJECTED by Resend.`,
          `They saw a generic "Could not send email" error — and unless they retry,`,
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
    // PARALLEL FAN-OUT — the four side effects below all run at once.
    // Previously they were sequential awaits (auto-reply → logLead →
    // fireServerConversion → void sendToCrm) which cumulatively took
    // 6–13 seconds before the customer saw "Message Sent!". A 2026-05-18
    // mobile QA flagged the form-submit latency as the most likely cause
    // of the 26 → 3 funnel leak in GA4 (users bailing during the wait).
    //
    // Now: Resend lead email (above) is the only sequential step — it's
    // the "did we capture the lead" check and Resend is fast (~500ms).
    // Everything downstream goes through Promise.allSettled so a single
    // failure can't block the other three, and the response goes out as
    // soon as the slowest task finishes (typically logLead at 3–5s) —
    // total time roughly cut in half.
    //
    // Note: we MUST await this Promise.allSettled. Vercel kills the
    // serverless function the instant the response is returned, so a
    // bare `void` fire-and-forget silently drops ~30% of these calls.
    // The `allSettled` is the right tool — it gives us "parallel but
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
    // the most common — wrapping makes that explicit).
    const autoReplyTask = resend.emails.send({
      from,
      to: [email.trim()],
      replyTo: to,
      subject: "We've got your message — Smart Space",
      text: [
        `Hi ${name.trim().split(" ")[0]},`,
        "",
        `Thanks for getting in touch with Smart Space. We've received your enquiry about ${subjectLabel.toLowerCase()} and will be back to you within one business day — usually a lot sooner.`,
        "",
        `In the meantime if it's urgent you can reach us directly:`,
        `  • Phone: 01 513 0424`,
        `  • Email: info@smart-space.ie`,
        "",
        "We're Dublin's #1 Ring installer — flat-priced, no contracts, brand-agnostic across Ring, Eufy, Nest, and Tapo.",
        "",
        "Talk soon,",
        "Nigel & the Smart Space team",
        "smart-space.ie",
      ].join("\n"),
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a;max-width:520px">
          <p>Hi ${escapeHtml(name.trim().split(" ")[0])},</p>
          <p>Thanks for getting in touch with Smart Space. We've received your enquiry about
            <strong>${escapeHtml(subjectLabel.toLowerCase())}</strong> and will be back to you
            within <strong>one business day</strong> &mdash; usually a lot sooner.</p>
          <p>If it's urgent in the meantime, you can reach us directly:</p>
          <ul>
            <li>Phone: <a href="tel:+35315130424" style="color:#16a34a">01 513 0424</a></li>
            <li>Email: <a href="mailto:info@smart-space.ie" style="color:#16a34a">info@smart-space.ie</a></li>
          </ul>
          <p>We're Dublin's #1 Ring installer &mdash; flat-priced, no contracts, brand-agnostic
            across Ring, Eufy, Nest, and Tapo.</p>
          <p style="margin-top:24px">Talk soon,<br/>
            <strong>Nigel &amp; the Smart Space team</strong><br/>
            <a href="https://smart-space.ie" style="color:#16a34a">smart-space.ie</a></p>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0" />
          <p style="font-size:12px;color:#999">
            You're receiving this because you submitted the contact form on smart-space.ie.
            If this wasn't you, just ignore this email.
          </p>
        </div>
      `,
    }).catch((err) => {
      // Non-fatal — Nigel still got the lead, the customer just doesn't
      // get the immediate confirmation. Logged for visibility.
      console.error("[contact] auto-reply email failed (non-fatal):", err);
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
      gadsLabel: leadLabel, // Smart Space Lead — same label as ContactForm
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
    // sum — typically 3–5s vs the old 6–13s. allSettled means one
    // failure doesn't block the response or the other tasks.
    await Promise.allSettled([autoReplyTask, logLeadTask, fireConversionTask, crmTask]);

    return NextResponse.json({ success: true, id: data?.id, conversionId });
  } catch (e) {
    console.error("Contact API error:", e);
    // Unexpected exception — alert Nigel. This is the catch-all for anything
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
