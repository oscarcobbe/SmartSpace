import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Notify Smart Space of new subscriber
    await resend.emails.send({
      from: "Smart Space <onboarding@resend.dev>",
      to: "info@smart-space.ie",
      subject: `New mailing list subscriber: ${email}`,
      text: `New subscriber: ${email}\nSubscribed at: ${new Date().toISOString()}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
