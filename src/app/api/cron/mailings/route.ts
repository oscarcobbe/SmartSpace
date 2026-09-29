/**
 * The weekday batch for mailings to past customers.
 *
 * Sends nothing unless a mailing has been started in the CRM, its email is
 * approved in Sign-off as it now reads, the sending address and unsubscribe
 * signing are set up, and each recipient passes the rules in
 * src/lib/email/mailing-rules.ts. See runDailyBatch.
 */
import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/cron/auth";
import { runDailyBatch } from "@/lib/email/mailings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const out = await runDailyBatch();
    console.log("[cron/mailings]", JSON.stringify(out));
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    console.error("[cron/mailings] failed:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
