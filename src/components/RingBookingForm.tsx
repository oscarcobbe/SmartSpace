"use client";

/**
 * Booking form for /ring-installation (paid landing page).
 *
 * Posts to /api/ring-installation-booking which:
 *   1. Logs the lead to the leads sheet (always)
 *   2. Sends the owner an email (always)
 *   3. Best-effort: tries to auto-create a Calendly event if the requested
 *      date is one of our installation days (Tue/Wed/Thu)
 *
 * On success, fires the Google Ads conversion (SS- Onsite consultation booked
 * label `fH4ZCMHv7ZocEJfU6PxC`) + GA4 `generate_lead` recommended event,
 * with hashed user_data for Enhanced Conversions match.
 */

import { useState, FormEvent } from "react";
import { Send, Check } from "lucide-react";
import { getAttribution } from "@/lib/attribution";

const GADS_BOOKING_TAG = "AW-17978501655/fH4ZCMHv7ZocEJfU6PxC";
const BOOKING_VALUE = 50;

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; email: string; phone: string; calendlyBooked: boolean }
  | { kind: "error"; message: string };

function fireConversion(email: string, phone: string) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  // Enhanced conversions — pass user data; Google hashes client-side.
  w.gtag("set", "user_data", {
    email,
    phone_number: phone,
  });
  // Google Ads conversion
  w.gtag("event", "conversion", {
    send_to: GADS_BOOKING_TAG,
    value: BOOKING_VALUE,
    currency: "EUR",
  });
  // GA4 recommended lead event so GA4 also sees this as a conversion
  w.gtag("event", "generate_lead", {
    currency: "EUR",
    value: BOOKING_VALUE,
    lead_source: "ring_installation_landing",
  });
  console.log("[gtag] ring-installation booking conversion fired");
}

// Minimum bookable date = tomorrow (today + 1 day, ISO YYYY-MM-DD in Dublin)
function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function RingBookingForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "submitting" });

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      eircode: String(fd.get("eircode") || "").trim(),
      product: String(fd.get("product") || "").trim(),
      date: String(fd.get("date") || "").trim(),
      attribution: getAttribution() ?? undefined,
    };

    if (!payload.name || !payload.phone || !payload.email || !payload.product || !payload.date) {
      setStatus({ kind: "error", message: "Please fill in all required fields." });
      return;
    }

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
          message: data.error ?? "We couldn't submit your booking. Please call us instead.",
        });
        return;
      }

      // Fire conversion with the user data we just collected
      fireConversion(payload.email, payload.phone);

      setStatus({
        kind: "success",
        email: payload.email,
        phone: payload.phone,
        calendlyBooked: !!data.calendlyBooked,
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
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 text-green-500 mb-4">
          <Check className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Booking received</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          {status.calendlyBooked
            ? "We've added you to our installer's calendar. You'll get a confirmation email and we'll call to confirm address details within 1 hour."
            : "Thanks — one of our installers will call you within 1 hour (Mon–Fri) to confirm pricing, address, and book your slot."}
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

  const submitting = status.kind === "submitting";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 sm:p-7">
      <h3 className="text-xl font-extrabold text-gray-900 mb-1">Book Your Install Online</h3>
      <p className="text-sm text-gray-500 mb-5">
        Pick a date — we&apos;ll confirm by phone within 1 hour (Mon–Fri).
      </p>

      {status.kind === "error" ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4"
        >
          {status.message}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="b-name" className="block text-xs font-semibold text-gray-700 mb-1">
            Full name
          </label>
          <input
            id="b-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="b-phone" className="block text-xs font-semibold text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="b-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="08x xxx xxxx"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="b-email" className="block text-xs font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              id="b-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="b-eircode" className="block text-xs font-semibold text-gray-700 mb-1">
              Eircode
            </label>
            <input
              id="b-eircode"
              name="eircode"
              type="text"
              autoComplete="postal-code"
              placeholder="D02 AF30"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="b-product" className="block text-xs font-semibold text-gray-700 mb-1">
              What needs installed?
            </label>
            <select
              id="b-product"
              name="product"
              required
              defaultValue=""
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="ring-doorbell">Ring Doorbell (any model)</option>
              <option value="ring-camera">Ring Camera</option>
              <option value="eufy">Eufy doorbell / camera</option>
              <option value="tapo">Tapo doorbell / camera</option>
              <option value="nest">Google Nest</option>
              <option value="other">Something else</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="b-date" className="block text-xs font-semibold text-gray-700 mb-1">
            Preferred date
          </label>
          <input
            id="b-date"
            name="date"
            type="date"
            required
            min={tomorrowIso()}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-gray-50"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            We typically install Tue–Thu. Other dates? Pick one and we&apos;ll work around you.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3.5 rounded-xl transition-colors shadow-lg shadow-brand-500/25 text-base disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Sending…" : "Get My Install Slot"}
        </button>
        <p className="text-[11px] text-gray-400 text-center">
          No payment required to book. We confirm pricing on the call.
        </p>
      </form>
    </div>
  );
}
