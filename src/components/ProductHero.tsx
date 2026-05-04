"use client";

import { useState } from "react";
import { Star, Shield, Wrench, Award } from "lucide-react";
import type { ShopifyProduct } from "@/lib/shopify";
import { getColourImage, getProductImage } from "@/data/productImages";
import AddToCartButton from "@/components/AddToCartButton";
import BookingCalendar from "@/components/BookingCalendar";

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currencyCode }).format(parseFloat(amount));
}

const titleRenames: [RegExp, string][] = [
  [/\(Premium\)/gi, "(Pro)"],
];

function displayTitle(title: string): string {
  let result = title;
  for (const [pattern, replacement] of titleRenames) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

interface Props {
  product: ShopifyProduct;
  shortDescription: string | undefined;
}

export default function ProductHero({ product, shortDescription }: Props) {
  const handle = product.handle;
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [bookingSelection, setBookingSelection] = useState<{ date: string; timeSlot: string; dateLabel: string; slotLabel: string } | null>(null);

  const ringImage = getProductImage(handle, undefined);
  const shopifyImages = product.images.edges.map((e) => e.node.url);

  // Build selected options with defaults (first value for each option)
  const productOptions = product.options?.filter((o) => {
    if (o.values.length === 1 && o.values[0] === "Default Title") return false;
    if (product.productType === "Video Doorbell" && /colou?r|faceplate/i.test(o.name)) return false;
    return true;
  }) ?? [];
  const effectiveOptions = { ...Object.fromEntries(productOptions.map((o) => [o.name, o.values[0]])), ...selectedOptions };

  const selectedColour = Object.entries(effectiveOptions).find(([key]) => /colou?r/i.test(key))?.[1];
  const colourImage = selectedColour ? getColourImage(handle, selectedColour) : null;
  const baseImage = colourImage || ringImage;
  const allImages = baseImage ? [baseImage] : shopifyImages.slice(0, 1);

  const matchedVariant = product.variants.edges.find((v) =>
    v.node.selectedOptions?.every((so) => effectiveOptions[so.name] === so.value)
  )?.node ?? product.variants.edges[0]?.node;

  const price = matchedVariant?.price ?? product.priceRange.minVariantPrice;
  const comparePrice = matchedVariant?.compareAtPrice ?? product.compareAtPriceRange?.minVariantPrice;
  const hasDiscount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount);
  const isService = product.productType === "Consultation" || product.productType === "Subscription";
  const productPrice = parseFloat(
    matchedVariant?.price?.amount ?? product.variants.edges[0]?.node.price?.amount ?? "0"
  );
  const productImage = allImages[0] ?? shopifyImages[0] ?? "";

  const colourMap: Record<string, string> = {
    black: "#1a1a1a", white: "#ffffff", bronze: "#CD7F32", silver: "#C0C0C0",
    "satin nickel": "#B8B8B8", grey: "#808080", gray: "#808080", blue: "#3B82F6",
    "both black": "#1a1a1a", "both white": "#ffffff",
  };
  const isMixed = (v: string) => v.toLowerCase().includes("mixed");

  const optionLabels: Record<string, { label: string; help?: string }> = {
    "Choose A Power Option": { label: "Doorbell Power Source", help: "Do you have an existing wired doorbell we can connect to, or will new wiring be needed?" },
    "Power Options": { label: "Doorbell Power Source" },
    "Video Doorbell - Power Options": { label: "Doorbell Power Source", help: "Do you have an existing wired doorbell at the location?" },
    "How Many Ring or Similar Products Are To Be Installed": { label: "Number of Devices to Install" },
    "Video Doorbell To Be Installed ? Is There An Existing Working Wired Doorbell At The Desired Location": { label: "Doorbell Wiring", help: "Is there an existing wired doorbell where you want the new one?" },
    "External Video Camera(s) To Be Installed ? How Many Require New Mains Power Cabling": { label: "Cameras Needing New Wiring", help: "How many cameras need a new power cable run to them?" },
    "Quantity Of Spotlights To Be Installed": { label: "Number of Spotlight Cams" },
    "How Many Spotlights Are On The Exact Position Of An Existing Working Light or Power Source": { label: "Spotlights Replacing Existing Lights", help: "How many will be fitted where there\u2019s already a working light or power point?" },
    "Quantity Of Floodlights To Be Installed": { label: "Number of Floodlight Cams" },
    "How Many Floodlights Are On The Exact Position Of An Existing Working Light or Power Source": { label: "Floodlights Replacing Existing Lights", help: "How many will be fitted where there\u2019s already a working light or power point?" },
    "Will The Floodlight Cam Replace An Existing Working Light ? Or Will A New Power Source Be Required": { label: "Floodlight Cam Power Source", help: "Will the floodlight cam replace an existing working light, or does it need new wiring?" },
    "Will A New Power Source Be Required": { label: "Floodlight Cam Power Source", help: "Will the floodlight cam replace an existing working light, or does it need new wiring?" },
    "Will The Floodlight Cams Replace Existing Working Lights": { label: "Floodlight Cam Power Sources", help: "Will the floodlight cams replace existing working lights, or need new wiring?" },
    "Colour Preference Of Floodlight Cam": { label: "Floodlight Cam Colour" },
    "Colour Preference Of Floodlight Cams": { label: "Floodlight Cam Colour" },
    "Spotlight Cam Colour": { label: "Spotlight Cam Colour" },
    "Floodlight Cam Colour": { label: "Floodlight Cam Colour" },
    "Number of Floodlight Cams Required & How Many Require New Power Sources": { label: "Floodlight Cams & Power Sources", help: "Select how many floodlight cams you need and how many require new wiring" },
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
      {/* Left: Image Gallery */}
      <div>
        <div className="bg-transparent rounded-2xl p-10 sm:p-16 flex items-center justify-center aspect-square mb-4">
          {allImages[selectedImage] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={allImages[selectedImage]}
              alt={product.title}
              className="object-contain max-h-full max-w-full transition-opacity duration-300"
            />
          ) : (
            <div className="text-gray-300 text-sm">No image available</div>
          )}
        </div>
        {allImages.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-transparent p-1.5 border-2 transition-all ${
                  selectedImage === i
                    ? "border-brand-500 ring-1 ring-brand-500/30"
                    : "border-transparent hover:border-gray-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Product Info */}
      <div className="flex flex-col">
        {product.productType && (
          <span className="inline-block w-fit bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            {product.productType}
          </span>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] leading-tight mb-3">
          {displayTitle(product.title)}
        </h1>

        {/* Social proof */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-sm text-gray-500">5</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">5,000+ installations</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-3xl font-extrabold text-[#1a1a1a]">
            {formatPrice(price.amount, price.currencyCode)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(comparePrice.amount, comparePrice.currencyCode)}
              </span>
              <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Save {formatPrice((parseFloat(comparePrice.amount) - parseFloat(price.amount)).toString(), price.currencyCode)}
              </span>
            </>
          )}
        </div>

        {/* Short description */}
        <p className="text-gray-600 leading-relaxed mb-6">
          {shortDescription || product.description}
        </p>

        {/* Variant selector */}
        {productOptions.length > 0 && (
          <div className="space-y-4 mb-6">
            {productOptions.map((option) => {
              const isColour = /colou?r/i.test(option.name);
              const selectedVal = effectiveOptions[option.name] ?? option.values[0];
              const rawName = option.name.replace(/\s*\?\s*$/, "");
              const mapped = optionLabels[rawName];
              let displayLabel: string;
              if (/accessor/i.test(option.name) && product.productType === "Video Doorbell") {
                displayLabel = "Add An Accessory (One Chime Already Included)";
              } else {
                displayLabel = mapped?.label ?? rawName;
              }
              const helpText = mapped?.help;

              return (
                <div key={option.name}>
                  <label className="block text-sm font-semibold text-[#1a1a1a] mb-1">
                    {displayLabel}{isColour && selectedVal ? `: ${selectedVal}` : ""}
                  </label>
                  {helpText && (
                    <p className="text-xs text-gray-600 mb-2">{helpText}</p>
                  )}
                  {isColour ? (
                    <div className="flex flex-wrap gap-3">
                      {option.values.map((val) => {
                        const isSelected = selectedVal === val;
                        const mixed = isMixed(val);
                        const hex = colourMap[val.toLowerCase()] || "#ccc";
                        return (
                          <button
                            key={val}
                            onClick={() => setSelectedOptions((prev) => ({ ...prev, [option.name]: val }))}
                            className={`w-10 h-10 rounded-full border-2 transition-all relative overflow-hidden ${
                              isSelected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-gray-200 hover:border-gray-400"
                            }`}
                            style={mixed ? undefined : { backgroundColor: hex }}
                            title={val}
                          >
                            {mixed && (
                              <>
                                <span className="absolute inset-0 w-1/2 bg-[#1a1a1a]" />
                                <span className="absolute inset-0 left-1/2 w-1/2 bg-white" />
                              </>
                            )}
                            {isSelected && (
                              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold z-10 ${
                                val.toLowerCase().includes("white") && !mixed ? "text-gray-800" : "text-white"
                              }`}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : option.values.length <= 4 ? (
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((val) => (
                        <button
                          key={val}
                          onClick={() => setSelectedOptions((prev) => ({ ...prev, [option.name]: val }))}
                          className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                            selectedVal === val
                              ? "border-brand-500 bg-brand-500/5 text-brand-500"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <select
                      value={selectedVal}
                      onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [option.name]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none transition-colors"
                    >
                      {option.values.map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Booking Calendar */}
        {!isService && (
          <div className="mb-6">
            <BookingCalendar
              compact
              onSelectionChange={setBookingSelection}
            />
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3 mb-6">
          <AddToCartButton
            productId={product.handle}
            name={displayTitle(product.title)}
            price={productPrice}
            image={productImage}
            size="lg"
            className="w-full"
            disabled={!isService && !bookingSelection}
            disabledText="Select an Installation Date"
            bookingDate={bookingSelection?.date}
            bookingSlot={bookingSelection?.timeSlot}
            bookingLabel={bookingSelection ? `${bookingSelection.dateLabel} ${bookingSelection.slotLabel}` : undefined}
            configuration={effectiveOptions}
          />
        </div>

        {/* Trust Strip */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl">
          {[
            { icon: Shield, text: "Dublin's #1 Ring Installer" },
            { icon: Star, text: "5-Star Google Rating" },
            { icon: Wrench, text: "5,000+ Installations" },
            { icon: Award, text: "SME Winner 2025" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
