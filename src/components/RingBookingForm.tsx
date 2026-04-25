"use client";

/**
 * Booking form for /ring-installation (paid landing page).
 *
 * Uses the same 2-column pattern as /services/free-consultation —
 * customer details on the left, BookingCalendar on the right —
 * so this page feels native to the rest of smart-space.ie.
 *
 * Posts to /api/ring-installation-booking which:
 *   1. Logs the lead to the leads sheet (always)
 *   2. Auto-creates a Calendly install event using the picked slot
 *   3. Sends the owner an email
 *
 * On success, fires the Google Ads conversion (SS- Onsite consultation
 * booked label `fH4ZCMHv7ZocEJfU6PxC`) + GA4 `generate_lead` recommended
 * event with hashed user_data for Enhanced Conversions match.
 */

import { useState, useRef } from "react";
import { Send, Check, Loader2, ShieldCheck } from "lucide-react";
import { getAttribution } from "@/lib/attribution";
import BookingCalendar from "@/components/BookingCalendar";

const GADS_BOOKING_TAG = "AW-17978501655/fH4ZCMHv7ZocEJfU6PxC";
const BOOKING_VALUE = 50;

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; calendlyBooked: boolean; dateLabel: string; slotLabel: string }
  | { kind: "error"; message: string };

interface BookingSelection {
  date: string;
  timeSlot: string;
  dateLabel: string;
  slotLabel: string;
}

function fireConversion(email: string, phone: string) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  w.gtag("set", "user_data", { email, phone_number: phone });
  w.gtag("event", "conversion", {
    send_to: GADS_BOOKING_TAG,
    value: BOOKING_VALUE,
    currency: "EUR",
  });
  w.gtag("event", "generate_lead", {
    currency: "EUR",
    value: BOOKING_VALUE,
    lead_source: "ring_installation_landing",
  });
  console.log("[gtag] ring-installation booking conversion fired");
}

export default function RingBookingForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [booking, setBooking] = useState<BookingSelection | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [eircode, setEircode] = useState("");
  const [product, setProduct] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const formValid = !!(name.trim() && phone.trim() && email.trim() && product && booking);
  const submitting = status.kind === "submitting";

  async function handleSubmit() {
    if (!formValid || !booking || submitting) return;
    setStatus({ kind: "submitting" });

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      eircode: eircode.trim(),
      product,
      date: booking.date,
      timeSlot: booking.timeSlot,
      attribution: getAttribution() ?? undefined,
    };

    try {
      const res = await fetch("/api/ring-installation-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        calendlyBooked?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus({
          kind: "error",
          message: data.error ?? "We couldn't submit your booking. Please call 01 513 0424.",
        });
        requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return;
      }

      fireConversion(payload.email, payload.phone);

      setStatus({
        kind: "success",
        calendlyBooked: !!data.calendlyBooked,
        dateLabel: booking.dateLabel,
        slotLabel: booking.slotLabel,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please call 01 513 0424 directly.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-500 mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Booking received</h2>
        <p className="text-gray-600 mb-1">
          {status.calendlyBooked
            ? `You're confirmed for ${status.dateLabel} at ${status.slotLabel}.`
            : `We have your preferred slot of ${status.dateLabel} at ${status.slotLabel}.`}
        </p>
        <p className="text-gray-500 text-sm mb-5">
          {status.calendlyBooked
            ? "We'll call within 1 hour to confirm address details."
            : "We'll call within 1 hour to confirm everything."}
        </p>
        <p className="text-xs text-gray-400">
          Or call us now on{" "}
          <a href="tel:+35315130424" className="font-semibold text-brand-500 hover:underline">
            01 513 0424
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left: price summary + customer details + submit */}
      <div className="space-y-6">
        {/* Price summary */}
        <div className="bg-brand-50 rounded-2xl p-6">
          <div className="text-sm text-gray-500 mb-1">Installation from</div>
          <div className="text-3xl font-extrabold text-brand-600">€139</div>
          <div className="text-xs text-gray-400 mt-1">Flat rate · No hidden costs</div>
        </div>

        {/* Customer details */}
        <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Your Details</h3>

          <div>
            <label htmlFor="ri-name" className="block text-xs font-medium text-gray-600 mb-1">
              Full Name *
            </label>
            <input
              id="ri-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="ri-phone" className="block text-xs font-medium text-gray-600 mb-1">
              Phone Number *
            </label>
            <input
              id="ri-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="085 123 4567"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="ri-email" className="block text-xs font-medium text-gray-600 mb-1">
              Email *
            </label>
            <input
              id="ri-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="ri-eircode" className="block text-xs font-medium text-gray-600 mb-1">
              Eircode
            </label>
            <input
              id="ri-eircode"
              type="text"
              autoComplete="postal-code"
              value={eircode}
              onChange={(e) => setEircode(e.target.value)}
              placeholder="D02 AB30"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="ri-product" className="block text-xs font-medium text-gray-600 mb-1">
              What needs installed? *
            </label>
            <select
              id="ri-product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors bg-white"
            >
              <option value="">Select…</option>
              <option value="ring-doorbell">Ring Doorbell (any model)</option>
              <option value="ring-camera">Ring Camera</option>
              <option value="eufy">Eufy doorbell / camera</option>
              <option value="tapo">Tapo doorbell / camera</option>
              <option value="nest">Google Nest</option>
              <option value="other">Something else</option>
            </select>
          </div>
        </div>

        {status.kind === "error" ? (
          <div
            ref={errorRef}
            role="alert"
            aria-live="polite"
            className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
          >
            {status.message}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!formValid || submitting}
          aria-busy={submitting}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-4 rounded-full transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Booking…
            </>
          ) : !booking ? (
            "Choose a Date First"
          ) : !formValid ? (
            "Complete Your Details"
          ) : (
            <>
              <Send className="w-4 h-4" />
              Confirm My Install Booking
            </>
          )}
        </button>

        <p className="inline-flex items-center justify-center gap-1.5 text-[11px] text-gray-400 w-full">
          <ShieldCheck className="w-3 h-3" />
          We&apos;ll only use your details to confirm — never spam, never shared.
        </p>
      </div>

      {/* Right: BookingCalendar — same component used across the site */}
      <div>
        <BookingCalendar
          onSelectionChange={setBooking}
          heading="Choose an Installation Date"
          confirmLabel="Installation"
          kind="installation"
        />
      </div>
    </div>
  );
}
