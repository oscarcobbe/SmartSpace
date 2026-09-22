/**
 * The cookie answers enquirers gave, for the offline conversion upload.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * Most Smart Space jobs are paid by payment link or invoice, weeks after the
 * enquiry. Google will not count those sales for a customer in Ireland without
 * a consent signal, and the payment has no browser to give one. The enquiry
 * did: src/lib/ad-consent.ts keeps each enquirer's banner answer in
 * crm_ad_consent. The upload lives in the portal, a different deployment, so it
 * reads them here over HTTP with the admin key, the same way it reads the
 * payment-link references.
 *
 * Hashes and answers only. No names, no addresses, no emails in the clear.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { crm } from "@/lib/crm/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

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

  try {
    /* A banner answer lasts twelve months, so nothing older can speak for a
       payment made now. */
    const since = new Date(Date.now() - 400 * 86_400_000).toISOString();
    const rows = await crm<{ email_hash: string | null; phone_hash: string | null; decision: string; decided_at: string; site: string }[]>(
      `crm_ad_consent?select=email_hash,phone_hash,decision,decided_at,site&decided_at=gte.${since}&order=decided_at.desc&limit=10000`,
    );
    const answers = (rows ?? [])
      .filter((r) => (r.decision === "granted" || r.decision === "denied") && (r.email_hash || r.phone_hash))
      .map((r) => ({ emailHash: r.email_hash, phoneHash: r.phone_hash, decision: r.decision, at: r.decided_at, site: r.site }));
    return NextResponse.json({ answers, count: answers.length });
  } catch (err) {
    /* A failure is reported, not dressed as "nobody answered", which would
       send every row as unspecified and look identical from outside. */
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not read the answers" },
      { status: 502 },
    );
  }
}
