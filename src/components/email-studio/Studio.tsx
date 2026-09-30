import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { ENTRIES, STAGES, smsParts, type Entry, type Stage, type Status } from "@/lib/email/catalogue";

/**
 * The email studio: every message a customer gets from Smart Space, in the
 * order they get them, rendered from the same functions that send them.
 *
 * One component, two homes. In the CRM (/crm/emails) it sits behind the CRM's
 * sign-in and shows each message's sign-off state beside it; under next dev
 * (/dev/emails) it runs with no CRM at all, for designing.
 */

const STATUS: Record<Status, { label: string; dot: string; pill: string }> = {
  live: { label: "Live", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  paused: { label: "Paused", dot: "bg-amber-400", pill: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  draft: { label: "Draft", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-700 ring-slate-500/20" },
};

export type View = "desktop" | "phone" | "text";

export interface SignoffBadge {
  label: string;
  className: string;
  href: string;
}

export default function Studio({
  basePath,
  entryId,
  view: rawView,
  signoff,
  entries,
  stages,
}: {
  basePath: string;
  entryId?: string;
  view?: string;
  /** Sign-off state per studio entry id, when the CRM can say. */
  signoff?: Record<string, SignoffBadge>;
  /** Another site's messages (SmartCare Living's, fetched from its own code). Smart Space's when absent. */
  entries?: Entry[];
  stages?: Stage[];
}) {
  const list = entries ?? ENTRIES;
  const stageList = stages ?? STAGES;
  const entry = list.find((e) => e.id === entryId) ?? list[0];
  const view: View = rawView === "phone" || rawView === "text" ? rawView : "desktop";
  const out = entry.render();
  const isSms = "sms" in out;
  const href = (e: string, v: View = view) => `${basePath}?e=${e}&v=${v}`;
  const badge = signoff?.[entry.id];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
      <nav className="space-y-5 lg:sticky lg:top-4" aria-label="The customer's journey">
        {stageList.map((stage, i) => {
          const items = list.filter((e) => e.stage === stage.id);
          if (!items.length) return null;
          return (
            <section key={stage.id}>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-[11px] font-semibold tabular-nums text-brand-600">{i + 1}</span>
                <h2 className="text-sm font-semibold text-slate-900">{stage.title}</h2>
              </div>
              <p className="mb-2 pl-4 text-xs text-slate-500">{stage.blurb}</p>
              <ul className="space-y-0.5">
                {items.map((e) => {
                  const active = e.id === entry.id;
                  const b = signoff?.[e.id];
                  return (
                    <li key={e.id}>
                      <Link
                        href={href(e.id)}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-[40px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                          active ? "bg-white font-medium text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.08)] ring-1 ring-slate-200" : "text-slate-700 hover:bg-white/70"
                        }`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS[e.status].dot}`} aria-hidden="true" />
                        {e.channel === "sms" ? (
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Text message" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Email" />
                        )}
                        <span className="min-w-0 flex-1">{e.name}</span>
                        {b ? <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${b.className}`}>{b.label}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>

      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-slate-900">{entry.name}</h2>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS[entry.status].pill}`}>
              {STATUS[entry.status].label}
            </span>
            {badge ? (
              <Link href={badge.href} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset hover:underline ${badge.className}`}>
                {badge.label}
              </Link>
            ) : null}
          </div>
          <p className="mb-5 text-sm text-slate-600">{entry.statusNote}</p>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {!isSms && (
              <>
                <Meta k="Subject" v={out.subject} strong />
                <Meta k="Inbox preview" v={out.preheader} />
              </>
            )}
            <Meta k="Sent when" v={entry.trigger} />
            <Meta k="Timing" v={entry.timing} />
            <Meta k="From" v={entry.from} />
            <Meta k="Replies go to" v={entry.replyTo} />
            {entry.alongside ? <Meta k="Also arrives" v={entry.alongside} /> : null}
            {entry.changes ? <Meta k="Changes from today" v={entry.changes} /> : null}
          </dl>
        </section>

        {isSms ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
            <div className="mx-auto min-h-[240px] max-w-[340px] rounded-[2rem] border-8 border-slate-900 bg-slate-50 p-4">
              <div className="mb-3 text-center text-[11px] text-slate-500">Text message</div>
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[15px] leading-snug text-slate-900 shadow-sm">{out.sms}</div>
              {(() => {
                const p = smsParts(out.sms);
                return (
                  <div className={`mt-2 text-[11px] ${p.parts > 1 ? "font-semibold text-rose-700" : "text-slate-500"}`}>
                    {p.units} characters in {p.encoding}, billed as {p.parts === 1 ? "one text" : `${p.parts} texts`}
                    {p.offenders.length
                      ? `. Forced to UCS-2 by: ${p.offenders.map((c) => `"${c}" (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ")}`
                      : ""}
                  </div>
                );
              })()}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-5">
            <div className="mb-4 flex items-center gap-1.5" role="tablist" aria-label="Preview">
              {(["desktop", "phone", "text"] as View[]).map((v) => (
                <Link
                  key={v}
                  href={href(entry.id, v)}
                  role="tab"
                  aria-selected={view === v}
                  className={`min-h-[36px] rounded-full px-4 py-2 text-sm font-medium ${
                    view === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {v === "desktop" ? "Desktop" : v === "phone" ? "Phone" : "Plain text"}
                </Link>
              ))}
            </div>
            {view === "text" ? (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-5 font-mono text-sm leading-relaxed text-slate-800">{out.text}</pre>
            ) : (
              <div className="flex justify-center overflow-x-auto rounded-lg bg-slate-100 p-3 sm:p-6">
                <iframe
                  key={entry.id + view}
                  title={`${entry.name}, ${view} preview`}
                  srcDoc={out.html}
                  sandbox=""
                  className="rounded-lg bg-white shadow-lg"
                  style={{ width: view === "phone" ? 390 : 680, height: view === "phone" ? 844 : 1100, border: 0, flex: "none" }}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Meta({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className={`mt-0.5 break-words text-slate-900 ${strong ? "font-semibold" : ""}`}>{v}</dd>
    </div>
  );
}
