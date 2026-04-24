"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Home, Phone } from "lucide-react";

const GADS_PAYMENT_TAG = "AW-17978501655/IofPCOiZuJkcEJfU6PxC";
const GADS_FREE_CONSULTATION_TAG = "AW-17978501655/fH4ZCMHv7ZocEJfU6PxC";
// Lead value for a booked complimentary consultation — calibrated for Google
// Ads smart bidding. Too high = over-bidding on unqualified leads.
const FREE_CONSULTATION_VALUE = 50;

type VerifyState =
  | { status: "loading" }
  | { status: "free"; email?: string; phone?: string }
  | { status: "paid"; amount: number; currency: string; sessionId: string; email?: string; phone?: string }
  | { status: "invalid" };

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const isFree = searchParams.get("free") === "true";
  // Optional identity data passed by the free-consultation form for enhanced conversions
  const passedEmail = searchParams.get("e") ?? undefined;
  const passedPhone = searchParams.get("p") ?? undefined;
  const fired = useRef(false);
  const [state, setState] = useState<VerifyState>({ status: "loading" });

  // Verify the session server-side before rendering a receipt or firing gtag.
  // A crafted URL with ?session_id=fake will fail this check.
  useEffect(() => {
    if (isFree) {
      setState({ status: "free", email: passedEmail, phone: passedPhone });
      return;
    }
    if (!sessionId) {
      setState({ status: "invalid" });
      return;
    }
    fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { paid?: boolean; amount?: number; currency?: string; email?: string; phone?: string }) => {
        if (d.paid && typeof d.amount === "number") {
          setState({
            status: "paid",
            amount: d.amount,
            currency: d.currency ?? "EUR",
            sessionId,
            email: d.email,
            phone: d.phone,
          });
        } else {
          setState({ status: "invalid" });
        }
      })
      .catch(() => setState({ status: "invalid" }));
  }, [isFree, sessionId, passedEmail, passedPhone]);

  // Only fire conversion after server-verified payment or confirmed free booking.
  // Include enhanced-conversion user_data so Google can match the lead even
  // when third-party cookies or ad trackers are blocked.
  useEffect(() => {
    if (fired.current) return;
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag !== "function") return;

    const userData = (email?: string, phone?: string) => {
      const data: Record<string, string> = {};
      if (email) data.email = email;
      if (phone) data.phone_number = phone;
      return data;
    };

    if (state.status === "free") {
      fired.current = true;
      const ud = userData(state.email, state.phone);
      if (Object.keys(ud).length) w.gtag("set", "user_data", ud);
      // Google Ads conversion
      w.gtag("event", "conversion", {
        send_to: GADS_FREE_CONSULTATION_TAG,
        value: FREE_CONSULTATION_VALUE,
        currency: "EUR",
      });
      // GA4 recommended lead event — so GA4 reports this as a conversion too
      w.gtag("event", "generate_lead", {
        currency: "EUR",
        value: FREE_CONSULTATION_VALUE,
        lead_source: "free_consultation",
      });
      console.log("[gtag] free consultation conversion + lead fired");
    } else if (state.status === "paid") {
      fired.current = true;
      const ud = userData(state.email, state.phone);
      if (Object.keys(ud).length) w.gtag("set", "user_data", ud);
      // Google Ads conversion
      w.gtag("event", "conversion", {
        send_to: GADS_PAYMENT_TAG,
        value: state.amount,
        currency: state.currency,
        transaction_id: state.sessionId,
      });
      // GA4 recommended ecommerce purchase event
      w.gtag("event", "purchase", {
        currency: state.currency,
        value: state.amount,
        transaction_id: state.sessionId,
      });
      console.log("[gtag] paid order conversion + purchase fired");
    }
  }, [state]);

  if (state.status === "loading") {
    return (
      <div className="pt-40 flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state.status === "invalid") {
    return (
      <div className="pt-40 pb-20 text-center max-w-xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-3">We couldn&apos;t verify this payment</h1>
        <p className="text-gray-500 mb-6">If you just paid, please give it a moment and refresh. Otherwise, contact us and we&apos;ll help.</p>
        <Link href="/" className="text-brand-500 hover:underline">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 lg:pt-40 pb-16 lg:pb-24">

      <div className="max-w-xl mx-auto px-4 text-center">
        <div className="bg-green-50 rounded-2xl p-10">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-5" />
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            {isFree ? "Thank You for Booking!" : "Thank You for Your Payment!"}
          </h1>
          <p className="text-gray-600 mb-2 text-lg">
            {isFree
              ? "Your complimentary consultation has been booked successfully."
              : "Your payment has been processed successfully."}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            {isFree
              ? "Our specialist will visit your home at the time you selected. We\u2019ll be in touch to confirm."
              : "You\u2019ll receive a receipt by email shortly. Our team will be in touch to confirm your installation date."}
          </p>

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

export default function SmartSpacePaymentSuccessPage() {
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
