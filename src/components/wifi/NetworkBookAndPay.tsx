"use client";

import { useState } from "react";
import BookingCalendar from "@/components/BookingCalendar";
import AddToCartButton from "@/components/AddToCartButton";
import { EIRCODE, VISIT_KEYS } from "@/lib/network-visit";

/**
 * The assessment's first visit, booked the way a Ring installation is: the
 * same BookingCalendar and installation slots, then the basket and checkout.
 * Nigel, 12 Oct 2026: "should be the same booking engine look and feel and
 * critically the same time slots".
 *
 * Oscar, 13 Oct 2026: Nigel must know who the visit is for and where, not only
 * who paid. So the page asks for the visit's name, phone, email, address and
 * Eircode before the assessment goes in the basket. They travel as the item's
 * answers (configuration) to /api/checkout, which prefills Stripe with them and
 * writes them on the session; the Stripe webhook puts them on Nigel's alert,
 * the calendar booking, the leads sheet and the CRM. "How did you hear about
 * us?" is asked in the basket, as it is for a doorbell.
 *
 * Two working days' notice, as for Installation Only: there is no stock to
 * order for a visit that brings its own trial kit. kind "assessment" (13 Oct
 * 2026): the same slots, booked as Nigel's Calendly event "SmartSpace Networks -
 * Home Network Assessment", so the confirmation names the assessment.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field =
  "w-full min-h-11 border-2 border-gray-200 rounded-xl bg-white px-4 py-2.5 text-base sm:text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none transition-colors";

export default function NetworkBookAndPay({ slug, name, euro }: { slug: string; name: string; euro: number }) {
  const [selection, setSelection] = useState<{ date: string; timeSlot: string; dateLabel: string; slotLabel: string } | null>(null);
  const [d, setD] = useState({ name: "", phone: "", email: "", address: "", eircode: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const problems = {
    name: d.name.trim().length < 2 ? "Enter the name for the visit" : "",
    phone: d.phone.replace(/[^\d+]/g, "").length < 7 ? "Enter a phone number we can ring" : "",
    email: EMAIL.test(d.email.trim()) ? "" : "Enter an email address",
    address: d.address.trim().length < 5 ? "Enter the address for the visit" : "",
    eircode: EIRCODE.test(d.eircode.trim()) ? "" : "Enter the Eircode, for example D06 X1Y2",
  };
  const detailsOk = Object.values(problems).every((p) => !p);
  const eircode = d.eircode.trim().toUpperCase().replace(/^(\w{3})\s?(\w{4})$/, "$1 $2");

  const err = (k: keyof typeof problems) =>
    touched[k] && problems[k] ? <p className="mt-1 text-xs font-medium text-red-600" id={`visit-${k}-err`}>{problems[k]}</p> : null;

  return (
    <div className="space-y-5">
      <BookingCalendar
        heading="Choose a Date for the First Visit"
        confirmLabel="First visit"
        kind="assessment"
        leadDays={2}
        onSelectionChange={setSelection}
      />

      <fieldset className="rounded-2xl border-2 border-gray-100 p-4 sm:p-5 space-y-3">
        <legend className="px-1 text-base font-bold text-ink">Your details for the visit</legend>
        <p className="text-sm text-ink-soft -mt-1">Who we are visiting and where. We ring this number to confirm.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="visit-name" className="block text-sm font-semibold text-ink mb-1">Full name</label>
            <input id="visit-name" autoComplete="name" className={field} value={d.name} onChange={set("name")} onBlur={touch("name")} aria-invalid={!!(touched.name && problems.name)} aria-describedby="visit-name-err" />
            {err("name")}
          </div>
          <div>
            <label htmlFor="visit-phone" className="block text-sm font-semibold text-ink mb-1">Phone</label>
            <input id="visit-phone" type="tel" autoComplete="tel" className={field} value={d.phone} onChange={set("phone")} onBlur={touch("phone")} aria-invalid={!!(touched.phone && problems.phone)} aria-describedby="visit-phone-err" />
            {err("phone")}
          </div>
        </div>
        <div>
          <label htmlFor="visit-email" className="block text-sm font-semibold text-ink mb-1">Email</label>
          <input id="visit-email" type="email" autoComplete="email" className={field} value={d.email} onChange={set("email")} onBlur={touch("email")} aria-invalid={!!(touched.email && problems.email)} aria-describedby="visit-email-err" />
          {err("email")}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <div>
            <label htmlFor="visit-address" className="block text-sm font-semibold text-ink mb-1">Address for the visit</label>
            <input id="visit-address" autoComplete="street-address" className={field} value={d.address} onChange={set("address")} onBlur={touch("address")} aria-invalid={!!(touched.address && problems.address)} aria-describedby="visit-address-err" />
            {err("address")}
          </div>
          <div>
            <label htmlFor="visit-eircode" className="block text-sm font-semibold text-ink mb-1">Eircode</label>
            <input id="visit-eircode" autoComplete="postal-code" className={`${field} uppercase`} value={d.eircode} onChange={set("eircode")} onBlur={touch("eircode")} aria-invalid={!!(touched.eircode && problems.eircode)} aria-describedby="visit-eircode-err" />
            {err("eircode")}
          </div>
        </div>
      </fieldset>

      <AddToCartButton
        productId={`network:${slug}`}
        name={name}
        price={euro}
        image=""
        size="lg"
        className="w-full"
        disabled={!selection || !detailsOk}
        disabledText={!selection ? "Choose a date and time first" : "Fill in your details for the visit"}
        bookingDate={selection?.date}
        bookingSlot={selection?.timeSlot}
        bookingLabel={selection ? `${selection.dateLabel} ${selection.slotLabel}` : undefined}
        configuration={{
          [VISIT_KEYS.name]: d.name.trim(),
          [VISIT_KEYS.phone]: d.phone.trim(),
          [VISIT_KEYS.email]: d.email.trim(),
          [VISIT_KEYS.address]: d.address.trim(),
          [VISIT_KEYS.eircode]: eircode,
        }}
      />
    </div>
  );
}
