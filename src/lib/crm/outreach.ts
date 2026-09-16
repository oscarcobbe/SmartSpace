/**
 * Outreach, read only for now.
 *
 * There is deliberately no send in here. The brief says the sending gets built
 * under supervision, and a module that can read the list is a module somebody
 * will later add a send to by accident. When that day comes it goes in its own
 * file with its own approval path, and it will have to check
 * crm_outreach_blocks before every message.
 */
import { crm, crmConfigured, type Site } from "./db";

export type OutreachStatus =
  | "new" | "approved" | "sent" | "replied" | "bounced" | "unsubscribed" | "skip";

export interface Prospect {
  id: string;
  business: string;
  contact_name: string | null;
  role: string | null;
  email: string | null;
  county: string | null;
  sector: string | null;
  status: OutreachStatus;
  basis: string | null;
  source: string | null;
  approved_by: string | null;
  created_at: string;
}

export interface Send {
  id: string;
  prospect_id: string;
  template: string;
  subject: string;
  to_email: string;
  queued_at: string;
  sent_at: string | null;
  failed_at: string | null;
  failure: string | null;
  replied_at: string | null;
}

export interface OutreachData {
  prospects: Prospect[];
  sends: Send[];
  blocked: number;
  counts: Record<OutreachStatus, number>;
  /** Every prospect a person has read and cleared. Nothing else may be written to. */
  approved: number;
  /** Rows with no basis recorded, which are the ones that cannot lawfully be sent. */
  withoutBasis: number;
}

const EMPTY_COUNTS: Record<OutreachStatus, number> = {
  new: 0, approved: 0, sent: 0, replied: 0, bounced: 0, unsubscribed: 0, skip: 0,
};

export async function fetchOutreach(site: Site): Promise<OutreachData | null> {
  if (!crmConfigured()) return null;

  const [prospects, sends, blocks] = await Promise.all([
    crm<Prospect[]>(
      `crm_outreach_prospects?site=eq.${site}` +
        `&select=id,business,contact_name,role,email,county,sector,status,basis,source,approved_by,created_at` +
        `&order=created_at.desc&limit=500`,
    ).catch(() => null),
    crm<Send[]>(
      `crm_outreach_sends?site=eq.${site}&select=*&order=queued_at.desc&limit=200`,
    ).catch(() => null),
    /* Count only. The suppression list is the one table nobody needs to read
       the contents of from a dashboard, and not rendering it is one fewer
       place a personal email address is displayed. */
    crm<{ email: string }[]>("crm_outreach_blocks?select=email&limit=5000").catch(() => null),
  ]);

  const counts = { ...EMPTY_COUNTS };
  for (const p of prospects ?? []) counts[p.status] = (counts[p.status] ?? 0) + 1;

  return {
    prospects: prospects ?? [],
    sends: sends ?? [],
    blocked: blocks?.length ?? 0,
    counts,
    approved: counts.approved,
    withoutBasis: (prospects ?? []).filter((p) => !p.basis?.trim()).length,
  };
}

export const OUTREACH_PILL: Record<OutreachStatus, string> = {
  new: "bg-slate-100 text-slate-700 ring-slate-500/20",
  approved: "bg-sky-50 text-sky-800 ring-sky-600/20",
  sent: "bg-amber-50 text-amber-800 ring-amber-600/20",
  replied: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  bounced: "bg-rose-50 text-rose-800 ring-rose-600/20",
  unsubscribed: "bg-rose-50 text-rose-800 ring-rose-600/20",
  skip: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

export const OUTREACH_LABEL: Record<OutreachStatus, string> = {
  new: "Not looked at",
  approved: "Cleared to write to",
  sent: "Written to",
  replied: "Replied",
  bounced: "Bounced",
  unsubscribed: "Opted out",
  skip: "Passed over",
};
