"use client";

import { Fragment, useMemo, useState } from "react";
import { monthOf, monthLabel } from "@/lib/crm/month";
import { orderKey } from "@/lib/crm/order-marks";
import { setOrderMark } from "./actions";
import { joinBookings } from "@/lib/crm/order-bookings";
import { ChevronDown, Download, MapPin, Search } from "lucide-react";
import type { Lead } from "@/lib/crm/leads";
import { telHref } from "@/lib/crm/labels";
import { toCsv, downloadCsv } from "@/lib/crm/csv";
import { Empty, Pill, PILL_KIND } from "../ui";

const TABS = ["All", "Paid Order", "Upcoming", "Installation", "Consultation", "Contact Enquiry"] as const;
type Tab = (typeof TABS)[number];

/** Short on the row, full in the filter. A pill that wraps to two lines makes
 *  the whole table row taller than the rows around it. */
const SHORT: Record<string, string> = {
  "Paid Order": "Paid",
  Upcoming: "Upcoming",
  Installation: "Install",
  Consultation: "Consultation",
  "Contact Enquiry": "Enquiry",
};

const KIND: Record<string, string> = {
  "Paid Order": PILL_KIND.paid,
  Upcoming: PILL_KIND.upcoming,
  Installation: PILL_KIND.install,
  Consultation: PILL_KIND.consult,
  "Contact Enquiry": PILL_KIND.enquiry,
};

/** The feed writes "-" for an absent value, which should render as nothing. */
const dash = (v: string | undefined) => (!v || v === "-" ? "" : v);

/** Stripe rows arrive as "18/07/2026, 21:20". The time is noise in a list of
 *  ninety of them; it is kept and shown in the expanded detail instead. */
const dayOnly = (v: string) => dash(v).split(",")[0] ?? "";

function csv(rows: Lead[]): string {
  return toCsv(
    ["Date", "Type", "Name", "Email", "Phone", "Address", "Product", "Amount", "Booking", "Slot", "Status", "Order ID"],
    rows.map((l) => [l.date, l.type, l.name, l.email, l.phone, l.address, l.product, l.amount, l.bookingDate, l.bookingSlot, l.status, l.orderId]),
  );
}

export default function OrdersTable({
  leads,
  marks = {},
  month,
}: {
  leads: Lead[];
  marks?: Record<string, "cancelled" | "done">;
  /**
   * One month, as 2026-09, arrived at by clicking that bar on Finance.
   *
   * The chart could say a month earned six thousand euro and the only way to
   * see which orders that was, was to read the whole list and do the dates in
   * your head. It is state in the URL rather than in the component so the view
   * survives a refresh and can be sent to somebody.
   */
  month?: string;
  /* Accepted and ignored: the page passes it, and dropping it there would be a
     second edit for no behaviour. */
  keyOf?: unknown;
}) {
  /* Stripe orders and Calendly appointments arrive as separate rows, so a
     customer who paid first and booked afterwards left the paid order reading
     "-". Their appointment is on another row in this same list; this carries
     it across so the table can answer when the van is actually due. */
  const borrowed = useMemo(() => joinBookings(leads), [leads]);
  const [tab, setTab] = useState<Tab>("All");
  const [q, setQ] = useState("");
  /* Cleared in place rather than by navigating, so dropping the month does not
     cost a round trip or lose the tab and search already set. */
  const [monthOn, setMonthOn] = useState(true);
  const activeMonth = monthOn ? month : undefined;
  const [open, setOpen] = useState<string | null>(null);

  const inMonth = useMemo(
    () => (activeMonth ? leads.filter((l) => monthOf(l.date) === activeMonth) : leads),
    [leads, activeMonth],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: inMonth.length, Upcoming: inMonth.filter((l) => l.upcoming).length };
    for (const l of inMonth) c[l.type] = (c[l.type] ?? 0) + 1;
    return c;
  }, [inMonth]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inMonth.filter((l) => {
      /* "Upcoming" is a view, not a type: a paid order whose install date is
         still ahead belongs in it as much as a Calendly booking does, which is
         why the feed carries that flag separately from the type. */
      const inTab = tab === "All" ? true : tab === "Upcoming" ? Boolean(l.upcoming) : l.type === tab;
      if (!inTab) return false;
      if (!needle) return true;
      return [l.name, l.email, l.phone, l.address, l.product, l.orderId].some((v) =>
        String(v ?? "").toLowerCase().includes(needle),
      );
    });
  }, [inMonth, tab, q]);

  function download() {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, csv(rows));
  }

  const idOf = (l: Lead, i: number) => `${l.orderId || l.email || l.phone || "row"}-${i}`;

  const Detail = ({ l }: { l: Lead }) => {
    const tel = telHref(l.phone);
    const address = dash(l.address);
    const ref = orderKey(l);
    const mark = marks[ref];
    const facts: [string, ReactNodeish][] = [
      ["Phone", tel ? <a key="p" href={tel} className="text-slate-900 underline underline-offset-2">{dash(l.phone)}</a> : dash(l.phone)],
      ["Email", dash(l.email) ? <a key="e" href={`mailto:${l.email}`} className="break-all text-slate-900 underline underline-offset-2">{l.email}</a> : ""],
      ["Address", dash(l.address)],
      ["Received", dash(l.date)],
      ["Status", dash(l.status)],
      ["Order ID", dash(l.orderId)],
    ];
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <dl className="space-y-2 text-sm">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-2">
              <dt className="text-slate-500">{k}</dt>
              <dd className="break-words text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        {l.details?.length ? (
          <dl className="space-y-3 text-sm">
            {l.details.map((d, j) => (
              <div key={j}>
                <dt className="text-slate-500">{d.question}</dt>
                <dd className="whitespace-pre-wrap break-words text-slate-900">{d.answer}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Nothing else was captured with this one.</p>
        )}

        {/*
          Marking a job cancelled.
          Stripe and Calendly cannot be told a job was called off on the phone,
          so this is the only place the CRM can learn it. It writes a note of
          its own and never touches the payment: the money stays exactly where
          it is and a refund, if there is one, is a separate decision.
        */}
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Is this still happening?</p>
          <form action={setOrderMark} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="ref" value={ref} />
            <input type="hidden" name="state" value={mark === "cancelled" ? "" : "cancelled"} />
            <button
              type="submit"
              className={`min-h-[40px] rounded-lg border px-3 text-sm font-medium ${
                mark === "cancelled"
                  ? "border-slate-300 text-slate-700 hover:bg-white"
                  : "border-rose-300 text-rose-700 hover:bg-rose-50"
              }`}
            >
              {mark === "cancelled" ? "Put it back, it is happening" : "Mark cancelled"}
            </button>
            <span className="text-xs text-slate-500">
              {mark === "cancelled"
                ? "Hidden from the diary. The payment in Stripe is untouched."
                : "Takes it out of the diary. Does not refund anything."}
            </span>
          </form>
        </div>

        {/* The map matters more than it looks on an installer's job: half the
            question about a booking is where it is and how far. Google's embed
            endpoint needs no API key, and maps.google.com is already in the
            site's frame-src, so this works without touching the CSP.
            loading="lazy" because a list with eight rows open would otherwise
            fetch eight maps nobody has scrolled to. */}
        {address && (
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Where it is</p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Directions
              </a>
            </div>
            <iframe
              title={`Map of ${address}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=14&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-56 w-full rounded-lg border border-slate-200"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Arriving filtered without being told is how a reader concludes the
          rest of the orders are missing. Say which month, and how to leave. */}
      {activeMonth && (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
          <span>
            Showing <strong className="font-semibold">{monthLabel(activeMonth)}</strong> only,
            {" "}{inMonth.length} row{inMonth.length === 1 ? "" : "s"}.
          </span>
          <button
            type="button"
            onClick={() => setMonthOn(false)}
            className="ml-auto inline-flex min-h-[28px] items-center gap-1 rounded-md border border-brand-300 bg-white px-2 text-xs font-medium text-brand-800 transition-colors hover:border-brand-500 hover:bg-brand-100"
          >
            Show every month
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 lg:flex-row lg:items-center">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          {/* A filter that can only ever return nothing is not a filter. Smart
              Space has paid orders and installs; SmartCare Living's sheet has
              neither, and showing "Paid 0" there invites the question of where
              the money went. */}
          {TABS.filter((t) => t === "All" || (counts[t] ?? 0) > 0).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={[
                "flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              {SHORT[t] ?? t}
              <span className={tab === t ? "text-white/60" : "text-slate-400"}>{counts[t] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <label htmlFor="orders-search" className="sr-only">Search orders</label>
            <input
              id="orders-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone, Eircode"
              className="min-h-[36px] w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 lg:w-64"
            />
          </div>
          <button
            type="button"
            onClick={download}
            className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing here" detail={q ? "No row matches that search." : "No rows of this kind yet."} />
      ) : (
        <>
          {/* Under sm a seven column table is a horizontal scroll nobody makes
              sense of on a phone, so the same rows become cards. */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {rows.map((l, i) => {
              const id = idOf(l, i);
              const expanded = open === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : id)}
                    aria-expanded={expanded}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{dash(l.name) || "Unnamed"}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{dash(l.product) || dash(l.email) || dash(l.phone)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Pill className={KIND[l.type]}>{SHORT[l.type] ?? l.type}</Pill>
                        <span className="text-xs tabular-nums text-slate-500">{dayOnly(l.date)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {dash(l.amount) && <span className="text-sm font-medium tabular-nums text-slate-900">{l.amount}</span>}
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                    </div>
                  </button>
                  {expanded && <div className="bg-slate-50 px-4 pb-5 pt-1"><Detail l={l} /></div>}
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-4 py-2 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Product</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Amount</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Booking</th>
                  <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Detail</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((l, i) => {
                  const id = idOf(l, i);
                  const expanded = open === id;
                  return (
                    <Fragment key={id}>
                      <tr
                        onClick={() => setOpen(expanded ? null : id)}
                        className={`cursor-pointer ${expanded ? "bg-slate-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{dayOnly(l.date) || "–"}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : id); }}
                            aria-expanded={expanded}
                            className="block text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                          >
                            {dash(l.name) || "Unnamed"}
                          </button>
                          <span className="block text-xs text-slate-500">{dash(l.email) || dash(l.phone)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {marks[orderKey(l)] === "cancelled" ? (
                            <Pill className="bg-rose-50 text-rose-700 ring-rose-600/20">Cancelled</Pill>
                          ) : (
                            <Pill className={KIND[l.type]}>{SHORT[l.type] ?? l.type}</Pill>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{dash(l.product) || "–"}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">{dash(l.amount) || "–"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {(() => {
                            const own = dash(l.bookingDate);
                            if (own) {
                              return (
                                <>
                                  {own}
                                  {dash(l.bookingSlot) && <span className="block text-xs text-slate-500">{l.bookingSlot}</span>}
                                </>
                              );
                            }
                            const b = borrowed.get(l);
                            if (b) {
                              return (
                                <>
                                  {b.label}
                                  <span className="block text-xs text-slate-500">
                                    {b.slot ? `${b.slot} · booked separately` : "booked separately"}
                                  </span>
                                </>
                              );
                            }
                            /* A dash said both "nobody booked this" and "the
                               booking is on another row". Only one of those is
                               something to act on, so it says which. */
                            return <span className="text-amber-700">Not booked yet</span>;
                          })()}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : id); }}
                            aria-expanded={expanded}
                            aria-label={expanded ? `Hide detail for ${dash(l.name) || "this row"}` : `Show detail for ${dash(l.name) || "this row"}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={7} className="px-4 pb-5 pt-1"><Detail l={l} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
        Showing {rows.length} of {leads.length}
      </p>
    </div>
  );
}

type ReactNodeish = string | JSX.Element;
