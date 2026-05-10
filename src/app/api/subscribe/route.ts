import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logLead } from "@/lib/leads";

// Single-source email regex used by every public-facing route.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email, consent } = (await request.json()) as { email?: string; consent?: boolean };

    // Tightened from `.includes("@")` which accepted "a@" / "@b" / "@@" —
    // every malformed string was costing Resend bandwidth and writing
    // junk rows to the Sheet.
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    // GDPR / ePrivacy: explicit consent must be captured for marketing.
    if (consent !== true) {
      return NextResponse.json(
        { error: "Please confirm you'd like to receive marketing emails." },
        { status: 400 }
      );
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

    // Await — fire-and-forget gets killed by Vercel's serverless runtime,
    // silently dropping rows.
    await logLead({
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
