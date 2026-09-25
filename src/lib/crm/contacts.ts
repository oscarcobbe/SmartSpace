/**
 * People, and everything filed against them.
 *
 * Leads, activity and tasks are fetched as separate queries and joined here
 * rather than with PostgREST's embedded selects. The embed is one string away
 * from silently returning the row without its children, and a contact page that
 * shows a customer with no history looks exactly like a customer who has none.
 */
import { crm, type Site } from "./db";

export type LeadStatus = "new" | "contacted" | "quoted" | "booked" | "installed" | "won" | "lost" | "spam";

export const STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "booked", "installed", "won", "lost", "spam"];

export interface Contact {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  eircode: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  contact_id: string | null;
  status: LeadStatus;
  source: string | null;
  source_detail: string | null;
  message: string | null;
  value_cents: number | null;
  utm_source: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  stripe_session_id: string | null;
  paid_at: string | null;
  booked_for: string | null;
  installed_at: string | null;
  created_at: string;
  /** Free-form extras; custom.found_us is how they found the business. */
  custom?: Record<string, unknown> | null;
}

export interface ActivityRow {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  kind: string;
  summary: string;
  actor: string | null;
  happened_at: string;
}

export interface TaskRow {
  id: string;
  lead_id: string | null;
  what: string;
  due_on: string | null;
  done_at: string | null;
  created_at: string;
}

const CONTACT_COLS =
  "id,name,first_name,last_name,email,phone,address_line1,address_line2,city,county,eircode,notes,created_at,updated_at";

export async function listContacts(site: Site, search = ""): Promise<{ contacts: Contact[]; leads: LeadRow[] } | null> {
  const term = search.trim();
  /* or= needs the whole clause in one parameter, and a comma inside a value
     would split it, so anything that is not a letter, digit, space, @ or dot
     is dropped rather than escaped. Losing a character from a search is
     recoverable; a malformed filter returns the entire table. */
  const safe = term.replace(/[^\w@.\s-]/g, "");
  const filter = safe
    ? `&or=(name.ilike.*${encodeURIComponent(safe)}*,email.ilike.*${encodeURIComponent(safe)}*,phone.ilike.*${encodeURIComponent(safe)}*,eircode.ilike.*${encodeURIComponent(safe)}*)`
    : "";

  const contacts = await crm<Contact[]>(
    `crm_contacts?site=eq.${site}&select=${CONTACT_COLS}${filter}&order=updated_at.desc&limit=300`,
  );
  if (!contacts) return null;
  const leads =
    (await crm<LeadRow[]>(`crm_leads?site=eq.${site}&select=*&order=created_at.desc&limit=1000`)) ?? [];
  return { contacts, leads };
}

export async function getContact(site: Site, id: string) {
  const [contact] = (await crm<Contact[]>(`crm_contacts?site=eq.${site}&id=eq.${id}&select=${CONTACT_COLS}&limit=1`)) ?? [];
  if (!contact) return null;
  const leads = (await crm<LeadRow[]>(`crm_leads?site=eq.${site}&contact_id=eq.${id}&select=*&order=created_at.desc`)) ?? [];
  const activity =
    (await crm<ActivityRow[]>(`crm_activity?site=eq.${site}&contact_id=eq.${id}&select=*&order=happened_at.desc&limit=100`)) ?? [];
  const tasks = leads.length
    ? (await crm<TaskRow[]>(
        `crm_tasks?site=eq.${site}&lead_id=in.(${leads.map((l) => l.id).join(",")})&select=*&order=due_on.asc`,
      )) ?? []
    : [];
  return { contact, leads, activity, tasks };
}

export const displayName = (c: Contact) =>
  c.name?.trim() ||
  [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
  c.email ||
  c.phone ||
  "Unnamed";

export const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-600/20",
  contacted: "bg-slate-100 text-slate-700 ring-slate-500/20",
  quoted: "bg-violet-50 text-violet-700 ring-violet-600/20",
  booked: "bg-amber-50 text-amber-800 ring-amber-600/20",
  installed: "bg-teal-50 text-teal-700 ring-teal-600/20",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  lost: "bg-rose-50 text-rose-700 ring-rose-600/20",
  spam: "bg-slate-100 text-slate-500 ring-slate-400/20",
};
