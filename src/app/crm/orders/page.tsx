import { requireSession } from "@/lib/crm/session";
import { fetchLeads, euros, money } from "@/lib/crm/leads";
import { PageHeader, Stat, StatRow, Note } from "../ui";
import OrdersTable from "./table";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  requireSession();
  const result = await fetchLeads();

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Orders" />
        <Note tone="warn">Orders could not be loaded. {result.reason}</Note>
      </>
    );
  }

  const { leads, generated, stripeUpcomingPayout, sourceErrors } = result.data;
  const paid = leads.filter((l) => l.type === "Paid Order");
  const revenue = paid.reduce((sum, l) => sum + euros(l.amount), 0);
  const upcoming = leads.filter((l) => l.upcoming).length;
  const enquiries = leads.filter((l) => l.type === "Contact Enquiry").length;
  const consults = leads.filter((l) => l.type === "Consultation").length;

  const stamp = new Date(generated).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        sub="Paid orders from Stripe, bookings from Calendly and enquiries from the contact form, in one list."
        aside={<span className="text-xs text-slate-500">Read at {stamp}</span>}
      />

      <StatRow>
        <Stat label="Paid orders" value={String(paid.length)} />
        <Stat label="Revenue" value={money(revenue)} note="Sum of paid orders in this list" />
        <Stat label="Upcoming" value={String(upcoming)} note="Installs and calls still ahead" tone={upcoming ? "good" : "plain"} />
        <Stat label="Consultations" value={String(consults)} />
        <Stat label="Enquiries" value={String(enquiries)} />
      </StatRow>

      {stripeUpcomingPayout && (
        <p className="mb-4 text-sm text-slate-600">
          Next Stripe payout: <span className="font-medium tabular-nums text-slate-900">{stripeUpcomingPayout}</span>
        </p>
      )}

      {/* A source that failed is named rather than hidden. A dashboard that
          quietly drops Calendly and still shows a confident total is how a
          quiet day and a broken integration come to look identical. */}
      {sourceErrors?.length ? (
        <div className="mb-4">
          <Note tone="warn">
            Some sources did not answer, so this list is incomplete:{" "}
            {sourceErrors.map((e) => `${e.source} (${e.message})`).join("; ")}
          </Note>
        </div>
      ) : null}

      <OrdersTable leads={leads} />
    </>
  );
}
