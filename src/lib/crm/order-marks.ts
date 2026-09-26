/**
 * What somebody told the CRM that its sources do not know.
 *
 * ── THE GAP ──────────────────────────────────────────────────────
 *
 * Orders and the diary are read straight from Stripe and Calendly, and neither
 * can be told anything back. A job cancelled on the phone leaves the payment
 * exactly where it was: Stripe still says paid, the money is still in the
 * account, and the row goes on showing as live work and sitting in the diary.
 *
 * That is not hypothetical. Daniel Robinson paid 229 euro on 18 August, was
 * cancelled a couple of days ago, and was never refunded. Stripe had no idea,
 * so neither did the CRM, and the client saw a job in his week that is not
 * happening. A refund filter would not have caught it, because there is no
 * refund.
 *
 * So the CRM keeps its own small note against the feed's row id. It never
 * edits Stripe and never edits Calendly: it records what it was told and shows
 * it beside what they say.
 */
import { unlessWrongKey, crm, type Site } from "./db";

export type MarkState = "cancelled" | "done";

export interface OrderMark {
  order_ref: string;
  state: MarkState;
  note: string | null;
  marked_by: string | null;
  marked_at: string;
}

/**
 * A feed row has no stable id of its own, so this is what we key on.
 *
 * Stripe orders carry a real reference. Calendly rows often do not, and on a
 * paid order the field arrives as the whole booking written out. So the key
 * falls back to who and when, which is stable across re-fetches for the same
 * job and is what a person would use to identify it anyway.
 */
export function orderKey(lead: { orderId?: string; email?: string; phone?: string; bookingDate?: string; date?: string }): string {
  const ref = String(lead.orderId ?? "").trim();
  if (ref && ref !== "-" && !ref.includes("|") && ref.length <= 80) return ref;
  const who = String(lead.email ?? "").trim().toLowerCase()
    || String(lead.phone ?? "").replace(/[^\d]/g, "").slice(-9);
  const when = String(lead.bookingDate ?? lead.date ?? "").trim();
  return `k:${who}|${when}`;
}

/**
 * The marks, and a problem when they could not be read.
 *
 * A failed read used to come back as an empty map, which is indistinguishable
 * from "nothing is cancelled": every job cancelled by phone reappeared in the
 * diary as somewhere to be, with nothing on screen to say why.
 */
export type Marks = Map<string, OrderMark> & { problem?: string };

export async function fetchMarks(site: Site): Promise<Marks> {
  const out: Marks = new Map<string, OrderMark>();
  try {
    const rows = await unlessWrongKey(await crm<OrderMark[]>(
      `crm_order_marks?site=eq.${site}&select=order_ref,state,note,marked_by,marked_at`,
    ));
    for (const r of rows ?? []) out.set(r.order_ref, r);
  } catch (err) {
    out.problem = `Which orders were marked cancelled or done could not be read (${err instanceof Error ? err.message.slice(0, 100) : "no answer"}), so a cancelled booking may still show here.`;
  }
  return out;
}

export async function markOrder(
  site: Site,
  orderRef: string,
  state: MarkState | null,
  note: string | null,
  by: string,
): Promise<void> {
  if (state === null) {
    /* Unmarking deletes rather than writing a third state, so a row that is
       simply live has nothing recorded against it and cannot drift. */
    await crm(`crm_order_marks?site=eq.${site}&order_ref=eq.${encodeURIComponent(orderRef)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
    return;
  }
  await crm("crm_order_marks?on_conflict=site,order_ref", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify([{ site, order_ref: orderRef, state, note, marked_by: by }]),
  });
}
