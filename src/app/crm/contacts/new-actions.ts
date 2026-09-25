"use server";

/**
 * Putting somebody in by hand.
 *
 * Everything else in here arrives from Stripe, Calendly or the website form.
 * A customer who rings the van had nowhere to go, which is the difference
 * between a CRM and a report, so this is the one write path that starts from
 * nothing.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/crm/session";
import { crm, upsertContact, logActivity, crmConfigured } from "@/lib/crm/db";

export interface NewCustomerState {
  error?: string;
}

export async function addCustomer(_prev: NewCustomerState, form: FormData): Promise<NewCustomerState> {
  const { site, email: actor } = requireSession();
  if (!crmConfigured()) return { error: "The database is not connected on this deployment." };

  const get = (k: string) => String(form.get(k) ?? "").trim();
  const name = get("name").slice(0, 200);
  const email = get("email").toLowerCase().slice(0, 200) || null;
  const phone = get("phone").slice(0, 40) || null;

  /* Email or phone, because a person you cannot contact is not a contact and
     because those two are what every later lookup matches on. */
  if (!name) return { error: "A name is needed." };
  if (!email && !phone) return { error: "A phone number or an email address is needed, otherwise there is no way to reach them." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right." };

  let contactId: string | null = null;
  try {
    contactId = await upsertContact(site, {
      name,
      email,
      phone,
      address_line1: get("address").slice(0, 200) || null,
      city: get("city").slice(0, 100) || null,
      county: get("county").slice(0, 100) || null,
      eircode: get("eircode").toUpperCase().slice(0, 20) || null,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "That could not be saved." };
  }
  if (!contactId) return { error: "That could not be saved." };

  const wanted = get("wanted").slice(0, 2000);
  const source = get("source") || "phone";
  /* Checked against the lists in form.tsx, so a hand-edited request cannot
     write a status the enum refuses or a found_us value the report does not
     know. */
  const FOUND = ["unknown", "google_ads", "google_search", "website", "recommended", "organisation", "existing_customer", "other"];
  const OUTCOMES = ["contacted", "quoted", "booked", "won", "lost"];
  const foundUs = FOUND.includes(get("found_us")) ? get("found_us") : "unknown";
  const outcome = OUTCOMES.includes(get("outcome")) ? get("outcome") : "contacted";

  try {
    const made = await crm<{ id: string }[]>("crm_leads", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        site,
        contact_id: contactId,
        source,
        source_detail: get("source_detail").slice(0, 200) || null,
        message: wanted || null,
        status: outcome,
        custom: { found_us: foundUs },
      }),
    });
    await logActivity(site, {
      contact_id: contactId,
      lead_id: made?.[0]?.id ?? null,
      kind: "lead_created",
      summary: source === "phone" ? "Rang in" : source === "voicemail" ? "Left a voicemail" : "Added by hand",
      detail: { found_us: foundUs },
      actor,
    });
  } catch (err) {
    /* The person is saved even if the enquiry row failed, so say so rather
       than implying nothing happened. */
    return { error: `Saved the customer, but the enquiry did not save: ${err instanceof Error ? err.message : "unknown error"}` };
  }

  revalidatePath("/crm/contacts");
  redirect(`/crm/contacts/${contactId}`);
}
