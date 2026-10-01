/**
 * Nigel's green and amber enquiries, for the upload that tells Google which of
 * its leads were good.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * Google counts every form as a lead, the family ready to buy and the one that
 * was never going to. Nigel knows which is which after the call and marks it in
 * the CRM (custom.lead_light, set by setLeadLight in
 * src/app/crm/contacts/actions.ts). On 1 October 2026 he asked that Google get
 * that feedback. The upload lives in the portal, a different deployment, so it
 * reads the marks here over HTTP with the admin key, the same way it reads the
 * cookie answers (../ad-consent/route.ts).
 *
 * Marks, click ids and hashes only. No names, no addresses, no emails in the
 * clear. Smart Space's cookie answer is looked up here, from crm_ad_consent.
 * SmartCare Living's is on its own leads sheet, which the portal reads itself,
 * so for those leads `consent` is null here and means "not ours to say".
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { crm, crmConfigured } from "@/lib/crm/db";
import { emailHash, phoneHash } from "@/lib/ad-consent";
import { lightOf } from "@/lib/crm/labels";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

type LeadRow = {
  id: string; site: string; created_at: string; gclid: string | null;
  contact_id: string | null; custom: Record<string, unknown> | null;
};
type ContactRow = { id: string; email: string | null; phone: string | null };
type AnswerRow = { email_hash: string | null; phone_hash: string | null; decision: string; decided_at: string };

export async function GET(request: Request) {
  const adminKey = process.env.ADMIN_KEY?.trim();
  if (!adminKey) {
    return NextResponse.json({ error: "ADMIN_KEY is not set on this deployment." }, { status: 500 });
  }
  /* Header only, for the reason the payment-link route gives. */
  const auth = request.headers.get("authorization") ?? "";
  const offered = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!offered || !safeEqual(offered, adminKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /* crm() answers null when it is not configured, which would read as "Nigel
     has marked nothing" and look identical from outside. */
  if (!crmConfigured()) {
    return NextResponse.json({ error: "The CRM database is not configured on this deployment." }, { status: 500 });
  }

  try {
    /* Google takes a click conversion up to 90 days after the click, so an
       enquiry older than that cannot be sent whatever its mark. */
    const since = new Date(Date.now() - 95 * 86_400_000).toISOString();
    const leads = (await crm<LeadRow[]>(
      `crm_leads?select=id,site,created_at,gclid,contact_id,custom&custom->>lead_light=in.(green,amber)` +
      `&created_at=gte.${since}&order=created_at.desc&limit=2000`,
    )) ?? [];

    const contactIds = Array.from(new Set(leads.map((l) => l.contact_id).filter((id): id is string => Boolean(id))));
    const contacts = new Map<string, ContactRow>();
    for (let i = 0; i < contactIds.length; i += 100) {
      const rows = (await crm<ContactRow[]>(
        `crm_contacts?select=id,email,phone&id=in.(${contactIds.slice(i, i + 100).join(",")})`,
      )) ?? [];
      for (const c of rows) contacts.set(c.id, c);
    }

    /* Smart Space's cookie answers. The newest for a person wins, because
       somebody can change their mind, as in the paid-job feed. */
    const answers = (await crm<AnswerRow[]>(
      "crm_ad_consent?select=email_hash,phone_hash,decision,decided_at&site=eq.smart-space&order=decided_at.desc&limit=10000",
    )) ?? [];
    const newest = new Map<string, { decision: "granted" | "denied"; at: number }>();
    for (const a of answers) {
      const at = Date.parse(a.decided_at);
      if ((a.decision !== "granted" && a.decision !== "denied") || !Number.isFinite(at)) continue;
      for (const k of [a.email_hash ? `e:${a.email_hash}` : "", a.phone_hash ? `p:${a.phone_hash}` : ""]) {
        const prev = k ? newest.get(k) : undefined;
        if (k && (!prev || at > prev.at)) newest.set(k, { decision: a.decision, at });
      }
    }

    const out = leads.flatMap((l) => {
      const light = lightOf(l.custom);
      if (light !== "green" && light !== "amber") return [];
      const c = l.contact_id ? contacts.get(l.contact_id) : undefined;
      const e = emailHash(c?.email);
      const p = phoneHash(c?.phone);
      const byEmail = e ? newest.get(`e:${e}`) : undefined;
      const byPhone = p ? newest.get(`p:${p}`) : undefined;
      const answer = byEmail && byPhone ? (byPhone.at > byEmail.at ? byPhone : byEmail) : byEmail ?? byPhone;
      const ratedAt = Date.parse(String(l.custom?.lead_light_at ?? ""));
      return [{
        id: l.id,
        site: l.site,
        light,
        ratedAt: Number.isFinite(ratedAt) ? new Date(ratedAt).toISOString() : null,
        createdAt: l.created_at,
        gclid: l.gclid || null,
        emailHash: e,
        phoneHash: p,
        consent: l.site === "smart-space" ? answer?.decision ?? null : null,
      }];
    });
    return NextResponse.json({ leads: out, count: out.length });
  } catch (err) {
    /* A failure is reported, not dressed as "nothing marked". */
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not read the marked enquiries" },
      { status: 502 },
    );
  }
}
