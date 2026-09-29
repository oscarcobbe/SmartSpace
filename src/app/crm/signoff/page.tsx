import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { allApprovals } from "@/lib/signoff/state";
import { GROUP_TITLE, SIGNOFF_ITEMS, type SignoffGroup } from "@/lib/signoff/items";
import type { ApprovalState } from "@/lib/signoff/verdict";
import { PageHeader, Panel, Note, Pill } from "../ui";
import { ActionForm, SubmitButton } from "../action-form";
import { SIGNOFF_BADGE } from "./badges";
import { decide } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Everything waiting for Nigel's approval before it reaches a customer or the
 * public site. Each item links to what it is, and his decision is kept with
 * the exact version he saw: edit the item afterwards and it comes back here.
 */

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const ORDER: SignoffGroup[] = ["reminders", "booking", "after", "network", "mailings"];

export default async function SignoffPage() {
  requireSession();
  const { states, history, problem } = await allApprovals();

  const count = (s: ApprovalState) => SIGNOFF_ITEMS.filter((i) => states.get(i.id)?.state === s).length;
  const waiting = count("waiting") + count("stale");

  return (
    <>
      <PageHeader
        title="Sign-off"
        sub="New emails, texts and pages wait here for your approval. Nothing on this page reaches a customer or the public site until you approve it, and if an item is edited after you approve it, it comes back here."
        aside={
          <span className="flex flex-wrap gap-2">
            <Pill className={SIGNOFF_BADGE.waiting.className}>{waiting} waiting</Pill>
            <Pill className={SIGNOFF_BADGE.approved.className}>{count("approved")} approved</Pill>
            {count("changes") ? <Pill className={SIGNOFF_BADGE.changes.className}>{count("changes")} with changes asked</Pill> : null}
          </span>
        }
      />

      <div className="space-y-6">
        {problem && <Note tone="warn">{problem} Nothing new can send until this is fixed.</Note>}
        <Note>
          The emails and texts can be read in full, on a computer or a phone layout, under{" "}
          <Link href="/crm/emails" className="font-medium text-slate-900 underline">Emails and texts</Link>.
        </Note>

        {ORDER.map((group) => {
          const items = SIGNOFF_ITEMS.filter((i) => i.group === group);
          return (
            <Panel key={group} title={GROUP_TITLE[group]}>
              <ul className="divide-y divide-slate-200">
                {items.map((item) => {
                  const st = states.get(item.id)!;
                  const badge = SIGNOFF_BADGE[st.state];
                  const past = history.get(item.id) ?? [];
                  const chosen = st.latest?.choice ?? null;
                  return (
                    <li key={item.id} id={item.id} className="scroll-mt-20 px-4 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-slate-900">{item.title}</h3>
                          <p className="mt-0.5 text-sm text-slate-600">{item.effect}</p>
                        </div>
                        <Pill className={badge.className}>{badge.label}</Pill>
                      </div>

                      {st.latest && (
                        <p className="mt-2 text-xs text-slate-500">
                          {st.latest.decision === "approved" ? "Approved" : "Changes asked for"} by {st.latest.decided_by}, {when(st.latest.decided_at)}
                          {st.state === "approved" && chosen && item.choices ? `. ${item.choices.find((c) => c.id === chosen)?.label ?? ""}` : ""}
                          {st.state === "stale" ? ". It has changed since, so it needs your approval again." : ""}
                        </p>
                      )}
                      {st.latest?.decision === "changes" && st.latest.comment && (
                        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">&ldquo;{st.latest.comment}&rdquo;</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.preview.map((p) => {
                          const inCrm = p.href.startsWith("/crm/");
                          return inCrm ? (
                            <Link key={p.href} href={p.href} className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                              {p.label}
                            </Link>
                          ) : (
                            <a
                              key={p.href}
                              href={p.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {p.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          );
                        })}
                      </div>

                      <ActionForm action={decide} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
                        <input type="hidden" name="item" value={item.id} />
                        {item.choices && (
                          <fieldset className="basis-full">
                            <legend className="mb-1.5 text-xs font-semibold text-slate-700">When should it go?</legend>
                            <div className="flex flex-col gap-1.5">
                              {item.choices.map((c) => (
                                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-800">
                                  <input type="radio" name="choice" value={c.id} defaultChecked={chosen === c.id} className="h-4 w-4 accent-slate-900" />
                                  {c.label}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        )}
                        <fieldset className="flex flex-wrap gap-x-5 gap-y-1.5">
                          <legend className="sr-only">Your decision</legend>
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            <input type="radio" name="decision" value="approved" className="h-4 w-4 accent-emerald-600" />
                            Approve it as it is
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            <input type="radio" name="decision" value="changes" className="h-4 w-4 accent-rose-600" />
                            It needs changes
                          </label>
                        </fieldset>
                        <label className="min-w-[220px] flex-1">
                          <span className="sr-only">Note</span>
                          <input
                            name="comment"
                            placeholder="What should change (optional when approving)"
                            className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                          />
                        </label>
                        <SubmitButton pendingLabel="Saving" className="min-h-[40px] rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
                          Save
                        </SubmitButton>
                      </ActionForm>

                      {past.length > 1 && (
                        <details className="mt-3 text-xs text-slate-500">
                          <summary className="cursor-pointer">Earlier decisions ({past.length - 1})</summary>
                          <ul className="mt-2 space-y-1">
                            {past.slice(1).map((r) => (
                              <li key={r.decided_at}>
                                {r.decision === "approved" ? "Approved" : "Changes asked for"} by {r.decided_by}, {when(r.decided_at)}
                                {r.comment ? `: "${r.comment}"` : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
