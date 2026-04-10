import { NextRequest, NextResponse } from "next/server";
import { uploadConversion } from "@/lib/conversions";

// Typeform sends a POST when a form is submitted.
// We extract the hidden gclid field, upload to Zapier Tables as both an
// "Installer Lead" and "Specialist Lead" offline conversion (€10 each),
// so that whichever campaign the click came from gets credit.

interface TypeformAnswer {
  field: { id: string; ref?: string; type: string };
  type: string;
  text?: string;
  email?: string;
  phone_number?: string;
  choice?: { label: string };
}

interface TypeformPayload {
  form_response: {
    form_id: string;
    submitted_at: string;
    hidden?: Record<string, string>;
    answers: TypeformAnswer[];
  };
}

function extractField(answers: TypeformAnswer[], type: string): string {
  const a = answers.find((a) => a.type === type);
  if (!a) return "";
  if (type === "email") return a.email ?? "";
  if (type === "phone_number") return a.phone_number ?? "";
  return a.text ?? a.choice?.label ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const body: TypeformPayload = await req.json();
    const { form_response } = body;
    const { hidden, answers, submitted_at } = form_response;

    const gclid = hidden?.gclid ?? "";
    const email = extractField(answers, "email");
    const name =
      extractField(answers, "short_text") || extractField(answers, "long_text");
    const phone = extractField(answers, "phone_number");
    const conversionTime = new Date(submitted_at).toISOString();

    const base = {
      gclid,
      email,
      name,
      phone,
      submitted_at,
      form_id: form_response.form_id,
      conversion_time: conversionTime,
      conversion_value: 10,
      currency: "EUR",
    };

    // Upload as both campaign conversion types so the right one gets credited
    // (Google Ads only counts the conversion for the campaign that generated the GCLID)
    await Promise.all([
      uploadConversion({ ...base, conversion_name: "Installer Lead" }),
      uploadConversion({ ...base, conversion_name: "Specialist Lead" }),
      // Also post to Zapier Tables via legacy env var webhook if configured
      ...(process.env.ZAPIER_TYPEFORM_WEBHOOK_URL
        ? [
            fetch(process.env.ZAPIER_TYPEFORM_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...base, conversion_name: "SmartSpace Lead" }),
            }),
          ]
        : []),
    ]);

    if (gclid) {
      console.log(`[typeform] gclid=${gclid} email=${email} at ${submitted_at}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[typeform webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
