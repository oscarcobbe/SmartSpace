/**
 * The review request, the morning after an installation.
 *
 * Runs every morning. Sends only when Nigel has approved the email in Sign-off
 * and chosen "the morning after the installation"; if he chose to send it when
 * he marks an enquiry Installed, this run does nothing and the CRM sends it
 * instead. Yesterday's installations come from src/lib/booking/upcoming.ts
 * (Calendly's and Google Calendar's; cancelled ones are not read, so they are
 * not asked), and crm_message_log makes sure a customer is asked once.
 */
import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/cron/auth";
import { approval } from "@/lib/signoff/state";
import { sendReviewRequest } from "@/lib/email/send-customer";
import { dublinDay } from "@/lib/calendly-events";
import { visitsBetween } from "@/lib/booking/upcoming";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await approval("email:review-request");
  if (!gate.approved) return NextResponse.json({ ok: true, held: true, message: `Not sent: ${gate.reason}` });
  if (gate.choice !== "next-morning") {
    return NextResponse.json({ ok: true, held: true, message: "Approved to send when an enquiry is marked Installed, not from this job." });
  }

  const { dateStr, startIso, endIso } = dublinDay(-1);
  const outcomes: string[] = [];
  const { visits, problems } = await visitsBetween(startIso, endIso);
  for (const v of visits.filter((x) => !x.consultation)) {
    if (!v.email) {
      outcomes.push(`${v.key}: no customer email`);
      continue;
    }
    const r = await sendReviewRequest({ when: "next-morning", ref: v.key, name: v.name, email: v.email, product: v.product || "installation" });
    outcomes.push(`${v.key}: ${r.outcome}`);
  }
  if (problems.length) {
    console.error("[cron/review-requests] read problems:", problems);
    return NextResponse.json({ ok: false, date: dateStr, error: problems.join("; "), outcomes }, { status: 502 });
  }
  console.log("[cron/review-requests]", dateStr, outcomes.join("; "));
  return NextResponse.json({ ok: true, date: dateStr, outcomes });
}
