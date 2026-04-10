"use client";

import { useCart } from "@/context/CartContext";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";

export default function CartDrawer() {
  const { cart, isOpen, isLoading, closeCart, updateItem, removeItem } = useCart();

  if (!isOpen) return null;

  const lines = cart?.lines?.edges ?? [];
  const total = cart?.cost?.totalAmount?.amount ?? "0";
  const currency = cart?.cost?.totalAmount?.currencyCode ?? "EUR";

  const formatPrice = (amount: string, code: string) => {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: code }).format(parseFloat(amount));
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
            Your Cart {cart?.totalQuantity ? `(${cart.totalQuantity})` : ""}
          </h2>
          <button onClick={closeCart} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
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
              {lines.map(({ node: line }) => {
                const image = line.merchandise.product.images.edges[0]?.node.url;
                return (
                  <li key={line.id} className="flex gap-4 py-4 border-b border-gray-100">
                    {/* Image */}
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={line.merchandise.product.title}
                        className="w-20 h-20 object-contain bg-gray-50 rounded-lg flex-shrink-0"
                      />
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-[#1a1a1a] truncate">
                        {line.merchandise.product.title}
                      </h3>
                      {line.merchandise.title !== "Default Title" && (
                        <p className="text-xs text-gray-500 mt-0.5">{line.merchandise.title}</p>
                      )}
                      <p className="text-sm font-bold text-[#1a1a1a] mt-1">
                        {formatPrice(line.merchandise.price.amount, line.merchandise.price.currencyCode)}
                      </p>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            if (line.quantity === 1) removeItem(line.id);
                            else updateItem(line.id, line.quantity - 1);
                          }}
                          disabled={isLoading}
                          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{line.quantity}</span>
                        <button
                          onClick={() => updateItem(line.id, line.quantity + 1)}
                          disabled={isLoading}
                          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(line.id)}
                          disabled={isLoading}
                          className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && (
          <div className="border-t px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-lg font-bold text-[#1a1a1a]">{formatPrice(total, currency)}</span>
            </div>
            <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout</p>
            <a
              href={cart?.checkoutUrl}
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).gtag) {
                  (window as any).gtag('event', 'conversion', {
                    send_to: 'AW-17978501655/YTk9CKrhmZkcEJfU6PxC',
                    value: total,
                    currency: currency || 'EUR',
                    transaction_id: cart?.id,
                  });
                }
              }}
              className="block w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-3.5 rounded-full text-center transition-colors"
            >
              Checkout
            </a>
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
