import Link from "next/link";
import { requireSession } from "@/lib/crm/session";
import { listMailings, readiness, type MailingSummary } from "@/lib/email/mailings";
import { BASIS_LABEL, MAILING_TEMPLATES } from "@/lib/email/mailing-rules";
import { allApprovals } from "@/lib/signoff/state";
import { PageHeader, Panel, Note, Pill } from "../ui";
import { ActionForm, SubmitButton } from "../action-form";
import { SIGNOFF_BADGE } from "../signoff/badges";
import { changeSending, importRecipients, startMailing } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Announcements to past customers. Setting one up and adding people to it
 * sends nothing; pressing Start does, fifty a day on weekday mornings, and
 * only while the email is approved in Sign-off in its current wording.
 */

const STATUS_WORD: Record<MailingSummary["status"], string> = {
  draft: "Set up, not started",
  sending: "Sending",
  paused: "Paused",
  done: "Finished",
};

const btn = "min-h-[40px] rounded-lg px-4 text-sm font-medium";

export default async function MailingsPage() {
  requireSession();
  const problems = readiness();
  const { states } = await allApprovals();
  let mailings: MailingSummary[] = [];
  let readError: string | null = null;
  try {
    mailings = await listMailings();
  } catch (err) {
    readError = err instanceof Error ? err.message : String(err);
  }

  return (
    <>
      <PageHeader
        title="Mailings"
        sub="Announcements to past customers. An email goes out only once it is approved in Sign-off, fifty a day on weekday mornings, and never to anyone who has unsubscribed."
      />
      <div className="space-y-6">
        {problems.length ? (
          <Note tone="warn">
            <p className="font-medium">Nothing can be sent until these are done:</p>
            <ul className="mt-1 list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Note>
        ) : (
          <Note>Ready to send: the sending address, the unsubscribe links and the email provider are all set up.</Note>
        )}
        {readError && <Note tone="warn">The mailings could not be read ({readError.slice(0, 160)}).</Note>}
        <Note>
          Who can be emailed: people who bought from Smart Space in the last 12 months and were given a way to say no to
          marketing when they bought, about similar services only, or anyone who said yes to marketing emails. The
          website&apos;s checkout has no way to say no to marketing, so buying online on its own does not count. Each
          person&apos;s basis is recorded when they are added, and checked again on the day each email goes.
        </Note>

        {MAILING_TEMPLATES.map((t) => {
          const st = states.get(t.itemId);
          const badge = st ? SIGNOFF_BADGE[st.state] : SIGNOFF_BADGE.unknown;
          const current = mailings.find((m) => m.template === t.id && m.status !== "done");
          const finished = mailings.filter((m) => m.template === t.id && m.status === "done").length;
          const approved = st?.approved === true;
          return (
            <Panel
              key={t.id}
              title={t.title}
              aside={
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/crm/signoff#${t.itemId}`}>
                    <Pill className={badge.className}>{badge.label}</Pill>
                  </Link>
                  <Link href={`/crm/emails?e=${t.id}`} className="text-xs font-medium text-slate-600 underline">
                    Read it
                  </Link>
                </span>
              }
            >
              <div className="space-y-4 px-4 py-4">
                <p className="text-sm text-slate-600">
                  Can go to people who {t.bases.map((b) => BASIS_LABEL[b]).join(", or who ")}.
                  {finished ? ` Sent ${finished} time${finished === 1 ? "" : "s"} before.` : ""}
                </p>

                {!current ? (
                  <ActionForm action={startMailing} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="template" value={t.id} />
                    <SubmitButton pendingLabel="Setting up" className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
                      Set up this mailing
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Pill className="bg-slate-100 text-slate-700 ring-slate-500/20">{STATUS_WORD[current.status]}</Pill>
                      <span className="text-slate-600">
                        {current.counts.queued} waiting, {current.counts.sent} sent, {current.counts.skipped} skipped
                        {current.counts.failed ? `, ${current.counts.failed} failed` : ""}
                      </span>
                    </div>

                    <ActionForm action={changeSending} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="mailing" value={current.id} />
                      {current.status === "sending" ? (
                        <>
                          <input type="hidden" name="to" value="paused" />
                          <SubmitButton pendingLabel="Pausing" className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
                            Pause
                          </SubmitButton>
                        </>
                      ) : (
                        <>
                          <input type="hidden" name="to" value="sending" />
                          <SubmitButton
                            pendingLabel="Starting"
                            className={`${btn} bg-slate-900 text-white hover:bg-slate-800 ${!approved || problems.length || !current.counts.queued ? "pointer-events-none opacity-40" : ""}`}
                          >
                            Start sending
                          </SubmitButton>
                          {!approved && <span className="text-xs text-slate-500">Approve the email in Sign-off first.</span>}
                          {approved && !current.counts.queued && <span className="text-xs text-slate-500">Add people below first.</span>}
                        </>
                      )}
                    </ActionForm>

                    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-800">Add people to this mailing</summary>
                      <ActionForm action={importRecipients} className="mt-3 space-y-3">
                        <input type="hidden" name="mailing" value={current.id} />
                        <input type="hidden" name="template" value={t.id} />
                        <fieldset>
                          <legend className="mb-1.5 text-xs font-semibold text-slate-700">They can be emailed because they</legend>
                          {t.bases.map((b) => (
                            <label key={b} className="flex items-center gap-2 text-sm text-slate-800">
                              <input type="radio" name="basis" value={b} className="h-4 w-4 accent-slate-900" />
                              {BASIS_LABEL[b]}
                            </label>
                          ))}
                        </fieldset>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-700">
                            One person per line: email, first name, date of last purchase (for example 14/03/2026)
                          </span>
                          <textarea
                            name="lines"
                            rows={6}
                            placeholder={"mary@example.com, Mary, 14/03/2026"}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-700">Where the list came from</span>
                          <input
                            name="source"
                            placeholder="For example: Stripe orders, March to September 2026"
                            className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                          />
                        </label>
                        <SubmitButton pendingLabel="Adding" className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}>
                          Add them
                        </SubmitButton>
                      </ActionForm>
                    </details>
                  </>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
