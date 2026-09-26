/**
 * Customers, assembled from everything that knows about them.
 *
 * Contacts read only crm_contacts, which is empty on a fresh deployment, so the
 * section that is supposed to hold the customer list opened on "No contacts
 * yet" while Orders showed ninety real people. Nobody is going to re-key those
 * by hand and nobody should.
 *
 * So a person here is the union of two sources: the live feed, which knows
 * every Stripe order, Calendly booking and contact-form enquiry with the
 * address and phone number attached, and crm_contacts, which knows the notes,
 * the statuses and the next steps somebody has typed since. They are matched on
 * email first and phone second, the same rule upsertContact uses, so a customer
 * who paid with one address and rang from another stays one person.
 */
import { fetchLeads, euros, type Lead } from "./leads";
import { listContacts, type Contact, type LeadRow } from "./contacts";
import type { Site } from "./db";

export interface Person {
  /** A uuid when this person exists in crm_contacts, otherwise "f:<key>". */
  id: string;
  inDatabase: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  eircode: string | null;
  notes: string | null;
  /** Every row the feed holds for them, newest first. */
  feed: Lead[];
  /** Every crm_leads row, newest first. */
  leads: LeadRow[];
  paid: number;
  /** Paid orders, counted once even when the feed and the database both hold
      the same Stripe payment. */
  orders: number;
  lastActivity: string | null;
  status: string | null;
}

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return !s || s === "-" ? null : s;
};

const emailKey = (v: string | null) => clean(v)?.toLowerCase() ?? null;
const phoneKey = (v: string | null) => {
  const digits = clean(v)?.replace(/[^\d]/g, "") ?? null;
  /* Last nine digits, so 0871234567, +353871234567 and 087 123 4567 all land
     on the same person. Irish subscriber numbers are nine digits after the
     zero or the country code. */
  return digits && digits.length >= 9 ? digits.slice(-9) : null;
};

/** A stable, url-safe id for somebody who is not in the database yet. */
export const feedId = (email: string | null, phone: string | null) =>
  "f:" + Buffer.from(emailKey(email) ?? phoneKey(phone) ?? "unknown").toString("base64url");

export const decodeFeedId = (id: string) =>
  id.startsWith("f:") ? Buffer.from(id.slice(2), "base64url").toString("utf8") : null;

/** Feed dates arrive as "18/07/2026, 21:20" or "18/07/2026". */
function parseFeedDate(v: string | null | undefined): number {
  const s = clean(v);
  if (!s) return 0;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2}))?/.exec(s);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

export interface PeopleResult {
  people: Person[];
  /** Named rather than hidden: a page that silently drops a whole source and
      still shows a confident count is the failure this codebase keeps having. */
  problems: string[];
  /** Whether the orders feed answered. Money and order counts depend on it. */
  feedRead: boolean;
}

export async function listPeople(site: Site): Promise<PeopleResult> {
  const problems: string[] = [];
  let dbReason = "";

  const [feedResult, dbResult] = await Promise.all([
    fetchLeads(site).catch((e) => ({ ok: false as const, reason: String(e) })),
    listContacts(site).catch((e) => {
      dbReason = e instanceof Error ? e.message.slice(0, 120) : String(e);
      return null;
    }),
  ]);

  const byEmail = new Map<string, Person>();
  const byPhone = new Map<string, Person>();
  const people: Person[] = [];

  const find = (email: string | null, phone: string | null) => {
    const e = emailKey(email), p = phoneKey(phone);
    return (e && byEmail.get(e)) || (p && byPhone.get(p)) || null;
  };
  const index = (person: Person) => {
    const e = emailKey(person.email), p = phoneKey(person.phone);
    if (e && !byEmail.has(e)) byEmail.set(e, person);
    if (p && !byPhone.has(p)) byPhone.set(p, person);
  };

  if (feedResult.ok) {
    /* Oldest first, so the earliest row seeds the person and later rows only
       fill gaps. Taking the newest first meant a bare phone enquiry could
       overwrite the address a paid order had already supplied. */
    const rows = [...feedResult.data.leads].sort((a, b) => parseFeedDate(a.date) - parseFeedDate(b.date));
    for (const row of rows) {
      const email = clean(row.email), phone = clean(row.phone);
      if (!email && !phone) continue;
      let person = find(email, phone);
      if (!person) {
        person = {
          id: feedId(email, phone), inDatabase: false,
          name: clean(row.name) ?? email ?? phone ?? "Unnamed",
          email, phone,
          address: clean(row.address), city: null, county: null, eircode: null,
          notes: null, feed: [], leads: [], paid: 0, orders: 0, lastActivity: null, status: null,
        };
        people.push(person);
        index(person);
      }
      person.email ??= email;
      person.phone ??= phone;
      person.address ??= clean(row.address);
      if (person.name === person.email || person.name === person.phone) person.name = clean(row.name) ?? person.name;
      person.feed.unshift(row);
      person.paid += euros(row.amount);
      index(person);
    }
  } else {
    problems.push(`The orders feed could not be read, so orders, payments and anyone known only from them are missing. ${feedResult.reason}`);
  }

  if (dbResult) {
    const leadsByContact = new Map<string, LeadRow[]>();
    for (const l of dbResult.leads) {
      if (!l.contact_id) continue;
      const list = leadsByContact.get(l.contact_id) ?? [];
      list.push(l);
      leadsByContact.set(l.contact_id, list);
    }
    for (const c of dbResult.contacts) {
      const mine = leadsByContact.get(c.id) ?? [];
      const existing = find(c.email, c.phone);
      const target: Person = existing ?? {
        id: c.id, inDatabase: true,
        name: contactName(c), email: clean(c.email), phone: clean(c.phone),
        address: [c.address_line1, c.address_line2].filter(Boolean).join(", ") || null,
        city: clean(c.city), county: clean(c.county), eircode: clean(c.eircode),
        notes: clean(c.notes), feed: [], leads: [], paid: 0, orders: 0, lastActivity: null, status: null,
      };
      if (!existing) { people.push(target); }
      /* The database wins on identity and on anything a person typed, because
         those were entered deliberately; the feed wins on nothing here. */
      target.id = c.id;
      target.inDatabase = true;
      /* The feed supplies one address string that already contains the town
         and the Eircode. Where the database holds the same address in parts,
         its parts replace that string; keeping both produced "4 Grove,
         Rathgar, Dublin, D06 X291, Rathgar, Dublin, D06 X291". */
      const structured = [c.address_line1, c.address_line2].filter(Boolean).join(", ");
      if (structured && (c.city || c.county || c.eircode)) target.address = structured;
      target.notes = clean(c.notes) ?? target.notes;
      target.city ??= clean(c.city);
      target.county ??= clean(c.county);
      target.eircode ??= clean(c.eircode);
      target.email ??= clean(c.email);
      target.phone ??= clean(c.phone);
      target.leads = mine;
      if (contactName(c) !== "Unnamed") target.name = contactName(c);
      index(target);
    }
  } else {
    problems.push(`The notes and statuses database did not answer, so this list is orders only${dbReason ? ` (${dbReason})` : ""}.`);
  }

  for (const p of people) {
    p.status = p.leads[0]?.status ?? null;

    /* The contact form writes to the sheet and to the CRM, and a Stripe payment
       arrives as a feed row and as a crm_leads row, so counting both sources
       showed every customer with twice the orders they had placed. The Stripe
       id is what identifies one payment across the two. */
    const seen = new Set<string>();
    let orders = 0;
    for (const f of p.feed) {
      if (f.type !== "Paid Order") continue;
      const key = clean(f.orderId);
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      orders++;
    }
    for (const l of p.leads) {
      if (!l.stripe_session_id) continue;
      if (seen.has(l.stripe_session_id)) continue;
      seen.add(l.stripe_session_id);
      orders++;
    }
    p.orders = orders;

    const times = [
      ...p.feed.map((f) => parseFeedDate(f.date)),
      ...p.leads.map((l) => Date.parse(l.created_at)),
    ].filter((n) => n > 0);
    p.lastActivity = times.length ? new Date(Math.max(...times)).toISOString() : null;
  }

  people.sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
  return { people, problems, feedRead: feedResult.ok };
}

function contactName(c: Contact): string {
  return (
    c.name?.trim() ||
    [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
    c.email ||
    c.phone ||
    "Unnamed"
  );
}

/** One address, in reading order, with nothing repeated. */
export function fullAddress(p: Person): string {
  return [p.address, p.city, p.county, p.eircode].filter(Boolean).join(", ");
}

/** The crm_leads rows worth showing next to the feed rows.
 *
 * A Stripe payment arrives twice, once from the feed and once from the webhook
 * that wrote it to the database, and showing both made every paying customer
 * look like they had bought the same thing twice on the same day. */
export function distinctLeads(p: Person): LeadRow[] {
  const fromFeed = new Set(
    p.feed.map((f) => (f.orderId && f.orderId !== "-" ? f.orderId : "")).filter(Boolean),
  );
  return p.leads.filter((l) => !l.stripe_session_id || !fromFeed.has(l.stripe_session_id));
}

/**
 * The person behind an id from the list, whether or not they are in the
 * database, and what could not be read while looking. A missing person with
 * problems is "could not load", never "not found".
 */
export async function getPerson(site: Site, id: string): Promise<{ person: Person | null; problems: string[] }> {
  const { people, problems } = await listPeople(site);
  const direct = people.find((p) => p.id === id);
  if (direct) return { person: direct, problems };
  const key = decodeFeedId(id);
  if (!key) return { person: null, problems };
  return {
    person: people.find((p) => emailKey(p.email) === key || phoneKey(p.phone) === key) ?? null,
    problems,
  };
}
