import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logLead } from "@/lib/leads";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? "Smart Space <onboarding@resend.dev>";
    const to = process.env.CONTACT_TO_EMAIL ?? "nigel@smart-space.ie";

    if (!apiKey) {
      console.error("Subscribe: RESEND_API_KEY not set");
      return NextResponse.json({ error: "Email not configured" }, { status: 503 });
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from,
      to: [to],
      subject: `New mailing list subscriber: ${email}`,
      text: `New subscriber: ${email}\nSubscribed at: ${new Date().toISOString()}`,
    });

    logLead({
      type: "Newsletter Signup",
      email,
      source: "smart-space.ie",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
