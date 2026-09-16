"use client";

import { Fragment, useMemo, useState } from "react";
import type { Lead } from "@/lib/crm/leads";
import { Empty, Pill } from "../ui";

const TABS = ["All", "Paid Order", "Upcoming", "Installation", "Consultation", "Contact Enquiry"] as const;
type Tab = (typeof TABS)[number];

const KIND: Record<string, "paid" | "upcoming" | "enquiry" | "consult" | "install"> = {
  "Paid Order": "paid",
  Upcoming: "upcoming",
  Installation: "install",
  Consultation: "consult",
  "Contact Enquiry": "enquiry",
};

/** The feed writes "-" for an absent value, which should render as nothing. */
const dash = (v: string | undefined) => (!v || v === "-" ? "" : v);

function csv(rows: Lead[]): string {
  const head = ["Date", "Type", "Name", "Email", "Phone", "Address", "Product", "Amount", "Booking", "Slot", "Status", "Order ID"];
  const cell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((l) =>
    [l.date, l.type, l.name, l.email, l.phone, l.address, l.product, l.amount, l.bookingDate, l.bookingSlot, l.status, l.orderId]
      .map((v) => cell(dash(v)))
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export default function OrdersTable({ leads }: { leads: Lead[] }) {
  const [tab, setTab] = useState<Tab>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
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
  }, [leads, tab, q]);

  function download() {
    const blob = new Blob([csv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              {t === "Contact Enquiry" ? "Enquiries" : t === "Paid Order" ? "Paid" : t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="orders-search" className="sr-only">Search orders</label>
          <input
            id="orders-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, phone, Eircode"
            className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="button"
            onClick={download}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing here" detail={q ? "No row matches that search." : "No rows of this kind yet."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-2 font-medium">Date</th>
                <th scope="col" className="px-4 py-2 font-medium">Customer</th>
                <th scope="col" className="px-4 py-2 font-medium">Type</th>
                <th scope="col" className="px-4 py-2 font-medium">Product</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Amount</th>
                <th scope="col" className="px-4 py-2 font-medium">Booking</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Detail</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((l, i) => {
                const id = `${l.orderId || l.email || l.phone || "row"}-${i}`;
                const expanded = open === id;
                return (
                  <Fragment key={id}>
                    <tr className={expanded ? "bg-slate-50" : undefined}>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{dash(l.date) || "–"}</td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-slate-900">{dash(l.name) || "Unnamed"}</span>
                        <span className="block text-xs text-slate-500">{dash(l.email) || dash(l.phone)}</span>
                      </td>
                      <td className="px-4 py-3"><Pill kind={KIND[l.type]}>{l.type}</Pill></td>
                      <td className="px-4 py-3 text-slate-700">{dash(l.product) || "–"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">{dash(l.amount) || "–"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {dash(l.bookingDate) || "–"}
                        {dash(l.bookingSlot) && <span className="block text-xs text-slate-500">{l.bookingSlot}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : id)}
                          aria-expanded={expanded}
                          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          {expanded ? "Close" : "Detail"}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-4 pb-5 pt-1">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <dl className="space-y-2 text-sm">
                              {([
                                ["Phone", dash(l.phone)],
                                ["Email", dash(l.email)],
                                ["Address", dash(l.address)],
                                ["Status", dash(l.status)],
                                ["Order ID", dash(l.orderId)],
                              ] as [string, string][])
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                  <div key={k} className="grid grid-cols-[6rem_1fr] gap-2">
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
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
        {rows.length} of {leads.length} shown
      </p>
    </div>
  );
}
