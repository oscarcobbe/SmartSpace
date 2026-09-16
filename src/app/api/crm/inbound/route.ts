/**
 * Where a lead lands.
 *
 * src/lib/crm.ts has been signing and POSTing leads from four places since
 * before today: the contact form, the booking flow, the free checkout and the
 * Stripe webhook. It has been a no-op the whole time, because CRM_INBOUND_URL
 * was never set and the function returns early when it is missing. So the
 * capture was built, wired into every path that matters, and had nowhere to go.
 *
 * This is the somewhere. Pointing CRM_INBOUND_URL at it turns four dormant
 * call sites into a working pipeline with no change to any of them.
 *
 * The signature is the same scheme sendToCrm already uses: sha256 HMAC of the
 * exact body bytes, sent as X-CRM-Signature. Compared in constant time, because
 * a plain === returns on the first wrong byte and leaks the correct prefix to
 * anybody willing to measure.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { crm, upsertContact, logActivity, crmConfigured, type Site } from "@/lib/crm/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signatureOk(secret: string, body: string, given: string | null): boolean {
  if (!given) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.CRM_HMAC_SECRET?.trim();
  if (!secret || !crmConfigured()) {
    /* 404, not 500. An endpoint that answers "misconfigured" tells an
       unauthenticated caller that it exists and what it is for. */
    return new NextResponse("Not found", { status: 404 });
  }

  const raw = await request.text();
  if (!signatureOk(secret, raw, request.headers.get("x-crm-signature"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Unparseable" }, { status: 400 }); }

  /* The two senders spell the brand differently: this site sends "smart-space"
     and SmartCare Living's api/_lib/crm.js sends "smartcare-living", which is
     not the enum value. Matching on the exact string filed every SmartCare
     Living lead under Smart Space and nothing would ever have complained, so
     the comparison drops everything that is not a letter first. */
  const brand = String(payload.brand ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (brand && brand !== "smartspace" && brand !== "smartcareliving") {
    return NextResponse.json({ error: "Unknown brand" }, { status: 400 });
  }
  const site: Site = brand === "smartcareliving" ? "smartcareliving" : "smart-space";
  const str = (k: string) => (typeof payload[k] === "string" ? (payload[k] as string) : null);

  try {
    const contactId = await upsertContact(site, {
      email: str("email"), phone: str("phone"), name: str("name"),
      first_name: str("first_name"), last_name: str("last_name"),
      address_line1: str("address_line1"), address_line2: str("address_line2"),
      city: str("city"), county: str("county"), eircode: str("eircode"),
    });

    /* A Stripe session id is what makes a paid order distinct from the enquiry
       that preceded it, and the unique index on it is what stops the webhook
       firing twice creating two orders for one payment. */
    const stripeId = str("stripe_session_id");
    if (stripeId) {
      const existing = await crm<{ id: string }[]>(
        `crm_leads?stripe_session_id=eq.${encodeURIComponent(stripeId)}&select=id&limit=1`,
      );
      if (existing?.length) return NextResponse.json({ ok: true, deduped: existing[0].id });
    }

    const made = await crm<{ id: string }[]>("crm_leads", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        site,
        contact_id: contactId,
        source: str("source") ?? "unknown",
        source_detail: str("source_detail"),
        message: str("message"),
        value_cents: typeof payload.value_cents === "number" ? payload.value_cents : null,
        utm_source: str("utm_source"), utm_medium: str("utm_medium"),
        utm_campaign: str("utm_campaign"), utm_term: str("utm_term"),
        utm_content: str("utm_content"), gclid: str("gclid"),
        referrer: str("referrer"),
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        custom: typeof payload.custom === "object" && payload.custom ? payload.custom : {},
        stripe_session_id: stripeId,
        paid_at: stripeId ? new Date().toISOString() : null,
        status: stripeId ? "won" : "new",
      }),
    });

    const leadId = made?.[0]?.id ?? null;
    await logActivity(site, {
      lead_id: leadId, contact_id: contactId,
      kind: "lead_created",
      summary: `${str("source") ?? "Enquiry"}${str("source_detail") ? ` (${str("source_detail")})` : ""}`,
      detail: { gclid: str("gclid"), utm_campaign: str("utm_campaign") },
      actor: "website",
    });

    return NextResponse.json({ ok: true, lead: leadId });
  } catch (err) {
    console.error("[crm/inbound]", err instanceof Error ? err.message : err);
    /* 500 on purpose: sendToCrm logs a non-2xx and moves on, so the visitor is
       unaffected, and a real error here should be visible rather than swallowed
       into a cheerful 200. */
    return NextResponse.json({ error: "Could not record the lead" }, { status: 500 });
  }
}
