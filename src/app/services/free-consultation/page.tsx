"use client";

import { useState } from "react";
import { ClipboardCheck, Home, MessageCircle, Lightbulb, Shield, Star, Wrench, Award } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
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

  return (
    <div className="pt-32 lg:pt-36">
      {/* Hero */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            100% Free — No Obligation
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Free Home Consultation
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Not sure what you need? We&apos;ll come to your home, assess your property, and give you an
            honest recommendation with a written quote — completely free.
          </p>
        </div>
      </section>

      {/* Book */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Book Your Free Visit
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Choose a day and time that suits you — we&apos;ll be there
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Info + CTA */}
            <div className="space-y-6">
              <div className="bg-green-50 rounded-2xl p-6">
                <div className="text-sm text-gray-500 mb-1">Price</div>
                <div className="text-3xl font-extrabold text-green-600">FREE</div>
                <div className="text-xs text-gray-400 mt-1">
                  No obligation • No card required at checkout
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
                <h3 className="font-bold text-gray-900">What to expect</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">✓</span>
                    Specialist visit to your home by our expert installer
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">✓</span>
                    Full property assessment for optimal device placement
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">✓</span>
                    Wi-Fi coverage and wiring check
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">✓</span>
                    Personalised written quote tailored to your home
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">✓</span>
                    Same-day installation available if you&apos;d like to go ahead
                  </li>
                </ul>
              </div>

              <AddToCartButton
                productId="free-consultation"
                name="Free Home Consultation"
                price={0}
                image="/products/consultation.jpg"
                size="lg"
                className="w-full"
                disabled={!bookingSelection}
                disabledText="Select a Date First"
                bookingDate={bookingSelection?.date}
                bookingSlot={bookingSelection?.timeSlot}
                bookingLabel={
                  bookingSelection
                    ? `${bookingSelection.dateLabel} ${bookingSelection.slotLabel}`
                    : undefined
                }
              />
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
              { icon: Shield, text: "Dublin's Only 5★ Ring Installer" },
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
