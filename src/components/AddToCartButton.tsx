"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getAttribution } from "@/lib/attribution";
import { ShoppingBag, Check, Loader2, ArrowRight } from "lucide-react";

interface AddToCartButtonProps {
  productId: string;
  name: string;
  price: number;
  image: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  disabledText?: string;
  bookingDate?: string;
  bookingSlot?: string;
  bookingLabel?: string;
  /** Customer answers to product-page questions; flows to Stripe + dashboard. */
  configuration?: Record<string, string>;
  /**
   * When true, skip the cart drawer entirely and go straight from the
   * click to Stripe Checkout. Used on the paid landing page
   * (/ring-installation) so the funnel is one click instead of three:
   *
   *   Old: Add to Cart → open drawer → Checkout (3 clicks, drawer
   *        introduces a checkpoint where users bail)
   *   New: Book Now → Stripe Checkout (1 click)
   *
   * The drawer flow is still right for product/bundle pages where the
   * customer might add multiple items. Default false for that reason.
   */
  directCheckout?: boolean;
  /**
   * Override the button label when in directCheckout mode (default
   * "Book Now"). The standard cart label "Add to Cart" makes no sense
   * when we skip the cart entirely.
   */
  directLabel?: string;
  /** Accent colour theme. Eufy product pages pass "blue"; default is Ring orange. */
  accent?: "orange" | "blue";
}

export default function AddToCartButton({
  productId,
  name,
  price,
  image,
  className = "",
  size = "md",
  disabled,
  disabledText,
  bookingDate,
  bookingSlot,
  bookingLabel,
  configuration,
  directCheckout = false,
  directLabel = "Book Now",
  accent = "orange",
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setStatus("loading");

    if (directCheckout) {
      // Skip the cart + drawer entirely. POST straight to /api/checkout
      // with this single item + attribution and redirect to Stripe.
      try {
        const attribution = getAttribution() ?? undefined;
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                productId,
                name,
                price,
                image,
                quantity: 1,
                bookingDate,
                bookingSlot,
                bookingLabel,
                configuration,
              },
            ],
            attribution,
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError(data.error ?? "Checkout failed. Please try again.");
        setStatus("idle");
      } catch {
        setError("Network error. Please try again.");
        setStatus("idle");
      }
      return;
    }

    // Regular cart flow
    addItem({ productId, name, price, image, quantity: 1, bookingDate, bookingSlot, bookingLabel, configuration });
    setStatus("added");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const sizeClasses = {
    sm: "text-xs px-4 py-2",
    md: "text-sm px-6 py-2.5",
    lg: "text-sm px-8 py-3.5",
  };

  const idleLabel = directCheckout ? directLabel : "Add to Cart";

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={disabled || status === "loading"}
        className={`inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all w-full ${sizeClasses[size]} ${
          status === "added"
            ? "bg-green-500 text-white"
            : accent === "blue"
            ? "bg-[#005d8e] hover:bg-[#004c75] text-white"
            : "bg-brand-500 hover:bg-brand-600 text-white"
        } disabled:opacity-70`}
      >
        {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === "added" && <Check className="w-4 h-4" />}
        {status === "idle" && (directCheckout ? <ArrowRight className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />)}
        {status === "loading"
          ? directCheckout ? "Redirecting…" : "Adding..."
          : status === "added"
          ? "Added!"
          : disabled && disabledText
          ? disabledText
          : idleLabel}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
