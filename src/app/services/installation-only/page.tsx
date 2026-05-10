"use client";

import { useState, useEffect } from "react";
import { Wrench, Clock, Shield, Wifi } from "lucide-react";
import { getProductByHandle, ShopifyProduct } from "@/lib/shopify";
import AddToCartButton from "@/components/AddToCartButton";
import BookingCalendar from "@/components/BookingCalendar";

const SITE = "https://smart-space.ie";

const SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Smart Doorbell & Camera Installation Dublin (Customer-Supplied Device)",
  serviceType: "Home Security Installation",
  description:
    "Professional installation of Ring, Eufy, Nest and Tapo smart doorbells and cameras you've already bought. Mounting, wiring, app configuration and walkthrough included. Available across Dublin and all of Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Dublin" },
    { "@type": "AdministrativeArea", name: "Leinster" },
  ],
  offers: {
    "@type": "Offer",
    price: "139",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/installation-only`,
  },
  // aggregateRating intentionally omitted: see bundles/driveway/page.tsx.
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Installation Only", item: `${SITE}/services/installation-only` },
  ],
};

const services = [
  {
    icon: Wrench,
    title: "Full Installation",
    description: "We mount and wire every device — doorbells, cameras, and floodlights. Clean, professional finish every time.",
  },
  {
    icon: Wifi,
    title: "Network Setup",
    description: "We ensure your Wi-Fi covers every device. If needed, we'll install a Ring Chime Pro to extend your signal.",
  },
  {
    icon: Shield,
    title: "Tailored Configuration",
    description: "We set up the app on your phone, configure motion zones, alerts, linked devices, and shared users.",
  },
  {
    icon: Clock,
    title: "Quick & Tidy",
    description: "Most installations take under an hour. We leave your home clean and tidy with everything working perfectly.",
  },
];

const brands = [
  { name: "Ring", logo: "/Ring.png", className: "h-14" },
  { name: "Eufy", logo: "/Eufy.png", className: "h-14" },
  { name: "Nest", logo: "/Nest_logo.png", className: "h-14" },
  { name: "Tapo", logo: "/Tapo.png", className: "h-28" },
];

function formatPrice(amount: string, currencyCode: string) {
  // Drop `.00` on whole-euro prices sitewide; keep cents otherwise.
  const n = parseFloat(amount);
  const isWhole = Math.round(n * 100) % 100 === 0;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(n);
}

export default function InstallationOnlyPage() {
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [bookingSelection, setBookingSelection] = useState<{ date: string; timeSlot: string; dateLabel: string; slotLabel: string } | null>(null);

  useEffect(() => {
    getProductByHandle("installation-only")
      .then((p) => {
        setProduct(p);
        // Set default options
        if (p?.options) {
          const defaults: Record<string, string> = {};
          p.options.forEach((o) => {
            if (o.values.length > 0 && o.values[0] !== "Default Title") {
              defaults[o.name] = o.values[0];
            }
          });
          setSelectedOptions(defaults);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Find matching variant
  const productOptions = product?.options?.filter((o) => !(o.values.length === 1 && o.values[0] === "Default Title")) ?? [];
  const effectiveOptions = { ...Object.fromEntries(productOptions.map((o) => [o.name, o.values[0]])), ...selectedOptions };

  // Friendly question labels for the dashboard / Stripe metadata. The raw
  // Shopify option names are verbose ("How Many Ring or Similar Products
  // Are To Be Installed") — remap to the same short labels used in the UI.
  const FRIENDLY_LABELS: Record<string, string> = {
    "How Many Ring or Similar Products Are To Be Installed": "Number of devices",
    "Video Doorbell To Be Installed ? Is There An Existing Working Wired Doorbell At The Desired Location": "Existing doorbell wiring",
    "External Video Camera(s) To Be Installed ? How Many Require New Mains Power Cabling": "Cameras needing new wiring",
  };
  const checkoutConfig: Record<string, string> = {};
  for (const [k, v] of Object.entries(effectiveOptions)) {
    const cleanKey = k.replace(/\s*\?\s*$/, "");
    const friendly = FRIENDLY_LABELS[cleanKey] ?? cleanKey;
    checkoutConfig[friendly] = v;
  }

  const matchedVariant = product?.variants.edges.find((v) =>
    v.node.selectedOptions?.every((so) => effectiveOptions[so.name] === so.value)
  )?.node ?? product?.variants.edges[0]?.node;

  const price = matchedVariant?.price ?? product?.priceRange.minVariantPrice;
  const productPrice = parseFloat(
    matchedVariant?.price?.amount ?? product?.variants.edges[0]?.node.price?.amount ?? "0"
  );
  const productImage = product?.images.edges[0]?.node.url ?? "";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
    <div className="pt-32 lg:pt-36">
      {/* Supported Brands */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
            We install all major brands at the same price
          </p>
          <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
            {brands.map((brand) => (
              <div key={brand.name} className="flex items-center justify-center">
                {brand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo} alt={brand.name} className={`${brand.className || "h-14"} opacity-60`} />
                ) : (
                  <span className="text-xl font-bold text-gray-400">{brand.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Configure & Book */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Configure Your Installation
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Tell us about your setup and choose a date
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : product ? (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Options */}
              <div className="space-y-6">
                {/* Price */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="text-sm text-gray-500 mb-1">Total price</div>
                  <div className="text-3xl font-extrabold text-[#1a1a1a]">
                    {price ? formatPrice(price.amount, price.currencyCode) : "—"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Professional installation included</div>
                </div>

                {/* Variant selectors */}
                {productOptions.map((option) => {
                  const selectedVal = effectiveOptions[option.name] ?? option.values[0];
                  const installLabels: Record<string, { label: string; help?: string }> = {
                    "How Many Ring or Similar Products Are To Be Installed": { label: "Number of Devices to Install" },
                    "Video Doorbell To Be Installed ? Is There An Existing Working Wired Doorbell At The Desired Location": { label: "Doorbell Wiring", help: "Is there an existing wired doorbell where you want the new one?" },
                    "External Video Camera(s) To Be Installed ? How Many Require New Mains Power Cabling": { label: "Cameras Needing New Wiring", help: "How many cameras need a new power cable run to them?" },
                  };
                  const rawName = option.name.replace(/\s*\?\s*$/, "");
                  const mapped = installLabels[rawName];
                  const displayLabel = mapped?.label ?? rawName;
                  const helpText = mapped?.help;
                  return (
                    <div key={option.name}>
                      <label className="block text-sm font-semibold text-[#1a1a1a] mb-1">
                        {displayLabel}
                      </label>
                      {helpText && (
                        <p className="text-xs text-gray-400 mb-2">{helpText}</p>
                      )}
                      {option.values.length <= 4 ? (
                        <div className="flex flex-wrap gap-2">
                          {option.values.map((val) => (
                            <button
                              key={val}
                              onClick={() => setSelectedOptions((prev) => ({ ...prev, [option.name]: val }))}
                              className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
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

                {/* Direct-to-Stripe — single-product page, no need to
                    route through the cart drawer. Cuts the funnel from
                    3 clicks (Add → drawer → Checkout) to 1 (Book Now). */}
                {product && (
                  <AddToCartButton
                    productId="installation-only"
                    name={product.title}
                    price={productPrice}
                    image={productImage}
                    size="lg"
                    className="w-full"
                    disabled={!bookingSelection}
                    disabledText="Select an Installation Date"
                    bookingDate={bookingSelection?.date}
                    bookingSlot={bookingSelection?.timeSlot}
                    bookingLabel={bookingSelection ? `${bookingSelection.dateLabel} ${bookingSelection.slotLabel}` : undefined}
                    configuration={checkoutConfig}
                    directCheckout
                    directLabel="Book Installation Now"
                  />
                )}
              </div>

              {/* Right: Booking Calendar */}
              <div>
                {/* Customer-supplied install — no product sourcing time
                    needed, so 5-working-day lead instead of the site-wide
                    7-day default. */}
                <BookingCalendar
                  onSelectionChange={setBookingSelection}
                  leadDays={5}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-20">Installation service not available at the moment.</p>
          )}
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              What&apos;s included
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Every installation comes with our full professional service
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service) => (
              <div key={service.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-brand-500 rounded-2xl mb-5 shadow-sm">
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
    </>
  );
}
