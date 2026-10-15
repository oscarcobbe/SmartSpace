/**
 * Enquiries nobody has marked yet, at the top of the home page, each with the
 * three marks as one tap.
 *
 * On 15 October 2026 none of the 38 enquiries of the previous 45 days carried
 * a traffic light, because the light was only on each customer's page. This
 * puts the unmarked ones where Nigel lands, newest first. A tap saves through
 * the same write as everywhere else (saveLead, src/lib/crm/lead-mark.ts) and
 * the row leaves the list. Paid orders are left out: a sale is already the
 * best answer Google can get, and the light is about enquiries.
 */
import Link from "next/link";
import { crm, crmConfigured, unlessWrongKey, type Site } from "@/lib/crm/db";
import { LIGHTS, LIGHT_LABEL, LIGHT_DOT, sourceLabel } from "@/lib/crm/labels";
import { ActionForm, SubmitButton } from "./action-form";
import { saveLead } from "./contacts/actions";
import { Panel, Note, Empty } from "./ui";

const WINDOW_DAYS = 60;
const SHOWN = 8;
/* Sources that are a sale or a booking already paid for, not an enquiry to judge. */
const NOT_ENQUIRIES = ["paid_order", "stripe"];

type Row = { id: string; source: string | null; source_detail: string | null; created_at: string; contact_id: string | null };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short" });

export async function ToMark({ site }: { site: Site }) {
  if (!crmConfigured()) return null;
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  let rows: Row[] = [];
  let names = new Map<string, string>();
  let total = 0;
  try {
    const all = await unlessWrongKey(await crm<Row[]>(
      `crm_leads?site=eq.${site}&created_at=gte.${since}&status=neq.spam` +
        `&source=not.in.(${NOT_ENQUIRIES.join(",")})&custom->>lead_light=is.null` +
        `&select=id,source,source_detail,created_at,contact_id&order=created_at.desc&limit=200`,
    ));
    total = all.length;
    rows = all.slice(0, SHOWN);
    const ids = Array.from(new Set(rows.map((r) => r.contact_id).filter((v): v is string => Boolean(v))));
    if (ids.length) {
      const people = await unlessWrongKey(await crm<{ id: string; name: string | null; first_name: string | null }[]>(
        `crm_contacts?site=eq.${site}&id=in.(${ids.join(",")})&select=id,name,first_name`,
      ));
      names = new Map(people.map((p) => [p.id, p.name || p.first_name || ""]));
    }
  } catch (err) {
    return (
      <Panel title="To mark">
        <div className="px-4 py-4">
          <Note tone="warn">Unmarked enquiries could not be read ({err instanceof Error ? err.message.slice(0, 160) : "no answer"}).</Note>
        </div>
      </Panel>
    );
  }

  const aside = total > 0 ? <span className="text-xs text-slate-500">{total} in the last {WINDOW_DAYS} days</span> : undefined;
  if (total === 0) {
    return (
      <Panel title="To mark">
        <Empty title="Every enquiry is marked" detail="New ones appear here until you mark them good, maybe or not a lead." />
      </Panel>
    );
  }

  return (
    <Panel title="To mark" aside={aside}>
      <p className="px-4 pt-3 text-sm text-slate-600">
        How good was each one? Good and maybe enquiries that came from an ad are passed to Google, so it looks for more people like them.
      </p>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const name = (r.contact_id && names.get(r.contact_id)) || "Somebody";
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-48">
                {r.contact_id ? (
                  <Link href={`/crm/contacts/${r.contact_id}`} className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline">{name}</Link>
                ) : (
                  <span className="text-sm font-medium text-slate-900">{name}</span>
                )}
                <p className="truncate text-xs text-slate-500">
                  {sourceLabel(r.source)}{r.source_detail ? `, ${r.source_detail}` : ""} · {when(r.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {LIGHTS.map((lt) => (
                  <ActionForm key={lt} action={saveLead} quiet className="flex">
                    <input type="hidden" name="leadId" value={r.id} />
                    <input type="hidden" name="contactId" value={r.contact_id ?? ""} />
                    <input type="hidden" name="light" value={lt} />
                    <SubmitButton
                      pendingLabel="Saving"
                      ariaLabel={`${LIGHT_LABEL[lt]}: ${name}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[34px]"
                    >
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${LIGHT_DOT[lt]}`} aria-hidden="true" />
                      {LIGHT_LABEL[lt]}
                    </SubmitButton>
                  </ActionForm>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {total > SHOWN && (
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          {total - SHOWN} more after these. They move up as you mark the ones above.
        </p>
      )}
    </Panel>
  );
}
