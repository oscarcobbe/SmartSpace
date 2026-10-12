"use client";

import { useState } from "react";
import AddToCartButton from "@/components/AddToCartButton";
import FoundUsField from "@/components/FoundUsField";

/**
 * Pay online for a fixed-price home network service, straight to Stripe.
 * The price shown is the package's; /api/checkout charges the server's own
 * figure for "network:<slug>" (src/data/wifiPackages.ts, networkCheckoutItem)
 * and refuses any other. "How did you hear about us?" is required here as on
 * every checkout (scripts/check-found-us.mjs).
 */
export default function NetworkPayButton({ slug, name, euro }: { slug: string; name: string; euro: number }) {
  const [foundUs, setFoundUs] = useState("");
  const [foundUsDetail, setFoundUsDetail] = useState("");
  return (
    <div className="space-y-4">
      <FoundUsField
        id={`pay-${slug}-found-us`}
        value={foundUs}
        onChange={setFoundUs}
        detail={foundUsDetail}
        onDetailChange={setFoundUsDetail}
        labelClassName="block text-sm font-semibold text-ink mb-1"
        selectClassName="w-full min-h-11 border-2 border-gray-200 rounded-xl bg-white px-4 py-2.5 text-base sm:text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none transition-colors"
      />
      <AddToCartButton
        productId={`network:${slug}`}
        name={name}
        price={euro}
        image=""
        size="lg"
        className="w-full"
        disabled={!foundUs}
        disabledText="Tell us how you heard about us"
        directCheckout
        directLabel={`Pay €${euro} and Book`}
        foundUs={foundUs}
        foundUsDetail={foundUsDetail}
      />
    </div>
  );
}
