"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Home, Phone } from "lucide-react";

/*
 * SmartCare Living's own account, and its own purchase action.
 *
 * This used to send AW-17978501655, which is Smart Space's account, so a
 * SmartCare Living sale was credited to the wrong business. The GTM repoint in
 * September fixed the container and missed this page, because nothing in the
 * codebase links to it and nobody went looking.
 *
 * SCL had no web purchase action at all until one was created for this
 * (scripts/scl-create-web-purchase.mjs in the portal), only an offline upload
 * action that cannot be fired from a page.
 */
const GADS_CONVERSION_TAG = "AW-18445485417/ccImCPmhuoAdEOmKv9tE";

interface Verified {
  status: "loading" | "paid" | "invalid";
  amount?: number;
  currency?: string;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const fired = useRef(false);
  const [state, setState] = useState<Verified>({ status: "loading" });

  /*
   * Verify with Stripe before recording anything.
   *
   * This page used to fire the conversion on mount, so anybody who opened the
   * URL, every refresh, and every crawler that followed it recorded a sale
   * that never happened. It also sent no value and no currency, so the ones
   * that did record were worth whatever the account's default was rather than
   * what the customer paid, and the bidding was set by that number.
   */
  useEffect(() => {
    if (!sessionId) { setState({ status: "invalid" }); return; }
    fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { paid?: boolean; amount?: number; currency?: string }) => {
        setState(d.paid && typeof d.amount === "number"
          ? { status: "paid", amount: d.amount, currency: d.currency ?? "EUR" }
          : { status: "invalid" });
      })
      .catch(() => setState({ status: "invalid" }));
  }, [sessionId]);

  useEffect(() => {
    if (state.status !== "paid" || fired.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w === "undefined" || typeof w.gtag !== "function") return;
    fired.current = true;
    /* transaction_id deduplicates in Google Ads across a refresh or a back
       navigation. Without it every page load counts as a fresh sale. */
    w.gtag("event", "conversion", {
      send_to: GADS_CONVERSION_TAG,
      value: state.amount,
      currency: state.currency,
      transaction_id: sessionId || undefined,
      transport_type: "beacon",
    });
  }, [state, sessionId]);

  return (
    <div className="pt-32 lg:pt-40 pb-16 lg:pb-24">
      <div className="max-w-xl mx-auto px-4 text-center">
        <div className="bg-green-50 rounded-2xl p-10">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-5" />
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            Payment Received!
          </h1>
          <p className="text-gray-600 mb-2 text-lg">
            Thank you, your payment has been processed successfully.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            You&apos;ll receive a receipt by email shortly. Our team will be in
            touch to confirm your next steps.
          </p>

          {sessionId && (
            <p className="text-xs text-gray-500 mb-6 font-mono break-all">
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
