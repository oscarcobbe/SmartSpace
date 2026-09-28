/**
 * Work that runs after the visitor already has their answer.
 *
 * The contact form, the callback form and the free consultation used to hold
 * the visitor until the leads sheet, the CRM, the consent record and the
 * server conversion had all finished. The sheet alone can take 12 seconds,
 * then a pause, then a 10 second retry. The browser only fires the Google Ads
 * conversion once the answer arrives, so a visitor who closed the tab during
 * that wait was never counted; SCL lost a lead to the same pattern. Those
 * routes now answer as soon as the lead is with Nigel, and hand the rest to
 * this.
 *
 * Why waitUntil and not `void task()`: Vercel may freeze or stop a function
 * once its response is sent, so a promise nobody is waiting on can be cut off
 * part way. waitUntil from @vercel/functions tells the platform to keep the
 * function alive until the promise settles, up to the route's maxDuration.
 * Next 14.2 has no after(), which is the built-in way to do this from Next 15.
 * Outside Vercel (next dev, next start) there is no request context and
 * waitUntil does nothing; the server process stays up, so the work still
 * finishes there.
 *
 * Every task has its own ceiling and its outcome is logged, success included,
 * as "[after] <task>: ...", so the runtime log shows what happened to each
 * lead after the answer. Never throws: a failure here must not reach the
 * visitor, who has already gone.
 */
import { waitUntil } from "@vercel/functions";
import { SHEET_BACKGROUND } from "@/lib/leads";

/** What a background task can report. A plain void counts as done. */
export type AfterResult = { ok: boolean; outcome: string } | void;

/**
 * Ceilings, in milliseconds. Each sits above the task's own internal timeout,
 * so the task normally reports its own result; the ceiling only catches a
 * task that hangs past everything it was meant to do.
 *
 * The sheet ceiling covers logLead with SHEET_BACKGROUND (8 minutes, most of
 * it waiting for an append that ended in doubt to settle before the sheet is
 * read for the last time) plus a minute for the alert email. Routes that use
 * it declare maxDuration = 600 so the platform allows that long.
 */
export const AFTER_CEILING = {
  sheet: SHEET_BACKGROUND.budgetMs + 60_000,
  crm: 8_000,
  consent: 6_000,
  conversion: 6_000,
  email: 15_000,
} as const;

export function afterResponse(
  label: string,
  ceilingMs: number,
  task: () => Promise<AfterResult>,
): void {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ceiling = new Promise<"ceiling">((resolve) => {
    timer = setTimeout(() => resolve("ceiling"), ceilingMs);
  });
  const run = Promise.race([Promise.resolve().then(task), ceiling])
    .then((result) => {
      const ms = Date.now() - started;
      if (result === "ceiling") {
        console.error(`[after] ${label}: still running after ${ceilingMs} ms, stopped waiting for it`);
      } else if (result && typeof result === "object") {
        (result.ok ? console.log : console.error)(`[after] ${label}: ${result.outcome} (${ms} ms)`);
      } else {
        console.log(`[after] ${label}: done (${ms} ms)`);
      }
    })
    .catch((err: unknown) => {
      console.error(
        `[after] ${label}: threw after ${Date.now() - started} ms:`,
        err instanceof Error ? `${err.name}: ${err.message}` : err,
      );
    })
    .finally(() => clearTimeout(timer));
  waitUntil(run);
}
