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
import { crm, upsertContact, logActivity, type Site } from "@/lib/crm/db";
import { STATUSES, type LeadStatus } from "@/lib/crm/contacts";
import { FOUND_US, STATUS_LABEL } from "@/lib/crm/labels";
import { done, failed, writeFailed, type ActionState } from "../action-state";
import { getPerson } from "@/lib/crm/people";
import { createPaymentLink } from "@/lib/crm/payment-link";
import { parseMoney } from "@/lib/crm/money-input";

/* Our own origin, for the one call that goes back through the front door. */
function siteBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
  return fromEnv ? fromEnv.replace(/\/$/, "") : "https://smart-space.ie";
}

/*
 * ── WHY THESE WRITES DO NOT CALL revalidatePath ──────────────────
 *
 * revalidatePath marks the page's own implicit cache tag, and every cached
 * read made while rendering that page carries it, including the orders feed.
 * So saving a note re-rendered the customer page with the feed forced cold:
 * six to eight seconds of "Saving" on Smart Space, and up to a minute on
 * SmartCare Living while its sheet woke, to change one textarea. Nothing
 * these actions write is in any cache (every database read is no-store), so
 * the form refreshes the page itself once the write succeeds, and the feed is
 * served from its cache as normal.
 */
const NOT_IN_HISTORY = (what: string) => `${what}, but it could not be added to the history.`;

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
  const { person } = await getPerson(site, id);
  if (!person) return null;
  return upsertContact(site, {
    email: person.email, phone: person.phone, name: person.name,
    address_line1: person.address, city: person.city,
    county: person.county, eircode: person.eircode,
  });
}

export async function saveNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { site, email } = requireSession();
  const given = String(formData.get("contactId") ?? "");
  const notes = String(formData.get("notes") ?? "").slice(0, 8000);
  try {
    const id = await materialise(site, given);
    if (!id) return failed("This customer could not be found, so the note was not saved.");

    await crm(`crm_contacts?site=eq.${site}&id=eq.${id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ notes }),
    });
    const logged = await logActivity(site, { contact_id: id, kind: "note", summary: "Note updated", actor: email, detail: {} });
    return done(logged ? "Note saved." : NOT_IN_HISTORY("Note saved"));
  } catch (err) {
    return writeFailed("The note", err);
  }
}

export async function setLeadStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { site, email } = requireSession();
  const leadId = String(formData.get("leadId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!UUID.test(leadId) || !STATUSES.includes(status)) return failed("That is not a status this CRM knows.");
  /* How they found us is saved with the status, from the same row, because
     that is when Nigel knows it: on the call. Checked against the one list, so
     a hand-made request cannot write a value the report does not know. */
  const found = String(formData.get("found_us") ?? "");
  try {
    const [before] = (await crm<{ status: string; custom: Record<string, unknown> | null }[]>(
      `crm_leads?site=eq.${site}&id=eq.${leadId}&select=status,custom&limit=1`,
    )) ?? [];
    if (!before) return failed("This enquiry could not be found, so nothing was changed.");
    const custom = { ...(before.custom ?? {}) };
    const foundChanged = !!FOUND_US[found] && custom.found_us !== found;
    if (foundChanged) custom.found_us = found;
    const statusChanged = before.status !== status;
    if (!statusChanged && !foundChanged) return done("Nothing to change.");

    await crm(`crm_leads?site=eq.${site}&id=eq.${leadId}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify(foundChanged ? { status, custom } : { status }),
    });
    const said = [
      statusChanged ? `Moved to ${STATUS_LABEL[status] ?? status}` : null,
      foundChanged ? `Found us: ${FOUND_US[found]}` : null,
    ].filter(Boolean).join(". ");
    const logged = await logActivity(site, {
      lead_id: leadId, contact_id: UUID.test(contactId) ? contactId : null,
      kind: "status", summary: said, actor: email, detail: foundChanged ? { found_us: found } : {},
    });
    return done(logged ? `Saved. ${said}.` : NOT_IN_HISTORY(`Saved. ${said}`));
  } catch (err) {
    return writeFailed("The change", err);
  }
}

export async function addTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { site, email } = requireSession();
  const givenLead = String(formData.get("leadId") ?? "");
  const given = String(formData.get("contactId") ?? "");
  const what = String(formData.get("what") ?? "").trim().slice(0, 500);
  const dueRaw = String(formData.get("dueOn") ?? "").trim();
  if (!what) return failed("Write what the next step is first.");

  try {
    const contactId = (await materialise(site, given)) ?? "";
    if (!contactId) return failed("This customer could not be found, so the next step was not saved.");

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
      if (!leadId) return failed("The next step did not save: an enquiry to hang it on could not be opened.");
    }

    await crm("crm_tasks", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ site, lead_id: leadId, what, due_on: /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null }),
    });
    const logged = await logActivity(site, {
      lead_id: leadId, contact_id: contactId,
      kind: "task", summary: `Next step added: ${what}`, actor: email, detail: {},
    });
    return done(logged ? "Next step added." : NOT_IN_HISTORY("Next step added"));
  } catch (err) {
    return writeFailed("The next step", err);
  }
}

export async function completeTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { site, email } = requireSession();
  const taskId = String(formData.get("taskId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const undo = String(formData.get("undo") ?? "") === "1";
  if (!UUID.test(taskId)) return failed("That next step could not be found.");

  try {
    const [task] = (await crm<{ what: string; lead_id: string | null }[]>(
      `crm_tasks?site=eq.${site}&id=eq.${taskId}&select=what,lead_id&limit=1`,
    )) ?? [];
    if (!task) return failed("That next step could not be found.");
    await crm(`crm_tasks?site=eq.${site}&id=eq.${taskId}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ done_at: undo ? null : new Date().toISOString() }),
    });
    /* Ticking a step off is something that happened to the customer, and the
       history is where Nigel looks to see what has been done. It was the one
       write that left no trace there. */
    const logged = await logActivity(site, {
      lead_id: task.lead_id, contact_id: UUID.test(contactId) ? contactId : null,
      kind: "task", summary: `${undo ? "Reopened" : "Done"}: ${task.what}`, actor: email, detail: {},
    });
    return logged ? done(undo ? "Reopened." : "Done.") : done(NOT_IN_HISTORY(undo ? "Reopened" : "Done"));
  } catch (err) {
    return writeFailed("That", err);
  }
}

/**
 * Make a payment link for this customer and send it, tagged.
 *
 * ── WHY THIS IS HERE AND NOT IN STRIPE ───────────────────────────
 *
 * Measured 22 September 2026: every Smart Space charge that month carries
 * empty Stripe metadata. Not one of them went through the website's checkout,
 * so not one carries a click id, so Google cannot credit the ad that produced
 * it. That is the entirety of "the ads make sales the account never sees", and
 * no amount of work on the upload touches it.
 *
 * A link made by hand in Stripe cannot carry attribution. A link made here
 * can, because the customer's own click id is on the record already open on
 * the screen. The point of putting it on this page is that it removes the trip
 * to Stripe: the previous tagged-link tool lived in a different app behind a
 * different key and needed a URL pasted into it, and the evidence that it was
 * not used is that no September sale carries a tag.
 *
 * ── WHY IT CALLS OUR OWN ROUTE ───────────────────────────────────
 *
 * /api/admin/send-payment-link owns the customer-facing email, the host
 * allow-list and the token minting that keeps the click id off the URL. It has
 * been in front of customers for months. Copying any of it here to save an
 * internal hop would leave two templates to keep in step, which is how one of
 * them goes stale and starts quoting the wrong terms.
 */
export async function sendPaymentLink(_prev: unknown, formData: FormData): Promise<{
  status: "idle" | "ok" | "error"; message: string;
}> {
  const { site, email: actor } = requireSession();
  if (site !== "smart-space") {
    return { status: "error", message: "Only Smart Space takes payment through Stripe." };
  }

  const given = String(formData.get("contactId") ?? "");
  const to = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim();
  const gclid = String(formData.get("gclid") ?? "").trim();
  const money = parseMoney(formData.get("amount"));

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return { status: "error", message: "This customer has no email address on file." };
  }
  if (!money.ok) return { status: "error", message: money.reason };

  const adminKey = process.env.ADMIN_KEY?.trim();
  if (!adminKey) {
    return { status: "error", message: "ADMIN_KEY is not set, so nothing can be sent." };
  }

  let url: string;
  try {
    url = await createPaymentLink({ amountCents: money.cents, description });
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Stripe refused that." };
  }

  try {
    const res = await fetch(`${siteBase()}/api/admin/send-payment-link`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "payment", email: to, name, paymentUrl: url, gclid: gclid || undefined }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; attributed?: boolean };
    if (!res.ok || !data.ok) {
      /* The link exists and is live at this point, so it is handed over rather
         than lost: the sale matters more than the send. */
      return {
        status: "error",
        message: `${data.error || `The email did not go (${res.status}).`} The link is made and live: ${url}`,
      };
    }

    /*
     * ── THE TRAIL IS NEVER WORTH FAILING THE SEND FOR ────────────────
     *
     * This ran inside the same try as the send, and crm() throws on any
     * non-2xx or on its ten second timeout. So a Supabase hiccup AFTER the
     * customer had already been emailed landed in the catch below and told
     * Nigel "the email did not go", with a live payment link printed beside
     * it. He presses Send again: a second Stripe price, a second live link,
     * a second "Pay securely" email to the same person, and Stripe payment
     * links stay payable, so both of them work.
     *
     * db.ts has the right pattern already and says why: "The trail is worth
     * having and never worth failing a request for."
     */
    try {
      const contactId = await materialise(site, given);
      if (contactId) {
        await crm("crm_activity", {
          method: "POST",
          prefer: "return=minimal",
          body: JSON.stringify({
            site, contact_id: contactId, lead_id: null, kind: "note",
            summary: `Payment link sent, ${money.formatted} for ${description.slice(0, 60)}`
              + (data.attributed ? ", traced back to their ad click" : ", with no ad click on file"),
            actor, detail: {},
          }),
        });
        revalidatePath(`/crm/contacts/${contactId}`);
      }
    } catch (err) {
      console.error("[send-payment-link] the link went out, the note did not:", err);
    }

    return {
      status: "ok",
      message: `${money.formatted} to ${to}. ` + (data.attributed
        ? "This one traces back to the ad they clicked."
        : "There is no ad click on their record, so this payment cannot be credited to the advertising."),
    };
  } catch (err) {
    return {
      status: "error",
      message: `${err instanceof Error ? err.message : "The email did not go."} The link is made and live: ${url}`,
    };
  }
}
