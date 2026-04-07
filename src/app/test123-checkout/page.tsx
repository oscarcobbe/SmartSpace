"use client";

import { useState } from "react";
import AddToCartButton from "@/components/AddToCartButton";
import BookingCalendar from "@/components/BookingCalendar";

// Uses the free consultation product for testing
const TEST_VARIANT_ID = "gid://shopify/ProductVariant/7466179723316";

export default function TestCheckoutPage() {
  const [bookingSelection, setBookingSelection] = useState<{
    date: string;
    timeSlot: string;
    dateLabel: string;
    slotLabel: string;
  } | null>(null);

  return (
    <div className="pt-32 lg:pt-36 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-sm font-bold text-red-600">TEST PAGE — Not linked anywhere on the site</p>
          <p className="text-xs text-red-500 mt-1">This page tests the Calendly booking + Shopify checkout flow using a €0 product.</p>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Test Checkout Flow</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Product + Cart */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="text-sm text-gray-500 mb-1">Test product</div>
              <div className="text-2xl font-extrabold text-gray-900">€0.00</div>
              <div className="text-xs text-gray-400 mt-1">Free consultation (test only)</div>
            </div>

            {bookingSelection && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-bold text-green-700">Booking selected:</p>
                <p className="text-sm text-green-600 mt-1">
                  {bookingSelection.dateLabel} at {bookingSelection.slotLabel}
                </p>
              </div>
            )}

            <AddToCartButton
              variantId={TEST_VARIANT_ID}
              size="lg"
              className="w-full"
              disabled={!bookingSelection}
              disabledText="Select an Installation Date"
              attributes={
                bookingSelection
                  ? [
                      { key: "Installation Date", value: bookingSelection.dateLabel },
                      { key: "Installation Time", value: bookingSelection.slotLabel },
                      { key: "_booking_date", value: bookingSelection.date },
                      { key: "_booking_slot", value: bookingSelection.timeSlot },
                    ]
                  : undefined
              }
            />
          </div>

          {/* Right: Calendar */}
          <div>
            <BookingCalendar onSelectionChange={setBookingSelection} />
          </div>
        </div>
      </div>
    </div>
  );
}
