/**
 * Mailings to past customers: the records, and the daily batch that sends them.
 *
 * The one place in this repository that sends email to people who did not
 * just ask for something, so every message passes four gates, each of which
 * fails closed: the template is approved in Sign-off in its current wording;
 * the sending address is set and is not the receipts domain; the recipient
 * has not unsubscribed (crm_outreach_blocks, the permanent opt-out list); and
 * the recipient's basis covers this template on this day (mailing-rules.ts).
 */
import { Resend } from "resend";
import { crm, crmConfigured } from "@/lib/crm/db";
import { approval, SIGNOFF_SITE } from "@/lib/signoff/state";
import { networkDiagnosisA, networkDiagnosisB, smartGuardianAnnouncement, type Recipient } from "./marketing";
import type { Email } from "./customer";
import {
  MAILING_TEMPLATES,
  marketingSenderProblem,
  recipientVerdict,
  templateById,
  unsubscribeToken,
  type Basis,
  type MailingTemplate,
} from "./mailing-rules";

export type MailingStatus = "draft" | "sending" | "paused" | "done";
export type RecipientStatus = "queued" | "sent" | "skipped" | "failed";

export interface Mailing {
  id: string;
  template: MailingTemplate["id"];
  status: MailingStatus;
  daily_limit: number;
  created_by: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface MailingSummary extends Mailing {
  counts: Record<RecipientStatus, number>;
}

const RENDER: Record<MailingTemplate["id"], (r: Recipient) => Email> = {
  "network-diagnosis-a": networkDiagnosisA,
  "network-diagnosis-b": networkDiagnosisB,
  "smartguardian-announce": smartGuardianAnnouncement,
};

const SITE_URL = "https://smart-space.ie";

export const unsubscribeUrl = (email: string, secret: string) =>
  `${SITE_URL}/api/email/unsubscribe?t=${encodeURIComponent(unsubscribeToken(email, secret))}`;

/** What must be true before any mailing can send, as sentences. Empty means ready. */
export function readiness(): string[] {
  const out: string[] = [];
  if (!crmConfigured()) out.push("The CRM is not configured on this deployment.");
  const sender = marketingSenderProblem(process.env.MARKETING_FROM_EMAIL, process.env.RESEND_FROM_EMAIL);
  if (sender) out.push(sender);
  if (!process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim()) out.push("The unsubscribe links cannot be signed yet (EMAIL_UNSUBSCRIBE_SECRET).");
  if (!process.env.RESEND_API_KEY?.trim()) out.push("No email provider key is set (RESEND_API_KEY).");
  return out;
}

export async function listMailings(): Promise<MailingSummary[]> {
  const mailings =
    (await crm<Mailing[]>(`crm_mailings?site=eq.${SIGNOFF_SITE}&select=*&order=created_at.desc&limit=50`)) ?? [];
  if (!mailings.length) return [];
  const rows =
    (await crm<{ mailing_id: string; status: RecipientStatus }[]>(
      `crm_mailing_recipients?mailing_id=in.(${mailings.map((m) => m.id).join(",")})&select=mailing_id,status&limit=20000`,
    )) ?? [];
  return mailings.map((m) => {
    const counts: Record<RecipientStatus, number> = { queued: 0, sent: 0, skipped: 0, failed: 0 };
    for (const r of rows) if (r.mailing_id === m.id) counts[r.status] += 1;
    return { ...m, counts };
  });
}

export async function createMailing(template: string, by: string): Promise<void> {
  if (!templateById(template)) throw new Error("That is not one of the mailing emails.");
  await crm("crm_mailings", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ site: SIGNOFF_SITE, template, created_by: by }),
  });
}

export async function setMailingStatus(id: string, status: "sending" | "paused"): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "sending") patch.started_at = new Date().toISOString();
  await crm(`crm_mailings?id=eq.${encodeURIComponent(id)}&site=eq.${SIGNOFF_SITE}&status=neq.done`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify(patch),
  });
}

export async function addRecipients(
  mailingId: string,
  rows: { email: string; firstName: string | null; purchased: string | null }[],
  basis: Basis,
  source: string,
  by: string,
): Promise<{ added: number; already: number }> {
  const existing =
    (await crm<{ email: string }[]>(`crm_mailing_recipients?mailing_id=eq.${encodeURIComponent(mailingId)}&select=email&limit=20000`)) ?? [];
  const seen = new Set(existing.map((e) => e.email.toLowerCase()));
  const fresh: typeof rows = [];
  for (const r of rows) {
    const e = r.email.toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    fresh.push(r);
  }
  for (let i = 0; i < fresh.length; i += 500) {
    await crm("crm_mailing_recipients", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify(
        fresh.slice(i, i + 500).map((r) => ({
          mailing_id: mailingId,
          email: r.email.toLowerCase(),
          first_name: r.firstName,
          basis,
          last_purchase_on: r.purchased,
          source: source || null,
          added_by: by,
        })),
      ),
    });
  }
  return { added: fresh.length, already: rows.length - fresh.length };
}

const dublinDate = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

async function optedOut(): Promise<Set<string>> {
  const rows = (await crm<{ email: string }[]>("crm_outreach_blocks?select=email&limit=20000")) ?? [];
  return new Set(rows.map((r) => r.email.trim().toLowerCase()));
}

export interface BatchReport {
  mailing: string;
  sent: number;
  skipped: number;
  failed: number;
  note: string | null;
}

/** One day's batch for every mailing that is sending. Called by the weekday cron. */
export async function runDailyBatch(): Promise<{ ready: string[]; reports: BatchReport[] }> {
  const ready = readiness();
  if (ready.length) return { ready, reports: [] };
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET!.trim();
  const from = process.env.MARKETING_FROM_EMAIL!.trim();
  const resend = new Resend(process.env.RESEND_API_KEY!.trim());
  const today = dublinDate();
  const blocked = await optedOut();

  const sending = (await crm<Mailing[]>(`crm_mailings?site=eq.${SIGNOFF_SITE}&status=eq.sending&select=*`)) ?? [];
  const reports: BatchReport[] = [];

  for (const m of sending) {
    const template = templateById(m.template);
    if (!template) continue;
    const ok = await approval(template.itemId);
    if (!ok.approved) {
      reports.push({ mailing: m.template, sent: 0, skipped: 0, failed: 0, note: `Held: ${ok.reason}` });
      continue;
    }

    const sentToday =
      (await crm<{ id: string }[]>(
        `crm_mailing_recipients?mailing_id=eq.${m.id}&status=eq.sent&sent_at=gte.${today}T00:00:00&select=id&limit=1000`,
      )) ?? [];
    const room = Math.max(0, m.daily_limit - sentToday.length);
    const queue =
      room > 0
        ? (await crm<{ id: string; email: string; first_name: string | null; basis: Basis; last_purchase_on: string | null }[]>(
            `crm_mailing_recipients?mailing_id=eq.${m.id}&status=eq.queued&select=id,email,first_name,basis,last_purchase_on&order=added_at.asc&limit=${room}`,
          )) ?? []
        : [];

    const report: BatchReport = { mailing: m.template, sent: 0, skipped: 0, failed: 0, note: null };
    for (const r of queue) {
      const verdict = recipientVerdict(r, template, today, blocked.has(r.email.toLowerCase()));
      if (!verdict.send) {
        await crm(`crm_mailing_recipients?id=eq.${r.id}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({ status: "skipped", skip_reason: verdict.reason }),
        });
        report.skipped += 1;
        continue;
      }
      const link = unsubscribeUrl(r.email, secret);
      const mail = RENDER[template.id]({ name: r.first_name || "", unsubscribeUrl: link, basis: r.basis });
      try {
        const res = await resend.emails.send({
          from,
          to: [r.email],
          replyTo: "info@smart-space.ie",
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: {
            "List-Unsubscribe": `<${link}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (res.error) throw new Error(JSON.stringify(res.error).slice(0, 300));
        await crm(`crm_mailing_recipients?id=eq.${r.id}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), provider_id: res.data?.id ?? null }),
        });
        report.sent += 1;
      } catch (err) {
        await crm(`crm_mailing_recipients?id=eq.${r.id}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({ status: "failed", failure: err instanceof Error ? err.message.slice(0, 300) : String(err) }),
        });
        report.failed += 1;
      }
    }

    const left = (await crm<{ id: string }[]>(`crm_mailing_recipients?mailing_id=eq.${m.id}&status=eq.queued&select=id&limit=1`)) ?? [];
    if (!left.length && queue.length === 0 && room > 0) {
      await crm(`crm_mailings?id=eq.${m.id}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ status: "done", finished_at: new Date().toISOString() }),
      });
      report.note = "Finished: nobody left to send to.";
    }
    reports.push(report);
  }
  return { ready, reports };
}

export { MAILING_TEMPLATES };
