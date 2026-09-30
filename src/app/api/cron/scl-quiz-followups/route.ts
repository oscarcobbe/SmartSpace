/**
 * SmartCare Living's quiz follow-ups, once a day.
 *
 * Who: people who took the quiz, gave an email and ticked "Send me a few
 * emails about my setup" (custom.followups), in the last twelve days. Not an
 * urgent result (Nigel is already ringing), not stopped from the email's own
 * link, not marked red, and not booked, quoted, won, lost or spam.
 *
 * What: email 2 on day 2, email 3 on day 5 (the stick-figure one, or the
 * small-things one for an early-stage setup), email 4 on day 10. Each only
 * once Nigel has approved it in Sign-off, one per person per run, and once
 * ever (crm_message_log). Rendered by smartcareliving.ie for the person
 * (lib/email/scl-catalogue sclRender), sent from the same address as the
 * site's own emails.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { cronAuthorised } from "@/lib/cron/auth";
import { crm, logActivity } from "@/lib/crm/db";
import { sclItems, sclApprovals, sclItemId, SCL_SITE } from "@/lib/signoff/scl";
import { sclRender } from "@/lib/email/scl-catalogue";
import { stopToken } from "@/lib/crm/scl-link";
import { lightOf } from "@/lib/crm/labels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const FROM = "Nigel at SmartCare Living <nigel@bookings.smart-space.ie>";
const REPLY_TO = "nigel@smart-space.ie";
const DAY = 86400000;
const STEPS = [
  { step: "visit", day: 2 },
  { step: "how", day: 5 },
  { step: "close", day: 10 },
];
const CLOSED = ["booked", "quoted", "won", "lost", "spam", "installed"];

type Lead = { id: string; contact_id: string | null; status: string; custom: Record<string, unknown> | null; booked_for: string | null; created_at: string; source_detail: string | null };

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Email is not configured" }, { status: 500 });

  const { items, problem } = await sclItems();
  if (problem) return NextResponse.json({ ok: true, held: true, message: `Not sent: ${problem}` });
  const { states } = await sclApprovals(items);
  const approved = (entryId: string) => states.get(sclItemId(entryId))?.approved === true;

  const since = new Date(Date.now() - 12 * DAY).toISOString();
  const leads = (await crm<Lead[]>(
    `crm_leads?site=eq.${SCL_SITE}&source=eq.quiz&created_at=gte.${since}&select=id,contact_id,status,custom,booked_for,created_at,source_detail&order=created_at.asc`,
  )) ?? [];

  const resend = new Resend(key);
  const outcomes: string[] = [];
  for (const l of leads) {
    const c = l.custom ?? {};
    const tier = String(c.risk_label || l.source_detail || "");
    if (c.followups !== true) continue;
    if (c.followups_stopped) { outcomes.push(`${l.id}: stopped`); continue; }
    if (tier === "Priority Callback") continue;
    if (lightOf(c) === "red") { outcomes.push(`${l.id}: marked red`); continue; }
    if (CLOSED.includes(l.status) || l.booked_for) { outcomes.push(`${l.id}: ${l.booked_for ? "booked" : l.status}`); continue; }

    const age = Math.floor((Date.now() - Date.parse(l.created_at)) / DAY);
    const due = STEPS.filter((s) => age >= s.day && age < s.day + 3).pop();
    if (!due) continue;
    const entryId = due.step === "how" ? (tier === "Early-Stage Setup" ? "quiz-how-early" : "quiz-how") : `quiz-${due.step}`;
    if (!approved(entryId)) { outcomes.push(`${l.id}: ${entryId} not signed off`); continue; }

    const sent = await crm<{ id: string }[]>(
      `crm_message_log?site=eq.${SCL_SITE}&kind=eq.${entryId}&ref=eq.${l.id}&channel=eq.email&select=id&limit=1`,
    );
    if (sent?.length) continue;

    const [person] = l.contact_id
      ? (await crm<{ email: string | null; first_name: string | null; name: string | null }[]>(
          `crm_contacts?site=eq.${SCL_SITE}&id=eq.${l.contact_id}&select=email,first_name,name&limit=1`,
        )) ?? []
      : [];
    if (!person?.email) { outcomes.push(`${l.id}: no email`); continue; }

    const stopUrl = `https://www.smartcareliving.ie/stop-emails?l=${l.id}&s=${stopToken(l.id)}`;
    try {
      const mail = await sclRender(due.step, {
        firstName: person.first_name || String(person.name || "").split(/\s+/)[0] || "there",
        tier,
        persona: typeof c.persona === "string" ? c.persona : "parent",
        submittedAt: l.created_at,
        stopUrl,
      });
      const res = await resend.emails.send({
        from: FROM,
        to: [person.email],
        replyTo: REPLY_TO,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: { "List-Unsubscribe": `<${stopUrl}>` },
      });
      if (res.error) { outcomes.push(`${l.id}: refused ${JSON.stringify(res.error).slice(0, 120)}`); continue; }
      await crm("crm_message_log", {
        method: "POST",
        prefer: "return=minimal",
        body: JSON.stringify({ site: SCL_SITE, kind: entryId, ref: l.id, channel: "email", to_address: person.email, provider_id: res.data?.id ?? null }),
      });
      await logActivity(SCL_SITE, { lead_id: l.id, contact_id: l.contact_id, kind: "email", summary: `Sent the quiz follow-up: ${mail.subject}`, actor: "system", detail: { entry: entryId } });
      outcomes.push(`${l.id}: sent ${entryId}`);
    } catch (err) {
      outcomes.push(`${l.id}: failed ${err instanceof Error ? err.message.slice(0, 120) : "unknown"}`);
    }
  }
  console.log("[cron/scl-quiz-followups]", outcomes.join("; ") || "nothing due");
  return NextResponse.json({ ok: true, outcomes });
}
