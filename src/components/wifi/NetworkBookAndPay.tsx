"use client";

import { useState } from "react";
import BookingCalendar from "@/components/BookingCalendar";
import NetworkPayButton from "@/components/wifi/NetworkPayButton";

/**
 * The assessment's first visit, booked the way a Ring installation is: the
 * same BookingCalendar, the same installation slots from the same calendar,
 * then payment. Nigel, 12 Oct 2026: "should be the same booking engine look
 * and feel and critically the same time slots". The chosen slot travels with
 * the "network:<slug>" item to /api/checkout and on to the Stripe webhook,
 * which books it into the calendar as it does an install.
 *
 * Two working days' notice, as for Installation Only: there is no stock to
 * order for a visit that brings its own trial kit.
 */
export default function NetworkBookAndPay({ slug, name, euro }: { slug: string; name: string; euro: number }) {
  const [selection, setSelection] = useState<{ date: string; timeSlot: string; dateLabel: string; slotLabel: string } | null>(null);
  return (
    <div className="space-y-5">
      <BookingCalendar
        heading="Choose a Date for the First Visit"
        confirmLabel="First visit"
        kind="installation"
        leadDays={2}
        onSelectionChange={setSelection}
      />
      <NetworkPayButton
        slug={slug}
        name={name}
        euro={euro}
        booking={selection ? { date: selection.date, slot: selection.timeSlot, label: `${selection.dateLabel} ${selection.slotLabel}` } : null}
        needsBooking
      />
    </div>
  );
}
