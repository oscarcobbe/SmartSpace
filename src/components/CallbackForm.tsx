"use client";

/**
 * The callback request on the paid landing page.
 *
 * /ring-installation is where every Google Ads click lands, and until now it
 * offered a visitor exactly two things to do: ring the phone, or pay between
 * €139 and €479 by card on the spot. There was no form on the page at all,
 * no submit button, and no way to ask for a quote.
 *
 * The numbers said so plainly. Over thirty days the campaign bought 143
 * clicks at a 16.3 per cent click-through rate, and produced seven
 * conversions: five phone calls, one card payment, and one contact form
 * submitted from a different page entirely. The advert was working. The page
 * converted people who were ready to buy that minute and lost everybody else.
 *
 * The free consultation existed the whole time, at /services/free-consultation,
 * linked once from below the FAQ. The single low-commitment action on the page
 * sat underneath the request for a card.
 *
 * This is that missing step, above the fold. Three fields, because every
 * additional field costs completions and a callback needs a name, a number
 * and an address to match the conversion on.
 *
 * It posts to /api/contact rather than to anything new. That endpoint already
 * has the spam honeypot, the Resend delivery, the attribution capture and,
 * importantly, the server-generated conversion id that lets the client fire
 * and the server fire of one lead be counted once. Building a second
 * endpoint would mean building all of that again and getting one of them
 * wrong.
 */

import { useState, type FormEvent } from "react";
import { PhoneCall, Check } from "lucide-react";

import { getAttribution } from "@/lib/attribution";
import { fireLeadConversion } from "@/lib/lead-conversion";

export default function CallbackForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = event.target as HTMLFormElement;
    const value = (name: string) =>
      ((form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "").trim();

    const name = value("name");
    const phone = value("phone");
    const email = value("email");

    /*
     * /api/contact requires a message and rejects an empty one, and asking
     * somebody for a message is the field most likely to make them abandon a
     * callback request. So the message is written here from what they did
     * give, which also tells whoever reads the email which page produced it.
     */
    const payload = {
      name,
      email,
      phone,
      subject: "installation",
      message:
        `Callback requested from the Ring installation landing page.\n\n` +
        `Phone: ${phone || "not given"}\n` +
        `They have not booked or paid, they asked to be called back.`,
      homepage_url: value("homepage_url"),
      attribution: getAttribution() ?? undefined,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        conversionId?: string;
      };

      if (!res.ok) {
        setError(json.error ?? "That did not send. Please try again, or ring us.");
        return;
      }

      setSubmitted(true);
      fireLeadConversion(email, phone, json.conversionId, "callback_request");
    } catch {
      setError("That did not send. Please try again, or ring us.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 max-w-md mx-auto rounded-2xl border border-green-200 bg-green-50 px-5 py-6 text-center">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-green-100 text-green-600 mb-3">
          <Check className="w-6 h-6" />
        </div>
        <p className="font-semibold text-gray-900">We have your number.</p>
        <p className="mt-1 text-sm text-gray-600">
          We will ring you back today if it is before 5pm, and first thing tomorrow otherwise.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      /*
        Tightened so the button clears the fold on a phone. Measured at
        390 by 844: the form started at 563 and the submit button at 896,
        fifty two pixels under. A call to action you have to go looking for
        is the thing this form was added to stop.
      */
      className="mt-4 max-w-md mx-auto rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm"
    >
      <p className="text-sm font-semibold text-gray-900">
        Not ready to book? We will ring you back with a price.
      </p>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {/*
        The same honeypot the contact form uses, and the same field name,
        because /api/contact treats a non-empty homepage_url as a bot and
        drops the submission silently. A different name here would mean this
        form had no spam protection at all.
      */}
      <input
        type="text"
        name="homepage_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        defaultValue=""
        style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="mt-3 space-y-2.5">
        {/*
          text-base, not text-sm. iOS Safari zooms the whole page in when a
          focused input is under 16px, and on a landing page whose entire job
          is the next tap, the layout jumping is the worst possible moment for
          it. min-h-11 is the 44px touch floor.
        */}
        <div>
          <label htmlFor="cb-name" className="block text-xs font-medium text-gray-700 mb-1">
            Your name
          </label>
          <input
            id="cb-name"
            name="name"
            required
            autoComplete="name"
            className="w-full min-h-11 rounded-xl border border-gray-300 px-3.5 text-base sm:text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div>
          <label htmlFor="cb-phone" className="block text-xs font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="cb-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            className="w-full min-h-11 rounded-xl border border-gray-300 px-3.5 text-base sm:text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div>
          <label htmlFor="cb-email" className="block text-xs font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="cb-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="w-full min-h-11 rounded-xl border border-gray-300 px-3.5 text-base sm:text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-3.5 w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 transition-colors"
      >
        <PhoneCall className="w-4 h-4" />
        {submitting ? "Sending" : "Request a callback"}
      </button>

      <p className="mt-2 text-[0.7rem] leading-snug text-gray-400 text-center">
        Used to ring you back about this enquiry. Nothing else.
      </p>
    </form>
  );
}
