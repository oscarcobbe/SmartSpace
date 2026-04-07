import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, message" },
        { status: 400 }
      );
    }

    // Send notification email to Smart Space
    await resend.emails.send({
      from: "Smart Space <onboarding@resend.dev>",
      to: "info@smart-space.ie",
      replyTo: email,
      subject: `New enquiry from ${name}${subject ? `: ${subject}` : ""}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        subject ? `Subject: ${subject}` : null,
        "",
        "Message:",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    // Send confirmation email to customer
    await resend.emails.send({
      from: "Smart Space <onboarding@resend.dev>",
      to: email,
      subject: "Thanks for contacting Smart Space",
      text: [
        `Hi ${name},`,
        "",
        "Thanks for getting in touch! We've received your message and will get back to you shortly.",
        "",
        "Best regards,",
        "The Smart Space Team",
        "01 513 0424",
        "info@smart-space.ie",
      ].join("\n"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
