"use server";

/**
 * Saving a mark from the enquiry email's page.
 *
 * There is no session here: the token is the permission. readMarkToken checks
 * the signature, and the write is scoped to the one enquiry that carries the
 * token's reference on the token's site, so a forged or altered token matches
 * nothing. Only what the page offers can be written: a light, a note, and one
 * of the statuses Nigel moves an enquiry through after a call.
 */
import { currentSession } from "@/lib/crm/session";
import { readMarkToken } from "@/lib/crm/mark-link";
import { applyLeadMark, isLight, isStatus } from "@/lib/crm/lead-mark";
import { done, failed, writeFailed, type ActionState } from "../../action-state";
import { findMarkedLead, MARK_STATUSES } from "./lead";

export async function saveMark(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = readMarkToken(String(formData.get("token") ?? ""));
  if (!t) return failed("This link is not valid, so nothing was saved.");

  const light = String(formData.get("light") ?? "");
  const status = String(formData.get("status") ?? "");
  if (light && !isLight(light)) return failed("Choose Good lead, Maybe or Not a lead.");
  if (status && !(isStatus(status) && MARK_STATUSES.includes(status))) return failed("That is not a status this page can set.");

  try {
    const lead = await findMarkedLead(t.site, t.ref);
    if (!lead) return failed("This enquiry is not in the CRM, so nothing was saved.");
    const actor = currentSession()?.email
      ?? `${process.env.CRM_OWNER_EMAIL?.trim() || "nigel@smart-space.ie"} (from the enquiry email)`;
    const r = await applyLeadMark(t.site, lead.id, {
      light: light ? (light as "green" | "amber" | "red") : null,
      status: status && status !== lead.status ? (status as typeof lead.status) : null,
      note: String(formData.get("note") ?? ""),
    }, { actor, contactId: lead.contact_id });
    if (!r.ok) return failed(r.message);
    if (!r.changed) return done("Nothing to change. It was already saved like that.");
    return done(r.logged ? `Saved. ${r.said}.` : `Saved. ${r.said}, but it could not be added to the history.`);
  } catch (err) {
    return writeFailed("Your answer", err);
  }
}
