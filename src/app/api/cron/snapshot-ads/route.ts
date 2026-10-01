import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runSnapshot } from "@/lib/crm/snapshot";
import { captureAdClicks } from "@/lib/crm/ad-clicks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* Two businesses, two API round trips each, plus Stripe paging. The default
   ten seconds is not enough and a timeout here looks exactly like a quiet day
   in the data. */
export const maxDuration = 60;

/**
 * The daily record of what the advertising cost and what came back.
 *
 * Registered in /vercel.json for 03:10 UTC, which is well after midnight in
 * Dublin so the day being written is finished, and well before anybody opens
 * the CRM.
 *
 * Thirty days each run rather than one. Google restates the last three days
 * routinely and occasionally further back, so re-reading a month keeps the
 * store honest at the cost of one extra query.
 */
function safeBearerEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeBearerEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = Math.min(400, Math.max(1, Number(url.searchParams.get("days") ?? 30) || 30));

  /* Clicks and their keywords: three days nightly. Google keeps them for
     ninety days, so an older stretch can be filled by hand, fifteen days at a
     time to stay inside this function's minute: click_days=15&click_skip=30
     reads the fifteen days before the last thirty. */
  const clickDays = Math.min(15, Math.max(1, Number(url.searchParams.get("click_days") ?? 3) || 3));
  const clickSkip = Math.min(89 - clickDays, Math.max(0, Number(url.searchParams.get("click_skip") ?? 0) || 0));

  const results = await runSnapshot(days);
  const clicks = await captureAdClicks(clickDays, clickSkip);
  const failed = results.filter((r) => !r.ok);

  /* A failed pull returns 500 so Vercel's own cron log shows it red. Silent
     failure is the thing this endpoint exists to prevent. */
  return NextResponse.json(
    { ran: new Date().toISOString(), days, results, clicks },
    { status: failed.length || !clicks.ok ? 500 : 200 },
  );
}
