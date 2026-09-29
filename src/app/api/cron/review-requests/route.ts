/**
 * The review request, the morning after an installation.
 *
 * Runs every morning. Sends only when Nigel has approved the email in Sign-off
 * and chosen "the morning after the installation"; if he chose to send it when
 * he marks an enquiry Installed, this run does nothing and the CRM sends it
 * instead. Yesterday's installations come from Calendly (cancelled ones are no
 * longer active, so they are not asked), and crm_message_log makes sure a
 * customer is asked once.
 */
import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/cron/auth";
import { approval } from "@/lib/signoff/state";
import { sendReviewRequest } from "@/lib/email/send-customer";
import { activeEventsBetween, calendlyUserUri, dublinDay, firstInvitee, isConsultation, productFrom } from "@/lib/calendly-events";

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

  const token = process.env.CALENDLY_PERSONAL_TOKEN;
  if (!token) return NextResponse.json({ error: "Calendly is not configured" }, { status: 500 });

  const { dateStr, startIso, endIso } = dublinDay(-1);
  const outcomes: string[] = [];
  try {
    const user = await calendlyUserUri(token);
    const events = (await activeEventsBetween(token, user, startIso, endIso)).filter((e) => !isConsultation(e));
    for (const e of events) {
      const inv = await firstInvitee(token, e.uri).catch(() => undefined);
      if (!inv?.email) {
        outcomes.push(`${e.uri}: no invitee email`);
        continue;
      }
      const product = productFrom(inv.questions_and_answers) || "installation";
      const r = await sendReviewRequest({ when: "next-morning", ref: e.uri, name: inv.name || "", email: inv.email, product });
      outcomes.push(`${e.uri}: ${r.outcome}`);
    }
  } catch (err) {
    console.error("[cron/review-requests] failed:", err);
    return NextResponse.json({ ok: false, date: dateStr, error: err instanceof Error ? err.message : String(err), outcomes }, { status: 502 });
  }
  console.log("[cron/review-requests]", dateStr, outcomes.join("; "));
  return NextResponse.json({ ok: true, date: dateStr, outcomes });
}
