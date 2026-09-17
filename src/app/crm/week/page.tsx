import { AlertCircle, CalendarClock, MapPin, Phone } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { fetchWeek } from "@/lib/crm/week";
import { telHref } from "@/lib/crm/labels";
import { PageHeader, Panel, Note, Empty, Pill, PILL_KIND } from "../ui";

export const dynamic = "force-dynamic";

const dash = (v: string | undefined) => (!v || v === "-" ? "" : v);

export default async function WeekPage() {
  const { site } = requireSession();
  const week = await fetchWeek(site, 14);

  if (week.problem) {
    return (
      <>
        <PageHeader title="This week" />
        <Note tone="warn">The diary could not be loaded. {week.problem}</Note>
      </>
    );
  }

  const withJobs = week.days.filter((d) => d.jobs.length > 0);

  return (
    <>
      <PageHeader
        title="This week"
        sub="What is booked, in the order it happens. The next fourteen days."
        aside={<span className="text-xs text-slate-500">{week.booked} booked</span>}
      />

      {/* A booking in the past still flagged as upcoming was never closed off.
          It is either done and unrecorded or it was missed, and both are worth
          seeing before they turn into a phone call. */}
      {week.overdue.length > 0 && (
        <div className="mb-6">
          <Panel title="Still open from before today">
            <ul className="divide-y divide-slate-100">
              {week.overdue.map((l, i) => (
                <li key={`${l.orderId}-${i}`} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <span className="text-slate-900">{dash(l.name) || "Unnamed"}</span>
                  <span className="text-slate-500">{dash(l.product) || l.type}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-amber-800">{dash(l.bookingDate)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {withJobs.length === 0 ? (
        <Panel>
          <Empty
            title="Nothing booked in the next fortnight"
            detail="Installations and calls appear here as soon as they are booked."
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          {withJobs.map((day) => (
            <Panel
              key={day.date}
              title={day.isToday ? `Today, ${day.label}` : day.label}
              aside={<span className="text-xs text-slate-500">{day.jobs.length} {day.jobs.length === 1 ? "job" : "jobs"}</span>}
            >
              <ul className="divide-y divide-slate-100">
                {day.jobs.map((l, i) => {
                  const tel = telHref(l.phone);
                  const address = dash(l.address);
                  return (
                    <li key={`${l.orderId}-${i}`} className="px-4 py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                            <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                            {dash(l.bookingSlot) || "Time not set"}
                            <span className="text-slate-400">·</span>
                            {dash(l.name) || "Unnamed"}
                          </p>
                          {dash(l.product) && <p className="mt-0.5 pl-6 text-sm text-slate-600">{l.product}</p>}
                          {address && (
                            <p className="mt-0.5 flex items-start gap-1.5 pl-6 text-sm text-slate-600">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="underline-offset-2 hover:underline"
                              >
                                {address}
                              </a>
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {dash(l.amount) && (
                            <span className="text-sm font-semibold tabular-nums text-slate-900">{l.amount}</span>
                          )}
                          <Pill className={l.type === "Paid Order" ? PILL_KIND.paid : PILL_KIND.consult}>{l.type}</Pill>
                          {tel && (
                            <a
                              href={tel}
                              aria-label={`Ring ${dash(l.name) || "this customer"}`}
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                              <Phone className="h-4 w-4" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
