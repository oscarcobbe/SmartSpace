/**
 * Nigel's sign-offs, read from and written to the CRM.
 *
 * approval() is the gate every new customer message passes before it sends.
 * It fails closed: no CRM configured, a timeout, a refused key or anything
 * else it cannot read is "not approved", with the reason, so an outage stops
 * messages rather than letting unapproved ones through.
 */
import { crm, crmConfigured, unlessWrongKey, type Site } from "@/lib/crm/db";
import { approvalFrom, type Approval, type DecisionRow } from "./verdict";
import { fingerprint, itemById, SIGNOFF_ITEMS } from "./items";

/** Sign-offs are Smart Space's: every item is a Smart Space message or page. */
export const SIGNOFF_SITE: Site = "smart-space";

const COLUMNS = "item,content_hash,decision,choice,comment,decided_by,decided_at";

export async function approval(itemId: string): Promise<Approval & { item: string }> {
  const item = itemById(itemId);
  if (!item) {
    return { item: itemId, approved: false, state: "unknown", choice: null, latest: null, reason: `No sign-off item called ${itemId}.` };
  }
  if (!crmConfigured()) {
    return { item: itemId, approved: false, state: "unknown", choice: null, latest: null, reason: "The CRM is not configured here." };
  }
  try {
    const rows = await crm<DecisionRow[]>(
      `crm_signoffs?site=eq.${SIGNOFF_SITE}&item=eq.${encodeURIComponent(itemId)}&select=${COLUMNS}&order=decided_at.desc&limit=1`,
      { signal: AbortSignal.timeout(6000) },
    );
    return { item: itemId, ...approvalFrom(rows, fingerprint(item)) };
  } catch (err) {
    const why = err instanceof Error ? err.message.slice(0, 160) : "no answer";
    return { item: itemId, approved: false, state: "unknown", choice: null, latest: null, reason: `The sign-off record could not be read (${why}).` };
  }
}

/** Every item's current state, for the sign-off page. One read. */
export async function allApprovals(): Promise<{ states: Map<string, Approval>; history: Map<string, DecisionRow[]>; problem: string | null }> {
  const states = new Map<string, Approval>();
  const history = new Map<string, DecisionRow[]>();
  let rows: DecisionRow[] | null = null;
  let problem: string | null = null;
  if (!crmConfigured()) problem = "The CRM is not configured here.";
  else {
    try {
      rows = await crm<DecisionRow[]>(`crm_signoffs?site=eq.${SIGNOFF_SITE}&select=${COLUMNS}&order=decided_at.desc&limit=2000`);
      /* A wrong key reads as an empty table, which here would say "nothing
         signed off" about a record that may be full. */
      rows = await unlessWrongKey(rows);
    } catch (err) {
      problem = `The sign-off record could not be read (${err instanceof Error ? err.message.slice(0, 160) : "no answer"}).`;
    }
  }
  for (const item of SIGNOFF_ITEMS) {
    const mine = rows ? rows.filter((r) => r.item === item.id) : null;
    history.set(item.id, mine ?? []);
    states.set(item.id, approvalFrom(mine, fingerprint(item)));
  }
  return { states, history, problem };
}

export async function recordDecision(d: {
  itemId: string;
  decision: "approved" | "changes";
  choice: string | null;
  comment: string | null;
  by: string;
}): Promise<void> {
  const item = itemById(d.itemId);
  if (!item) throw new Error(`No sign-off item called ${d.itemId}`);
  if (d.choice && !item.choices?.some((c) => c.id === d.choice)) throw new Error("That choice is not one of the options.");
  if (d.decision === "approved" && item.choices?.length && !d.choice) throw new Error("Pick one of the options first.");
  await crm("crm_signoffs", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      site: SIGNOFF_SITE,
      item: item.id,
      content_hash: fingerprint(item),
      decision: d.decision,
      choice: d.decision === "approved" ? d.choice : null,
      comment: d.comment?.trim() || null,
      decided_by: d.by,
    }),
  });
}
