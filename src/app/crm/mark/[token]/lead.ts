import { crm, type Site } from "@/lib/crm/db";
import type { LeadStatus } from "@/lib/crm/contacts";

export type MarkedLead = {
  id: string;
  status: LeadStatus;
  source: string | null;
  source_detail: string | null;
  message: string | null;
  created_at: string;
  custom: Record<string, unknown> | null;
  contact_id: string | null;
};

/** The statuses an enquiry moves through after a call, the ones this page offers. */
export const MARK_STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "booked", "won", "lost"];

/** The enquiry a token's reference was stored on, on that site only. */
export async function findMarkedLead(site: Site, ref: string): Promise<MarkedLead | null> {
  const rows = await crm<MarkedLead[]>(
    `crm_leads?site=eq.${site}&custom->>mark_ref=eq.${encodeURIComponent(ref)}` +
      `&select=id,status,source,source_detail,message,created_at,custom,contact_id&limit=1`,
  );
  return rows?.[0] ?? null;
}

export async function contactOf(site: Site, id: string | null) {
  if (!id) return null;
  const rows = await crm<{ name: string | null; first_name: string | null; phone: string | null; email: string | null }[]>(
    `crm_contacts?site=eq.${site}&id=eq.${encodeURIComponent(id)}&select=name,first_name,phone,email&limit=1`,
  );
  return rows?.[0] ?? null;
}
