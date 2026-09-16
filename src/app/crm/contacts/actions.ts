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
import { crm, upsertContact, type Site } from "@/lib/crm/db";
import { STATUSES, type LeadStatus } from "@/lib/crm/contacts";
import { getPerson } from "@/lib/crm/people";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Most people in Contacts arrive from Stripe and Calendly and have no row in
 * crm_contacts, because nobody has typed anything about them yet. The first
 * note or next step is that moment, so the row is created here rather than
 * refusing the write and telling Nigel to add the customer he is looking at.
 *
 * Returns the real uuid, or null when the person cannot be identified at all.
 */
async function materialise(site: Site, id: string): Promise<string | null> {
  if (UUID.test(id)) return id;
  const person = await getPerson(site, id);
  if (!person) return null;
  return upsertContact(site, {
    email: person.email, phone: person.phone, name: person.name,
    address_line1: person.address, city: person.city,
    county: person.county, eircode: person.eircode,
  });
}

export async function saveNote(formData: FormData) {
  const { site, email } = requireSession();
  const given = String(formData.get("contactId") ?? "");
  const notes = String(formData.get("notes") ?? "").slice(0, 8000);
  const id = await materialise(site, given);
  if (!id) return;

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
  revalidatePath(`/crm/contacts/${given}`);
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
  const givenLead = String(formData.get("leadId") ?? "");
  const given = String(formData.get("contactId") ?? "");
  const what = String(formData.get("what") ?? "").trim().slice(0, 500);
  const dueRaw = String(formData.get("dueOn") ?? "").trim();
  if (!what) return;

  const contactId = (await materialise(site, given)) ?? "";
  if (!contactId) return;

  /* A person who came from Stripe has no crm_leads row to hang the step on, so
     one is opened for them. Without this the only customers you could set a
     next step against were the ones the website had already recorded. */
  let leadId = UUID.test(givenLead) ? givenLead : "";
  if (!leadId) {
    const made = await crm<{ id: string }[]>("crm_leads", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({ site, contact_id: contactId, source: "crm", source_detail: "Opened from the CRM", status: "contacted" }),
    });
    leadId = made?.[0]?.id ?? "";
    if (!leadId) return;
  }

  await crm("crm_tasks", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ site, lead_id: leadId, what, due_on: /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null }),
  });
  await crm("crm_activity", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      site, lead_id: leadId, contact_id: contactId,
      kind: "task", summary: `Next step added: ${what}`, actor: email, detail: {},
    }),
  });
  revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath(`/crm/contacts/${given}`);
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
