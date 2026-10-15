/**
 * One write for everything Nigel says about an enquiry: where it stands, how
 * they found us, the traffic light and its note.
 *
 * The customer page had two forms on each enquiry, each with its own Save, so
 * picking a light and pressing the status form's Save dropped the light
 * without a word. The page at /crm/mark/<token> (from the enquiry email) needs the
 * same write without a session. Both now come here, so the light, the status
 * and the history line are written the same way whichever door he used.
 */
import { crm, logActivity, type Site } from "./db";
import { STATUSES, type LeadStatus } from "./contacts";
import { FOUND_US, STATUS_LABEL, LIGHT_LABEL, LIGHTS, lightOf, type LeadLight } from "./labels";

export type LeadMark = {
  /** A light, "none" to clear it, or null to leave it as it is. */
  light?: LeadLight | "none" | null;
  note?: string | null;
  status?: LeadStatus | null;
  foundUs?: string | null;
};

export type LeadMarkResult =
  | { ok: true; changed: boolean; said: string; logged: boolean; status: LeadStatus; light: LeadLight | null }
  | { ok: false; message: string };

export const isLight = (v: unknown): v is LeadLight => LIGHTS.includes(v as LeadLight);
export const isStatus = (v: unknown): v is LeadStatus => STATUSES.includes(v as LeadStatus);

export async function applyLeadMark(
  site: Site,
  leadId: string,
  mark: LeadMark,
  who: { actor: string; contactId?: string | null },
): Promise<LeadMarkResult> {
  const [before] = (await crm<{ status: LeadStatus; custom: Record<string, unknown> | null; contact_id: string | null }[]>(
    `crm_leads?site=eq.${site}&id=eq.${encodeURIComponent(leadId)}&select=status,custom,contact_id&limit=1`,
  )) ?? [];
  if (!before) return { ok: false, message: "This enquiry could not be found, so nothing was changed." };

  const custom = { ...(before.custom ?? {}) };
  const said: string[] = [];
  const patch: Record<string, unknown> = {};

  if (mark.status && mark.status !== before.status) {
    patch.status = mark.status;
    said.push(`Moved to ${STATUS_LABEL[mark.status] ?? mark.status}`);
  }

  if (mark.foundUs && FOUND_US[mark.foundUs] && custom.found_us !== mark.foundUs) {
    custom.found_us = mark.foundUs;
    said.push(`Found us: ${FOUND_US[mark.foundUs]}`);
  }

  const was = lightOf(custom);
  if (mark.light === "none" && was) {
    delete custom.lead_light;
    delete custom.lead_light_at;
    delete custom.lead_light_by;
    said.push("Traffic light cleared");
  } else if (isLight(mark.light) && mark.light !== was) {
    custom.lead_light = mark.light;
    custom.lead_light_at = new Date().toISOString();
    custom.lead_light_by = who.actor;
    said.push(`Marked ${mark.light}: ${LIGHT_LABEL[mark.light]}`);
  }

  const note = (mark.note ?? "").trim().slice(0, 2000);
  if (note && note !== custom.lead_light_note) {
    custom.lead_light_note = note;
    said.push(`Note: ${note}`);
  }

  const lightNow = lightOf(custom);
  if (said.length === 0) {
    return { ok: true, changed: false, said: "Nothing to change.", logged: true, status: before.status, light: lightNow };
  }

  if (JSON.stringify(custom) !== JSON.stringify(before.custom ?? {})) patch.custom = custom;
  await crm(`crm_leads?site=eq.${site}&id=eq.${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify(patch),
  });

  const summary = said.join(". ");
  const logged = await logActivity(site, {
    lead_id: leadId,
    contact_id: who.contactId ?? before.contact_id,
    kind: isLight(mark.light) || mark.light === "none" ? "light" : "status",
    summary,
    actor: who.actor,
    detail: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(lightNow !== was ? { light: lightNow } : {}),
      ...(note ? { note } : {}),
      ...(mark.foundUs && custom.found_us === mark.foundUs ? { found_us: mark.foundUs } : {}),
    },
  });

  return { ok: true, changed: true, said: summary, logged, status: (patch.status as LeadStatus) ?? before.status, light: lightNow };
}
