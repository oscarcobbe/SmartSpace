/**
 * Sending the new customer messages, each only once it is signed off.
 *
 * Every function here asks approval() first and sends nothing when the answer
 * is anything but a current approval. The review request also writes
 * crm_message_log before it returns, so a cron that runs twice, or an
 * installation marked finished twice, sends once.
 */
import { Resend } from "resend";
import { crm } from "@/lib/crm/db";
import { approval, SIGNOFF_SITE } from "@/lib/signoff/state";
import { alertTo, BUSINESS_EMAIL } from "@/lib/business-constants";
import { TIME_SLOTS } from "@/lib/calendly";
import { consultationBooked, reviewRequest } from "./customer";

export type SendOutcome = { ok: boolean; outcome: string };

function mailer(): { resend: Resend; from: string } | null {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return key && from ? { resend: new Resend(key), from } : null;
}

export function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** The free consultation confirmation, from both booking routes. */
export async function sendConsultationConfirmation(d: {
  name: string;
  email: string;
  dateIso: string;
  slotValue: string;
  address?: string | null;
}): Promise<SendOutcome> {
  const ok = await approval("email:consultation-booked");
  if (!ok.approved) return { ok: true, outcome: `not sent, not signed off: ${ok.reason}` };
  const m = mailer();
  if (!m) return { ok: false, outcome: "not sent: email is not configured" };
  const slot = TIME_SLOTS.find((s) => s.value === d.slotValue)?.label ?? d.slotValue;
  const mail = consultationBooked({ name: d.name, dateLabel: longDate(d.dateIso), slot, address: d.address || undefined });
  const res = await m.resend.emails.send({
    from: m.from,
    to: [d.email],
    replyTo: alertTo(),
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  return res.error ? { ok: false, outcome: `refused: ${JSON.stringify(res.error).slice(0, 200)}` } : { ok: true, outcome: "sent" };
}

async function alreadySent(kind: string, ref: string): Promise<boolean> {
  const rows = await crm<{ id: string }[]>(
    `crm_message_log?site=eq.${SIGNOFF_SITE}&kind=eq.${kind}&ref=eq.${encodeURIComponent(ref)}&channel=eq.email&select=id&limit=1`,
  );
  return Boolean(rows?.length);
}

/**
 * The follow-up with the Google review link, for one installation.
 * `when` says which path is asking, and only the path Nigel chose may send.
 */
export async function sendReviewRequest(d: {
  when: "next-morning" | "marked-finished";
  ref: string;
  name: string;
  email: string;
  product: string;
}): Promise<SendOutcome> {
  const ok = await approval("email:review-request");
  if (!ok.approved) return { ok: true, outcome: `not sent, not signed off: ${ok.reason}` };
  if (ok.choice !== d.when) return { ok: true, outcome: "not sent: signed off for the other timing" };
  const m = mailer();
  if (!m) return { ok: false, outcome: "not sent: email is not configured" };
  if (await alreadySent("review-request", d.ref)) return { ok: true, outcome: "already sent" };

  const mail = reviewRequest({ name: d.name, product: d.product.replace(/\s*\+\s*install(ation)?$/i, "").trim() || "installation" });
  const res = await m.resend.emails.send({
    from: m.from,
    to: [d.email],
    replyTo: BUSINESS_EMAIL,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  if (res.error) return { ok: false, outcome: `refused: ${JSON.stringify(res.error).slice(0, 200)}` };
  await crm("crm_message_log", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      site: SIGNOFF_SITE,
      kind: "review-request",
      ref: d.ref,
      channel: "email",
      to_address: d.email,
      provider_id: res.data?.id ?? null,
    }),
  });
  return { ok: true, outcome: "sent" };
}
