/** What a CRM write says back to the form that made it. */
export interface ActionState {
  status: "idle" | "ok" | "error";
  message: string;
  /** When it happened, so two identical answers in a row still re-render. */
  at?: number;
}

export const done = (message: string): ActionState => ({ status: "ok", message, at: Date.now() });
export const failed = (message: string): ActionState => ({ status: "error", message, at: Date.now() });

/** A database error, in words a person can act on. */
export function writeFailed(what: string, err: unknown): ActionState {
  const raw = err instanceof Error ? err.message : String(err);
  const timeout = /abort|timeout/i.test(raw);
  return failed(timeout
    ? `${what} did not save: the database took too long to answer. Try again in a moment.`
    : `${what} did not save (${raw.slice(0, 140)}). Nothing was changed; try again.`);
}
