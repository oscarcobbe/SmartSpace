"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Home, Phone } from "lucide-react";

// Google Ads conversion tag for SmartCareLiving Quote Payments
const GADS_CONVERSION_TAG = "AW-17978501655/8aWsCPbYuZkcEJfU6PxC";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const fired = useRef(false);

  useEffect(() => {
    // Fire Google Ads conversion once on mount.
    // Guard with useRef so a re-render (e.g. from React Strict Mode in
    // dev or a hydration retry) can't double-count the conversion.
    if (fired.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w === "undefined" || typeof w.gtag !== "function") return;
    fired.current = true;
    // transaction_id deduplicates the conversion in Google Ads if the
    // user refreshes the page or navigates back — without it, every
    // page load would count as a fresh sale.
    w.gtag("event", "conversion", {
      send_to: GADS_CONVERSION_TAG,
      transaction_id: sessionId || undefined,
    });
  }, [sessionId]);

  return (
    <div className="pt-32 lg:pt-40 pb-16 lg:pb-24">
      <div className="max-w-xl mx-auto px-4 text-center">
        <div className="bg-green-50 rounded-2xl p-10">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-5" />
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            Payment Received!
          </h1>
          <p className="text-gray-600 mb-2 text-lg">
            Thank you — your payment has been processed successfully.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            You&apos;ll receive a receipt by email shortly. Our team will be in
            touch to confirm your next steps.
          </p>

          {sessionId && (
            <p className="text-xs text-gray-400 mb-6 font-mono break-all">
              Reference: {sessionId}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
            <a
              href="tel:+35315130424"
              className="inline-flex items-center justify-center gap-2 border-2 border-brand-500 text-brand-500 hover:bg-brand-50 font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SmartCareLivingPaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-40 flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
