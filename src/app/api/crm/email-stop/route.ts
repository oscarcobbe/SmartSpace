/**
 * A customer pressed "Stop these emails" in a SmartCare Living follow-up.
 * smartcareliving.ie checks the link's token and posts the lead here, signed
 * (lib/crm/scl-link body). The lead is marked so the daily job sends it
 * nothing more, and the history says so.
 */
import { NextResponse } from "next/server";
import { crm, logActivity } from "@/lib/crm/db";
import { verifyBody } from "@/lib/crm/scl-link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyBody(body, request.headers.get("x-crm-signature"))) {
    return NextResponse.json({ ok: false, error: "Unsigned." }, { status: 401 });
  }
  let lead = "";
  try { lead = String(JSON.parse(body).lead ?? ""); } catch { /* checked below */ }
  if (!UUID.test(lead)) return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  try {
    const [row] = (await crm<{ custom: Record<string, unknown> | null; contact_id: string | null }[]>(
      `crm_leads?site=eq.smartcareliving&id=eq.${lead}&select=custom,contact_id&limit=1`,
    )) ?? [];
    if (!row) return NextResponse.json({ ok: true, note: "No such lead." });
    if (row.custom?.followups_stopped) return NextResponse.json({ ok: true, note: "Already stopped." });
    await crm(`crm_leads?site=eq.smartcareliving&id=eq.${lead}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ custom: { ...(row.custom ?? {}), followups_stopped: true, followups_stopped_at: new Date().toISOString() } }),
    });
    await logActivity("smartcareliving", {
      lead_id: lead, contact_id: row.contact_id, kind: "email", summary: "Asked for no more follow-up emails", actor: "customer", detail: {},
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message.slice(0, 160) : "failed" }, { status: 502 });
  }
}
