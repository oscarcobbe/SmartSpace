"use server";

/**
 * Clear the cached feeds, so the Refresh button means now.
 *
 * fetchLeads sits behind a sixty second cache, which is what makes moving
 * between Overview, The diary, Orders and Customers instant. Without this the
 * button would redraw the same cached rows and the "Read just now" beside it
 * would be a lie, which is the one thing this CRM cannot afford to be.
 */

import { revalidateTag } from "next/cache";
import { LEADS_TAG } from "@/lib/crm/leads";
import { FINANCE_TAG } from "@/lib/crm/stripe-finance";
import { ROAS_TAG } from "@/lib/crm/roas";
import { requireSession } from "@/lib/crm/session";

export async function refreshCrmData(): Promise<void> {
  /* Signed in only: this clears a cache shared by everyone on the deployment,
     so it is not something an anonymous request gets to do. */
  requireSession();
  revalidateTag(LEADS_TAG);
  revalidateTag(FINANCE_TAG);
  revalidateTag(ROAS_TAG);
}
