import { AlertCircle } from "lucide-react";
import Job from "./job";
import { requireSession } from "@/lib/crm/session";
import { fetchWeek } from "@/lib/crm/week";
import { PageHeader, Panel, Note, Empty } from "../ui";
import { displayName } from "@/lib/crm/diary";
import { plainText } from "@/lib/crm/display";

export const dynamic = "force-dynamic";
/* SmartCare Living's sheet can take most of a minute to wake. */
export const maxDuration = 60;

const dash = (v: string | undefined) => plainText(v);

export default async function WeekPage() {
  const { site } = requireSession();
  const week = await fetchWeek(site, 14);

  if (week.problem) {
    return (
      <>
        <PageHeader title="The diary" />
        <Note tone="warn">The diary could not be loaded, so no bookings are shown. {week.problem}</Note>
      </>
    );
  }

  const withJobs = week.days.filter((d) => d.jobs.length > 0);

  return (
    <>
      <PageHeader
        title="The diary"
        sub="What is booked for the next fourteen days, in the order it happens."
        aside={<span className="text-xs text-slate-500">{week.booked} booked</span>}
      />

      {week.warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {week.warnings.map((w) => <Note key={w} tone="warn">{w}</Note>)}
        </div>
      )}

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
                  <span className="text-slate-900">{displayName(l)}</span>
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
              aside={<span className="text-xs text-slate-500">{day.jobs.length} {day.jobs.length === 1 ? "booking" : "bookings"}</span>}
            >
              <ul className="divide-y divide-slate-100">
                {day.jobs.map((l, i) => <Job key={`${l.orderId}-${i}`} lead={l} />)}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {week.later.length > 0 && (
        <div className="mt-4">
          <Panel
            title="Booked further ahead"
            aside={<span className="text-xs text-slate-500">{week.later.length} {week.later.length === 1 ? "booking" : "bookings"} past the fortnight</span>}
          >
            {/* Everything beyond the day panels, in the order it happens. A job
                booked three weeks out used to appear on nothing until it drifted
                inside the window, which is late to find out where you are going. */}
            <ul className="divide-y divide-slate-100">
              {week.later.map((x, i) => <Job key={`${x.job.orderId}-${i}`} lead={x.job} dateLabel={x.label} />)}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
