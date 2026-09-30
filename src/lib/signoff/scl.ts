/**
 * Sign-off for SmartCare Living's emails.
 *
 * Smart Space's items are built from this repo. SmartCare Living's emails are
 * sent from smartcareliving.ie, so the items are built from its catalogue
 * (lib/email/scl-catalogue), each rendered by the function that sends it,
 * and the decisions are kept in the same crm_signoffs table under the site
 * "smartcareliving". The fingerprint is taken the same way as Smart Space's
 * (items.ts fingerprint), so smartcareliving.ie can take it too, from its own
 * render, and ask /api/crm/signoff-status whether exactly that is approved.
 * Fails closed like the rest: anything unreadable is "not approved".
 */
import { crm, crmConfigured, unlessWrongKey } from "@/lib/crm/db";
import { sclCatalogue } from "@/lib/email/scl-catalogue";
import type { Entry, Stage } from "@/lib/email/catalogue";
import { approvalFrom, type Approval, type DecisionRow } from "./verdict";
import { fingerprint, type SignoffItem } from "./items";

export const SCL_SITE = "smartcareliving" as const;
const COLUMNS = "item,content_hash,decision,choice,comment,decided_by,decided_at";

/** The SmartCare Living messages that wait for Nigel: nothing sends them until he approves. */
export const SCL_GATED = ["quiz-plan", "quiz-plan-urgent", "quiz-visit", "quiz-how", "quiz-how-early", "quiz-close"];
export const sclItemId = (entryId: string) => `scl:email:${entryId}`;

function contentOf(e: Entry): string {
  const out = e.render();
  return "sms" in out ? out.sms : [out.subject, out.preheader, out.html, out.text].join("\n");
}

export async function sclItems(): Promise<{ items: SignoffItem[]; entries: Entry[]; stages: Stage[]; problem?: string }> {
  const cat = await sclCatalogue();
  const items: SignoffItem[] = cat.entries
    .filter((e) => SCL_GATED.includes(e.id))
    .map((e) => {
      const content = contentOf(e);
      return {
        id: sclItemId(e.id),
        group: "scl-quiz",
        title: e.name,
        effect: `${e.trigger} ${e.timing}`,
        preview: [{ label: "See it", href: `/crm/emails?e=${e.id}` }],
        content: () => content,
      };
    });
  return { items, entries: cat.entries, stages: cat.stages, problem: cat.problem };
}

async function sclRows(): Promise<{ rows: DecisionRow[] | null; problem: string | null }> {
  if (!crmConfigured()) return { rows: null, problem: "The CRM is not configured here." };
  try {
    const rows = await crm<DecisionRow[]>(`crm_signoffs?site=eq.${SCL_SITE}&select=${COLUMNS}&order=decided_at.desc&limit=2000`);
    return { rows: await unlessWrongKey(rows), problem: null };
  } catch (err) {
    return { rows: null, problem: `The sign-off record could not be read (${err instanceof Error ? err.message.slice(0, 160) : "no answer"}).` };
  }
}

export async function sclApprovals(items: SignoffItem[]): Promise<{ states: Map<string, Approval>; history: Map<string, DecisionRow[]>; problem: string | null }> {
  const { rows, problem } = await sclRows();
  const states = new Map<string, Approval>();
  const history = new Map<string, DecisionRow[]>();
  for (const item of items) {
    const mine = rows ? rows.filter((r) => r.item === item.id) : null;
    history.set(item.id, mine ?? []);
    states.set(item.id, approvalFrom(mine, fingerprint(item)));
  }
  return { states, history, problem };
}

/** For smartcareliving.ie: is this item approved for exactly this fingerprint? */
export async function sclApprovalFor(entryId: string, hash: string): Promise<Approval> {
  if (!SCL_GATED.includes(entryId)) {
    return { approved: false, state: "unknown", choice: null, latest: null, reason: `No sign-off item for ${entryId}.` };
  }
  if (!crmConfigured()) return { approved: false, state: "unknown", choice: null, latest: null, reason: "The CRM is not configured here." };
  try {
    const rows = await crm<DecisionRow[]>(
      `crm_signoffs?site=eq.${SCL_SITE}&item=eq.${encodeURIComponent(sclItemId(entryId))}&select=${COLUMNS}&order=decided_at.desc&limit=1`,
      { signal: AbortSignal.timeout(6000) },
    );
    return approvalFrom(rows, hash);
  } catch (err) {
    return { approved: false, state: "unknown", choice: null, latest: null, reason: `The sign-off record could not be read (${err instanceof Error ? err.message.slice(0, 160) : "no answer"}).` };
  }
}

export async function recordSclDecision(d: {
  item: SignoffItem;
  decision: "approved" | "changes";
  comment: string | null;
  by: string;
}): Promise<void> {
  await crm("crm_signoffs", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      site: SCL_SITE,
      item: d.item.id,
      content_hash: fingerprint(d.item),
      decision: d.decision,
      choice: null,
      comment: d.comment?.trim() || null,
      decided_by: d.by,
    }),
  });
}
