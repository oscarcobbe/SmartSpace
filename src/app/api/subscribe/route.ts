import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logLead } from "@/lib/leads";
import { alertTo } from "@/lib/business-constants";


// POST routes are inherently dynamic but explicit is better — without
// this, Next.js may try static optimization on a future major.
export const dynamic = "force-dynamic";

// Single-source email regex used by every public-facing route.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    // Parse body defensively — bots and scanners POST malformed JSON
    // constantly. Quiet 400 rather than a 500 from the outer catch.
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }
    const { email, consent, homepage_url } = raw as {
      email?: string;
      consent?: boolean;
      homepage_url?: string; // honeypot — see MailingList.tsx
    };

    // Cap email length so a 10MB POST can't be used to blow up Resend
    // bandwidth or write garbage rows to the Sheet. RFC 5321 caps the
    // local-part at 64 + domain at 255 = 320; we use that as our limit.
    if (email && typeof email === "string" && email.length > 320) {
      return NextResponse.json({ error: "Email is too long (max 320 characters)" }, { status: 400 });
    }

    // Honeypot — same pattern as /api/contact. Real users can't see the
    // hidden input; bots that fill every field will leave a non-empty
    // value here. Return 200 success so the bot doesn't retry, skip every
    // side effect (no email to Nigel, no Sheet row).
    if (homepage_url && homepage_url.trim() !== "") {
      console.warn(
        `[subscribe] honeypot triggered, dropping bot submission. ` +
          `email=${(email ?? "").slice(0, 60)} honeypot=${homepage_url.slice(0, 60)}`
      );
      return NextResponse.json({ success: true, id: "honeypot" });
    }

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
    const to = alertTo();

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
