import { NextRequest, NextResponse } from "next/server";

// Typeform sends a POST when a form is submitted.
// We extract the hidden gclid field and forward it to:
//   1. Zapier Tables (ZAPIER_TABLES_ID + ZAPIER_TABLES_SECRET env vars)
//   2. Optional generic Zapier webhook (ZAPIER_TYPEFORM_WEBHOOK_URL env var)

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
    const name = extractField(answers, "short_text") || extractField(answers, "long_text");
    const phone = extractField(answers, "phone_number");

    const payload = {
      gclid,
      email,
      name,
      phone,
      submitted_at,
      form_id: form_response.form_id,
      conversion_name: "SmartSpace Lead",
      conversion_time: new Date(submitted_at).toISOString(),
    };

    // 1. Post to Zapier Tables
    const tablesId = process.env.ZAPIER_TABLES_ID;
    const tablesSecret = process.env.ZAPIER_TABLES_SECRET;
    if (tablesId && tablesSecret) {
      await fetch(`https://tables.zapier.com/api/v1/tables/${tablesId}/records/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tablesSecret}`,
        },
        body: JSON.stringify({ data: payload }),
      });
    }

    // 2. Optional generic Zapier webhook
    const zapierUrl = process.env.ZAPIER_TYPEFORM_WEBHOOK_URL;
    if (zapierUrl) {
      await fetch(zapierUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (gclid) {
      console.log(`[typeform] gclid=${gclid} email=${email} at ${submitted_at}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[typeform webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
