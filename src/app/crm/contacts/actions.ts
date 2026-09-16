"use server";

/**
 * Every action re-reads the session and scopes its write by site.
 *
 * A server action is a public endpoint with a generated name, not a private
 * function call, so the id in the form is attacker-controlled. Passing site
 * into each filter means the worst a forged id can do is match nothing.
 */
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/crm/session";
import { crm } from "@/lib/crm/db";
import { STATUSES, type LeadStatus } from "@/lib/crm/contacts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveNote(formData: FormData) {
  const { site, email } = requireSession();
  const id = String(formData.get("contactId") ?? "");
  const notes = String(formData.get("notes") ?? "").slice(0, 8000);
  if (!UUID.test(id)) return;

  await crm(`crm_contacts?site=eq.${site}&id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ notes }),
  });
  await crm("crm_activity", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ site, contact_id: id, kind: "note", summary: "Note updated", actor: email, detail: {} }),
  });
  revalidatePath(`/crm/contacts/${id}`);
}

export async function setLeadStatus(formData: FormData) {
  const { site, email } = requireSession();
  const leadId = String(formData.get("leadId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!UUID.test(leadId) || !STATUSES.includes(status)) return;

  await crm(`crm_leads?site=eq.${site}&id=eq.${leadId}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ status }),
  });
  await crm("crm_activity", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      site, lead_id: leadId, contact_id: UUID.test(contactId) ? contactId : null,
      kind: "status", summary: `Moved to ${status}`, actor: email, detail: {},
    }),
  });
  if (UUID.test(contactId)) revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/crm/contacts");
}

export async function addTask(formData: FormData) {
  const { site, email } = requireSession();
  const leadId = String(formData.get("leadId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const what = String(formData.get("what") ?? "").trim().slice(0, 500);
  const dueRaw = String(formData.get("dueOn") ?? "").trim();
  if (!UUID.test(leadId) || !what) return;

  await crm("crm_tasks", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ site, lead_id: leadId, what, due_on: /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null }),
  });
  await crm("crm_activity", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      site, lead_id: leadId, contact_id: UUID.test(contactId) ? contactId : null,
      kind: "task", summary: `Task added: ${what}`, actor: email, detail: {},
    }),
  });
  if (UUID.test(contactId)) revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/crm/tasks");
}

export async function completeTask(formData: FormData) {
  const { site } = requireSession();
  const taskId = String(formData.get("taskId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const undo = String(formData.get("undo") ?? "") === "1";
  if (!UUID.test(taskId)) return;

  await crm(`crm_tasks?site=eq.${site}&id=eq.${taskId}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ done_at: undo ? null : new Date().toISOString() }),
  });
  if (UUID.test(contactId)) revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/crm/tasks");
}
