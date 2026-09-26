import { requireSession } from "@/lib/crm/session";
import { fetchLeads, euros, money, staleFeed } from "@/lib/crm/leads";
import { PageHeader, Stat, StatRow, Note } from "../ui";
import OrdersTable from "./table";
import { fetchMarks } from "@/lib/crm/order-marks";
import { isMonthKey } from "@/lib/crm/month";

export const dynamic = "force-dynamic";
/* SmartCare Living's sheet can take most of a minute to wake. */
export const maxDuration = 60;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  /* Validated rather than trusted: it reaches a filter, and "2026-09" is the
     only shape that means anything to one. */
  const month = isMonthKey(sp.month) ? sp.month : undefined;
  const { site } = requireSession();
  const [result, marks] = await Promise.all([fetchLeads(site), fetchMarks(site)]);

  if (!result.ok) {
    return (
      <>
        <PageHeader title={site === "smartcareliving" ? "Enquiries" : "Orders"} />
        <Note tone="warn">{site === "smartcareliving" ? "The enquiries" : "The orders"} could not be loaded, so none are shown. {result.reason}</Note>
      </>
    );
  }

  const { leads, generated, stripeUpcomingPayout, sourceErrors } = result.data;
  const paid = leads.filter((l) => l.type === "Paid Order");
  const revenue = paid.reduce((sum, l) => sum + euros(l.amount), 0);
  const upcoming = leads.filter((l) => l.upcoming).length;
  const enquiries = leads.filter((l) => l.type === "Contact Enquiry").length;
  const consults = leads.filter((l) => l.type === "Consultation").length;
  const scl = site === "smartcareliving";
  const urgent = leads.filter((l) => l.status === "Urgent").length;
  /* Seven days back, counted off the same "DD/MM/YYYY, HH:MM" the rows carry. */
  const weekAgo = Date.now() - 7 * 86_400_000;
  const recent = leads.filter((l) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(l.date);
    return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) >= weekAgo : false;
  }).length;

  const stamp = new Date(generated).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <>
      <PageHeader
        title={scl ? "Enquiries" : "Orders"}
        sub={
          scl
            ? "Every quiz, contact form and callback request from the site, newest first."
            : "Paid orders from Stripe, bookings from Calendly and enquiries from the contact form, in one list."
        }
        aside={<span className="text-xs text-slate-500">Read at {stamp}</span>}
      />

      {/* SmartCare Living sells a subscription that lives in Stripe, not a job
          that is paid for on the way in, so its sheet has no paid orders and a
          "Revenue: €0" tile would be a wrong answer rather than an empty one. */}
      <StatRow>
        {scl ? (
          <>
            <Stat label="Enquiries" value={String(leads.length)} />
            <Stat label="Urgent" value={String(urgent)} note="Asked for a callback" tone={urgent ? "warn" : "plain"} />
            <Stat label="Consultations" value={String(consults)} explain="consultations" />
            <Stat label="Upcoming" value={String(upcoming)} note="Calls still ahead" tone={upcoming ? "good" : "plain"} />
            <Stat label="Last seven days" value={String(recent)} />
          </>
        ) : (
          <>
            <Stat label="Paid orders" value={String(paid.length)} explain="paidOrders" />
            <Stat label="Revenue" value={money(revenue)} note="Sum of paid orders in this list" />
            <Stat label="Upcoming" value={String(upcoming)} note="Installs and calls still ahead" tone={upcoming ? "good" : "plain"} />
            <Stat label="Consultations" value={String(consults)} explain="consultations" />
            <Stat label="Enquiries" value={String(enquiries)} />
          </>
        )}
      </StatRow>

      {stripeUpcomingPayout && (
        <p className="mb-4 text-sm text-slate-600">
          Next Stripe payout: <span className="font-medium tabular-nums text-slate-900">{stripeUpcomingPayout}</span>
        </p>
      )}

      {/* A source that failed is named rather than hidden. A dashboard that
          quietly drops Calendly and still shows a confident total is how a
          quiet day and a broken integration come to look identical. */}
      {staleFeed(result.data) && (
        <div className="mb-4"><Note tone="warn">{staleFeed(result.data)}</Note></div>
      )}

      {marks.problem && (
        <div className="mb-4"><Note tone="warn">{marks.problem}</Note></div>
      )}

      {sourceErrors?.length ? (
        <div className="mb-4">
          <Note tone="warn">
            Some sources did not answer, so this list is incomplete:{" "}
            {sourceErrors.map((e) => `${e.source} (${e.message})`).join("; ")}
          </Note>
        </div>
      ) : null}

      {/* The marks travel as a plain object because the table is a client
          component and a Map does not cross that boundary. */}
      <OrdersTable month={month}
        leads={leads}
        marks={(() => {
          const m: Record<string, "cancelled" | "done"> = {};
          marks.forEach((v, k) => { m[k] = v.state; });
          return m;
        })()}
      />
    </>
  );
}
