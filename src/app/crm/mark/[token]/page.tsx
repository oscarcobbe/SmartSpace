/**
 * The page behind the three buttons in an enquiry email.
 *
 * No sign-in: the signed token in the address is the permission, and it names
 * one enquiry. Opening it changes nothing (mail scanners open every link in a
 * message), so the choice from the email arrives picked and waits for Save.
 * See src/lib/crm/mark-link.ts.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readMarkToken } from "@/lib/crm/mark-link";
import { SITE_LABEL } from "@/lib/crm/session";
import { LIGHTS, LIGHT_LABEL, LIGHT_DOT, STATUS_LABEL, sourceLabel, telHref, lightOf } from "@/lib/crm/labels";
import { ActionForm, SubmitButton } from "../../action-form";
import { Note } from "../../ui";
import { saveMark } from "./actions";
import { findMarkedLead, contactOf, MARK_STATUSES } from "./lead";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mark this enquiry", robots: { index: false, follow: false, nocache: true } };

const LIGHT_HINT: Record<string, string> = {
  green: "Somebody you'd go after",
  amber: "Might come good",
  red: "Not someone we can help",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IE", { timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function MarkPage({ params, searchParams }: { params: { token: string }; searchParams: { mark?: string } }) {
  const t = readMarkToken(params.token);
  if (!t) notFound();

  let problem: string | null = null;
  let lead: Awaited<ReturnType<typeof findMarkedLead>> = null;
  let person: Awaited<ReturnType<typeof contactOf>> = null;
  try {
    lead = await findMarkedLead(t.site, t.ref);
    person = lead ? await contactOf(t.site, lead.contact_id) : null;
  } catch (err) {
    problem = `The CRM did not answer (${err instanceof Error ? err.message.slice(0, 140) : "no answer"}). Try the link again in a minute.`;
  }

  const shell = (body: React.ReactNode) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight text-slate-900">{SITE_LABEL[t.site]}</span>
      </div>
      {body}
    </div>
  );

  if (problem) return shell(<Note tone="warn">{problem}</Note>);
  if (!lead) {
    return shell(
      <Note tone="warn">
        This enquiry is not in the CRM yet. It usually arrives within a few seconds of the email; if it still is not here in an hour, the
        website could not reach the CRM, and the enquiry is in the email and the leads sheet only.
      </Note>,
    );
  }

  const current = lightOf(lead.custom);
  const asked = searchParams.mark === "green" || searchParams.mark === "amber" || searchParams.mark === "red" ? searchParams.mark : null;
  const picked = asked ?? current;
  const name = person?.name || person?.first_name || "Somebody";
  const tel = telHref(person?.phone);
  const note = typeof lead.custom?.lead_light_note === "string" ? lead.custom.lead_light_note : "";
  const statuses = MARK_STATUSES.includes(lead.status) ? MARK_STATUSES : [lead.status, ...MARK_STATUSES];

  return shell(
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{name}</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          {sourceLabel(lead.source)}{lead.source_detail ? `, ${lead.source_detail}` : ""} · {when(lead.created_at)}
        </p>
        {(person?.phone || person?.email) && (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {person?.phone && (tel ? <a href={tel} className="font-medium text-brand-700 underline underline-offset-2">{person.phone}</a> : <span>{person.phone}</span>)}
            {person?.email && <span className="break-all text-slate-700">{person.email}</span>}
          </p>
        )}
        {lead.message && (
          <p className="mt-3 line-clamp-6 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{lead.message}</p>
        )}
      </div>

      <ActionForm action={saveMark} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <input type="hidden" name="token" value={params.token} />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-900">How good is this enquiry?</legend>
          <div className="grid gap-2">
            {LIGHTS.map((lt) => (
              <label
                key={lt}
                className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 text-[15px] text-slate-800 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50 has-[:checked]:ring-1 has-[:checked]:ring-slate-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500"
              >
                <input type="radio" name="light" value={lt} defaultChecked={picked === lt} className="sr-only" />
                <span className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${LIGHT_DOT[lt]}`} aria-hidden="true" />
                <span className="font-medium">{LIGHT_LABEL[lt]}</span>
                <span className="ml-auto text-xs text-slate-500">{LIGHT_HINT[lt]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-900">Where it stands</legend>
          <div className="flex flex-wrap gap-2">
            {statuses.map((st) => (
              <label
                key={st}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 has-[:checked]:border-slate-900 has-[:checked]:font-medium has-[:checked]:text-slate-900 has-[:checked]:ring-1 has-[:checked]:ring-slate-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500"
              >
                <input type="radio" name="status" value={st} defaultChecked={lead.status === st} className="sr-only" />
                {STATUS_LABEL[st] ?? st}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="mark-note" className="mb-1 block text-sm font-semibold text-slate-900">Note <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea
            id="mark-note"
            name="note"
            rows={3}
            maxLength={2000}
            defaultValue={note}
            placeholder="What they want, when to ring back, anything worth remembering"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <SubmitButton pendingLabel="Saving" className="min-h-[48px] w-full rounded-lg bg-slate-900 px-4 text-[15px] font-semibold text-white hover:bg-slate-800">
          Save
        </SubmitButton>
      </ActionForm>

      {lead.contact_id && (
        <p className="text-center text-sm text-slate-500">
          <a href={`/crm/contacts/${lead.contact_id}`} className="underline underline-offset-2">Open them in the CRM</a> (asks you to sign in)
        </p>
      )}
    </>,
  );
}
