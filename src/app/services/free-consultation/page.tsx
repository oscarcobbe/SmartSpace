"use client";

import { useState } from "react";
import { ClipboardCheck, Home, MessageCircle, Lightbulb, Shield, Star, Wrench, Award, Loader2 } from "lucide-react";
import BookingCalendar from "@/components/BookingCalendar";

const benefits = [
  {
    icon: Home,
    title: "Home Survey",
    description: "We visit your home and assess your property for the best camera and doorbell placements — no guesswork.",
  },
  {
    icon: MessageCircle,
    title: "Expert Advice",
    description: "Get honest, no-pressure recommendations from an installer with 5,000+ installations across Dublin and Leinster.",
  },
  {
    icon: ClipboardCheck,
    title: "Personalised Quote",
    description: "Receive a detailed, written quote tailored to your home — covering exactly what you need and nothing you don't.",
  },
  {
    icon: Lightbulb,
    title: "Wi-Fi & Wiring Check",
    description: "We check your Wi-Fi coverage and existing wiring so there are no surprises on installation day.",
  },
];

export default function FreeConsultationPage() {
  const [bookingSelection, setBookingSelection] = useState<{
    date: string;
    timeSlot: string;
    dateLabel: string;
    slotLabel: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const formValid = name.trim() && email.trim() && phone.trim() && address.trim() && bookingSelection;

  const handleSubmit = async () => {
    if (!formValid || !bookingSelection) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/checkout/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              productId: "free-consultation",
              name: "Complimentary Home Consultation",
              price: 0,
              image: "/products/consultation.jpg",
              quantity: 1,
              bookingDate: bookingSelection.date,
              bookingSlot: bookingSelection.timeSlot,
              bookingLabel: `${bookingSelection.dateLabel} ${bookingSelection.slotLabel}`,
            },
          ],
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/smartspace-payment-success?free=true";
      } else {
        setError(data.error ?? "Booking failed. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-32 lg:pt-36">
      {/* Hero */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Complimentary — No Obligation
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Complimentary Home Consultation
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Not sure what you need? We&apos;ll come to your home, assess your property, and give you an
            honest recommendation with a written quote — completely complimentary.
          </p>
        </div>
      </section>

      {/* Book */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Book Your Consultation
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Choose a day and time that suits you — we&apos;ll be there
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Info + Form */}
            <div className="space-y-6">
              <div className="bg-green-50 rounded-2xl p-6">
                <div className="text-sm text-gray-500 mb-1">Price</div>
                <div className="text-3xl font-extrabold text-green-600">Complimentary</div>
                <div className="text-xs text-gray-400 mt-1">
                  No obligation • No card required
                </div>
              </div>

              {/* Customer details form */}
              <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Your Details</h3>

                <div>
                  <label htmlFor="consult-name" className="block text-xs font-medium text-gray-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="consult-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="consult-phone" className="block text-xs font-medium text-gray-600 mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="consult-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="085 123 4567"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="consult-email" className="block text-xs font-medium text-gray-600 mb-1">
                    Email *
                  </label>
                  <input
                    id="consult-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="consult-address" className="block text-xs font-medium text-gray-600 mb-1">
                    Address / Eircode *
                  </label>
                  <input
                    id="consult-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, Dublin 12 or D12 AB34"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!formValid || submitting}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-4 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Booking...
                  </>
                ) : !bookingSelection ? (
                  "Select a Date First"
                ) : (
                  "Book Complimentary Consultation"
                )}
              </button>
            </div>

            {/* Right: Booking Calendar */}
            <div>
              <BookingCalendar
                onSelectionChange={setBookingSelection}
                heading="Choose a Consultation Date"
                confirmLabel="Consultation"
                kind="consultation"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              What&apos;s Included
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Everything you need to make an informed decision about your home security
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((item) => (
              <div key={item.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-brand-500 rounded-2xl mb-5 shadow-sm">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, text: "Dublin's Only 5\u2605 Ring Installer" },
              { icon: Star, text: "5-Star Google Rating" },
              { icon: Wrench, text: "5,000+ Installations" },
              { icon: Award, text: "SME Winner 2025" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center text-center gap-2">
                <Icon className="h-6 w-6 text-brand-500" />
                <span className="text-xs font-semibold text-gray-600">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
