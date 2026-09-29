"use server";

/**
 * Nigel's decision on one sign-off item.
 *
 * The decision is recorded against the fingerprint of the content as it is
 * now, so what he approved is exactly what sends. FourWinds is told each
 * time, because a request for changes is work for us and an approval switches
 * something on.
 */
import { Resend } from "resend";
import { requireSession } from "@/lib/crm/session";
import { recordDecision } from "@/lib/signoff/state";
import { itemById } from "@/lib/signoff/items";
import { SIGNOFF_NOTIFY_TO } from "@/lib/business-constants";
import { done, failed, writeFailed, type ActionState } from "../action-state";

async function tellFourWinds(subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return;
  try {
    const r = await new Resend(key).emails.send({ from, to: [SIGNOFF_NOTIFY_TO], subject, text });
    if (r.error) console.error("[signoff] notification refused:", r.error);
  } catch (err) {
    console.error("[signoff] notification threw:", err);
  }
}

export async function decide(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = requireSession();
  const itemId = String(form.get("item") ?? "");
  const item = itemById(itemId);
  if (!item) return failed("That item is not on the sign-off list.");

  const decision = form.get("decision");
  if (decision !== "approved" && decision !== "changes") return failed("Choose whether to approve it or ask for changes.");
  const choice = form.get("choice") ? String(form.get("choice")) : null;
  const comment = String(form.get("comment") ?? "").trim().slice(0, 2000);
  if (decision === "approved" && item.choices?.length && !choice) return failed("Pick one of the options, then approve.");
  if (decision === "changes" && !comment) return failed("Say what should change, so it can be done.");

  try {
    await recordDecision({ itemId, decision, choice, comment: comment || null, by: session.email });
  } catch (err) {
    return writeFailed("The decision", err);
  }

  const picked = choice ? item.choices?.find((c) => c.id === choice)?.label : null;
  await tellFourWinds(
    decision === "approved" ? `Signed off: ${item.title}` : `Changes asked for: ${item.title}`,
    [
      `${session.email} ${decision === "approved" ? "approved" : "asked for changes to"}: ${item.title}`,
      picked ? `Choice: ${picked}` : "",
      comment ? `Note: ${comment}` : "",
      "",
      "https://smart-space.ie/crm/signoff",
    ]
      .filter((l, i) => l || i === 3)
      .join("\n"),
  );

  return done(decision === "approved" ? "Approved." : "Sent back with your note.");
}
