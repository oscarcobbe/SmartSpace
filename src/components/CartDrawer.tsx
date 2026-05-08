"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getAttribution } from "@/lib/attribution";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

export default function CartDrawer() {
  const { items, isOpen, totalQuantity, totalAmount, closeCart, updateQuantity, removeItem } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const attribution = getAttribution() ?? undefined;

      // If all items are free (e.g. free consultation), skip Stripe and book directly
      const isFree = items.every((i) => i.price === 0);
      if (isFree) {
        const res = await fetch("/api/checkout/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, attribution }),
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = "/smartspace-payment-success?free=true";
        } else {
          setCheckoutError(data.error ?? "Booking failed. Please try again.");
          setIsCheckingOut(false);
        }
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, attribution }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data);
        setCheckoutError(data.error ?? "Checkout failed. Please try again.");
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      setCheckoutError("Something went wrong. Please try again.");
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={closeCart} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[80] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Your Cart {totalQuantity ? `(${totalQuantity})` : ""}
          </h2>
          <button onClick={closeCart} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add some Ring products to get started</p>
              <button
                onClick={closeCart}
                className="mt-6 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-2.5 rounded-full transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-4 py-4 border-b border-gray-100">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-contain bg-gray-50 rounded-lg flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm font-bold text-[#1a1a1a] mt-1">
                      {formatPrice(item.price)}
                    </p>
                    {item.bookingLabel && (
                      <p className="text-xs text-brand-500 mt-1">Installation: {item.bookingLabel}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) removeItem(item.productId);
                          else updateQuantity(item.productId, item.quantity - 1);
                        }}
                        disabled={isCheckingOut}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={isCheckingOut}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        disabled={isCheckingOut}
                        className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-lg font-bold text-[#1a1a1a]">{formatPrice(totalAmount)}</span>
            </div>
            <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout</p>
            {checkoutError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{checkoutError}</p>
            )}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="block w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-full text-center transition-colors"
            >
              {isCheckingOut ? "Redirecting..." : "Checkout"}
            </button>
            <button
              onClick={closeCart}
              className="block w-full text-center text-sm text-gray-500 hover:text-[#1a1a1a] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
