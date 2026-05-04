import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { fireServerConversion } from "@/lib/server-conversions";

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
      return NextResponse.json(
        { error: "Could not send email. Please try again later." },
        { status: 502 }
      );
    }

    // Auto-reply to the customer — sets expectation, gives a reply-to
    // address, and trains them to whitelist us in spam filters. Fire-and-
    // forget: if it fails the customer flow has already succeeded (Nigel
    // got the lead email + the row hit the Sheet), so we just log.
    try {
      await resend.emails.send({
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
      });
    } catch (autoReplyErr) {
      // Non-fatal — Nigel still got the lead, the customer just doesn't get
      // an immediate confirmation. Logged for visibility.
      console.error("[contact] auto-reply email failed (non-fatal):", autoReplyErr);
    }

    // Await so the row reaches the sheet before this serverless function
    // returns. Fire-and-forget here was silently dropping ~30% of rows
    // because Vercel kills the function instance once the response is sent.
    // logLead swallows its own errors, so a slow/down sheet still won't
    // break the user flow.
    await logLead({
      type: "Contact Enquiry",
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      attribution: attribution ?? (gclid ? { gclid: gclid.trim() } : undefined),
      notes: `${subjectLabel}: ${message.trim()}`,
      source: "smart-space.ie",
    });

    // Server-side conversion fire — backstops ContactForm.tsx's client-side
    // gtag. Client fire misses ~20-40% of submissions due to adblockers,
    // consent denials, or the user closing the tab before the pixel completes.
    // Server-side has the email/phone we just received and (when present)
    // the gclid carried via attribution.
    //
    // Both fires share `conversionId` (UUID generated here) → returned to
    // the client → used as `transaction_id` in the client-side gtag fire
    // too → Google Ads de-duplicates by transaction_id, so we count one
    // conversion even though two pings arrive.
    const conversionId = randomUUID();
    const [firstName, ...rest] = (name?.trim() || "").split(/\s+/);
    const lastName = rest.join(" ") || undefined;
    await fireServerConversion({
      gadsLabel: "u8cHCNyipZocEJfU6PxC", // Smart Space Lead — same label as ContactForm
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

    return NextResponse.json({ success: true, id: data?.id, conversionId });
  } catch (e) {
    console.error("Contact API error:", e);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
