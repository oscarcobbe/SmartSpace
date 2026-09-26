"use client";

import { useState } from "react";
import { CalendarClock, MapPin, Phone, ChevronDown, Mail, Hash } from "lucide-react";
import type { Lead } from "@/lib/crm/leads";
import { telHref } from "@/lib/crm/labels";
import { displayName, plainText, slotText } from "@/lib/crm/display";
import { Pill } from "../ui";

const dash = (v: string | undefined | null) => plainText(v);

const PILL: Record<string, string> = {
  "Paid Order": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Consultation: "bg-sky-50 text-sky-700 ring-sky-600/20",
  Installation: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

/**
 * One job in the diary, and everything the customer actually specced.
 *
 * The row alone answers when and where. It did not answer what, which is the
 * question somebody loading a van needs answered before they drive: which
 * product, how many rooms, what they wrote in the form, what they paid. All of
 * it was already coming down in the feed and none of it was on screen.
 *
 * Collapsed by default because a day with four jobs has to stay readable at
 * arm's length on a phone, and open to a full detail list on tap.
 */
export default function Job({ lead, dateLabel }: { lead: Lead; dateLabel?: string }) {
  const [open, setOpen] = useState(false);
  const tel = telHref(lead.phone);
  const address = dash(lead.address);
  /*
   * The same question can arrive from both joined rows, so it is shown once.
   * Keyed on the question and the answer together, because "Address" appearing
   * twice with two different answers is worth seeing and twice with the same
   * answer is noise.
   */
  const details = (lead.details ?? []).filter(
    (d, i, all) => all.findIndex((o) => o.question === d.question && o.answer === d.answer) === i,
  );

  /*
   * orderId is not always an id. On a paid order it arrives as the whole
   * booking written out: "Product: ... | Order: cs_live_... | Address: ... |
   * Phone: ...". Rendered raw it wrapped over five lines and repeated every
   * field already shown above it. The real reference is pulled out where there
   * is one, and the rest is dropped rather than printed at somebody.
   */
  const rawOrder = dash(lead.orderId);
  const reference = rawOrder.includes("|")
    ? (rawOrder.match(/Order:\s*([^|]+)/i)?.[1] ?? "").trim()
    : rawOrder;
  /* A job with nothing beyond the row has nothing to open, and a control that
     reveals an empty box is worse than no control. */
  const hasMore = details.length > 0 || dash(lead.email) || address;

  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            {dateLabel && <><span className="tabular-nums">{dateLabel}</span><span className="text-slate-400">·</span></>}
            {slotText(lead.bookingSlot) || "Time not set"}
            <span className="text-slate-400">·</span>
            {displayName(lead)}
          </p>
          {dash(lead.product) && <p className="mt-0.5 pl-6 text-sm text-slate-600">{dash(lead.product)}</p>}
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
          {dash(lead.amount) && <span className="text-sm font-semibold tabular-nums text-slate-900">{lead.amount}</span>}
          <Pill className={PILL[lead.type] ?? "bg-slate-100 text-slate-700 ring-slate-600/20"}>{lead.type}</Pill>
          {tel && (
            <a
              href={tel}
              aria-label={`Ring ${dash(lead.name) || "this customer"}`}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Hide what they ordered" : "Show what they ordered"}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {open && hasMore && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          {details.length > 0 ? (
            <dl className="space-y-2">
              {details.map((d, i) => (
                <div key={i} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-3">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{d.question}</dt>
                  <dd className="text-slate-800">{d.answer}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-slate-500">
              Nothing was specced on this booking beyond the product and the slot.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 pt-2 text-xs text-slate-600">
            {dash(lead.email) && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <a href={`mailto:${lead.email}`} className="underline-offset-2 hover:underline">{lead.email}</a>
              </span>
            )}
            {reference && (
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span className="break-all font-mono text-[11px]">{reference.slice(0, 28)}{reference.length > 28 ? "…" : ""}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
