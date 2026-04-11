import { NextResponse } from "next/server";
import { Resend } from "resend";

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
    const { name, email, phone, subject, message } = body as {
      name?: string;
      email?: string;
      phone?: string;
      subject?: string;
      message?: string;
    };

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

    // Conversion tracking is handled client-side via gtag in ContactForm.tsx
    return NextResponse.json({ success: true, id: data?.id });
  } catch (e) {
    console.error("Contact API error:", e);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
