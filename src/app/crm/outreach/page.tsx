import { ShieldCheck } from "lucide-react";
import { requireSession, SITE_LABEL } from "@/lib/crm/session";
import { fetchOutreach, OUTREACH_PILL, OUTREACH_LABEL } from "@/lib/crm/outreach";
import { PageHeader, Panel, Note, Empty, Stat, StatRow, Pill } from "../ui";

export const dynamic = "force-dynamic";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "2-digit" }) : "–";

/**
 * The one section that writes to people who did not ask to hear from us, so it
 * says what it will and will not do before it shows a single row, and it has no
 * button that sends anything.
 */
export default async function OutreachPage() {
  const { site } = requireSession();

  if (site !== "smartcareliving") {
    return (
      <>
        <PageHeader title="Outreach" />
        <Note>Outreach is set up for SmartCare Living only. {SITE_LABEL[site]} does none.</Note>
      </>
    );
  }

  const data = await fetchOutreach(site);

  if (!data) {
    return (
      <>
        <PageHeader title="Outreach" />
        <Note tone="warn">The database is not connected on this deployment yet.</Note>
      </>
    );
  }

  const sent = data.sends.filter((s) => s.sent_at).length;
  const replied = data.sends.filter((s) => s.replied_at).length;
  const failed = data.sends.filter((s) => s.failed_at).length;

  return (
    <>
      <PageHeader
        title="Outreach"
        sub="Introducing SmartCare Living to people who work in home care."
      />

      <div className="mb-6">
        <Note>
          <span className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-slate-900">Nothing here sends email.</strong>{" "}
              This is the list and the record. A prospect can only be written to once somebody has
              read it and written down why we may, and an address that has opted out is on a list
              that is never removed from. Sending gets built separately, with Oscar.
            </span>
          </span>
        </Note>
      </div>

      <StatRow>
        <Stat label="On the list" value={String(data.prospects.length)} />
        <Stat
          label="Cleared"
          value={String(data.approved)}
          note="Read by a person, may be written to"
          tone={data.approved ? "good" : "plain"}
        />
        <Stat label="Written to" value={String(sent)} />
        <Stat label="Replied" value={String(replied)} tone={replied ? "good" : "plain"} />
        <Stat label="Opted out" value={String(data.blocked)} note="Never written to again" />
      </StatRow>

      {data.withoutBasis > 0 && (
        <div className="mb-6">
          <Note tone="warn">
            {data.withoutBasis} {data.withoutBasis === 1 ? "prospect has" : "prospects have"} no
            reason recorded for why we may write to them. Those cannot be sent to. An unsolicited
            message to a business needs a basis and a working opt-out, and being on a list is not
            a basis.
          </Note>
        </div>
      )}

      {failed > 0 && (
        <div className="mb-6">
          <Note tone="warn">{failed} {failed === 1 ? "message" : "messages"} failed to send. See the record below.</Note>
        </div>
      )}

      <div className="space-y-6">
        <Panel title="The list">
          {data.prospects.length === 0 ? (
            <Empty
              title="Nobody on the list yet"
              detail="Prospects are imported and then read one at a time before anything is sent."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-2 font-semibold">Business</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Who</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Where</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Why we may write</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.prospects.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{p.business}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        <span className="block">{p.contact_name ?? "–"}</span>
                        {p.role && <span className="block text-xs text-slate-500">{p.role}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{p.county ?? "–"}</td>
                      <td className="px-4 py-2.5">
                        <Pill className={OUTREACH_PILL[p.status]}>{OUTREACH_LABEL[p.status]}</Pill>
                      </td>
                      <td className="max-w-[18rem] px-4 py-2.5">
                        {p.basis ? (
                          <span className="block truncate text-slate-700" title={p.basis}>{p.basis}</span>
                        ) : (
                          <span className="text-amber-700">Not recorded</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{day(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="What has been sent">
          {data.sends.length === 0 ? (
            <Empty title="Nothing sent" detail="Every message that goes out will be listed here, including the ones that fail." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-2 font-semibold">To</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Subject</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Sent</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.sends.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2.5 text-slate-700">{s.to_email}</td>
                      <td className="max-w-[20rem] px-4 py-2.5">
                        <span className="block truncate text-slate-900" title={s.subject}>{s.subject}</span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">{day(s.sent_at ?? s.queued_at)}</td>
                      <td className="px-4 py-2.5">
                        {s.failed_at ? (
                          <span className="text-rose-700" title={s.failure ?? undefined}>Failed</span>
                        ) : s.replied_at ? (
                          <span className="text-emerald-700">Replied</span>
                        ) : s.sent_at ? (
                          <span className="text-slate-600">Delivered</span>
                        ) : (
                          <span className="text-slate-500">Queued</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
