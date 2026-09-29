/**
 * Whether a sign-off lets something go out, from its decision history.
 *
 * Pure and dependency free, so the build check runs exactly this. The rules:
 *
 *   - no decision yet: not approved;
 *   - the newest decision asks for changes: not approved;
 *   - the newest decision approved different content (the email was edited
 *     since): not approved, until it is approved again;
 *   - otherwise approved, with whatever choice came with it.
 *
 * Anything that cannot be read is not approved. The sending code turns every
 * error into "not approved" before it gets here, so a database outage stops
 * messages rather than sending unapproved ones.
 */

export interface DecisionRow {
  item: string;
  content_hash: string;
  decision: "approved" | "changes";
  choice: string | null;
  comment: string | null;
  decided_by: string;
  decided_at: string;
}

export type ApprovalState = "waiting" | "approved" | "changes" | "stale" | "unknown";

export interface Approval {
  approved: boolean;
  state: ApprovalState;
  choice: string | null;
  /** The decision the state rests on, when there is one. */
  latest: DecisionRow | null;
  /** Why it cannot send, in a sentence, when it cannot. */
  reason: string | null;
}

export function approvalFrom(rows: DecisionRow[] | null, currentHash: string): Approval {
  if (!rows) {
    return { approved: false, state: "unknown", choice: null, latest: null, reason: "The sign-off record could not be read." };
  }
  const latest = [...rows].sort((a, b) => b.decided_at.localeCompare(a.decided_at))[0] ?? null;
  if (!latest) return { approved: false, state: "waiting", choice: null, latest: null, reason: "Not signed off yet." };
  if (latest.decision === "changes") {
    return { approved: false, state: "changes", choice: null, latest, reason: "Changes were asked for." };
  }
  if (latest.content_hash !== currentHash) {
    return {
      approved: false,
      state: "stale",
      choice: null,
      latest,
      reason: "It has changed since it was approved, so it needs approving again.",
    };
  }
  return { approved: true, state: "approved", choice: latest.choice, latest, reason: null };
}
