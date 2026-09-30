/**
 * smartcareliving.ie asks, before it sends a gated email: is this one, exactly
 * as I would send it, approved? It passes the entry id and the fingerprint it
 * took from its own render; the answer is approved only when Nigel's newest
 * decision approved that same fingerprint. Signed (lib/crm/scl-link daily),
 * and it fails closed.
 */
import { NextResponse } from "next/server";
import { verifyDaily } from "@/lib/crm/scl-link";
import { sclApprovalFor } from "@/lib/signoff/scl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entry = url.searchParams.get("entry") ?? "";
  const hash = url.searchParams.get("hash") ?? "";
  if (!/^[a-z0-9-]{1,40}$/.test(entry) || !/^[0-9a-f]{16}$/.test(hash)) {
    return NextResponse.json({ approved: false, reason: "Bad request." }, { status: 400 });
  }
  if (!verifyDaily(`signoff-status:${entry}:${hash}`, request.headers.get("x-crm-signature"))) {
    return NextResponse.json({ approved: false, reason: "Unsigned." }, { status: 401 });
  }
  const a = await sclApprovalFor(entry, hash);
  return NextResponse.json({ approved: a.approved, state: a.state, reason: a.reason }, { headers: { "Cache-Control": "no-store" } });
}
