import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllProducts, type ShopifyProduct } from "@/lib/shopify";
import { getProductImage } from "@/data/productImages";
import FreeConsultationCTA from "@/components/FreeConsultationCTA";

const SITE = "https://smart-space.ie";

const serviceCategories = [
  {
    title: "Video Doorbells",
    description: "See, hear, and speak to anyone at your door. Professionally installed.",
    href: "/services/doorbell",
    filter: (p: ShopifyProduct) => ["plus-video-doorbell", "pro-video-doorbell"].includes(p.handle),
  },
  {
    title: "Floodlight Cameras",
    description: "Powerful floodlight cameras for driveways, gardens, and entrances.",
    href: "/services/camera",
    filter: (p: ShopifyProduct) => p.handle === "pro-floodlight-cam",
    staticImage: "/products/pro-floodlight-black.png",
  },
  {
    title: "Driveway Bundle",
    description: "Add deterrence to your front driveway or extra protection to your garden.",
    href: "/services/bundles/driveway",
    filter: (p: ShopifyProduct) => p.handle === "pro-driveway-bundle",
    staticImage: "/products/pro-driveway-black.png",
  },
  {
    title: "Whole Home Bundle",
    description: "Video Doorbell + 2x Floodlights, complete home coverage.",
    href: "/services/bundles/whole-home",
    filter: (p: ShopifyProduct) => p.handle === "pro-whole-home-bundle",
    staticImage: "/products/pro-wholehome-black-black.png",
    imageClass: "max-h-[70%] max-w-[70%]",
  },
  {
    title: "Eldercare Bundle",
    description: "Doorbell + smart keybox for elderly relatives and carer access.",
    href: "/services/eldercare-security-bundle",
    filter: (p: ShopifyProduct) => p.handle === "eldercare-security-bundle",
    staticImage: "/products/eldercare-bundle.png",
  },
  {
    title: "Installation Only",
    description: "Already have a Ring, Eufy, Nest, Tapo or Aosu device? We'll install it.",
    href: "/services/installation-only",
    filter: () => false,
    staticImage: "/products/installation.png",
  },
];

// Each child page Google should know about, in priority order. Powers
// the ItemList schema below, gives Google a clear hierarchy of services
// to consider for indexing + sitelinks treatment.
const SERVICE_INDEX = [
  { name: "Video Doorbell Installation", url: `${SITE}/services/doorbell` },
  { name: "Floodlight Camera Installation", url: `${SITE}/services/camera` },
  { name: "Driveway Bundle", url: `${SITE}/services/bundles/driveway` },
  { name: "Whole Home Bundle", url: `${SITE}/services/bundles/whole-home` },
  { name: "Eldercare Bundle", url: `${SITE}/services/eldercare-security-bundle` },
  { name: "Other Brands (Eufy Supplied & Installed)", url: `${SITE}/services/other-brands` },
  { name: "Single Device Installation", url: `${SITE}/services/single` },
  { name: "Installation Only (Customer Device)", url: `${SITE}/services/installation-only` },
  { name: "Free Home Consultation", url: `${SITE}/services/free-consultation` },
];

const ITEM_LIST_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Smart Space Ring Installation Services",
  description: "Service offerings from Smart Space, Dublin's #1 Ring installer.",
  itemListElement: SERVICE_INDEX.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: s.name,
    url: s.url,
  })),
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
  ],
};

export default async function ServicesPage() {
  const products = await getAllProducts();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ITEM_LIST_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Our Ring Services
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Everything supplied, professionally installed, and configured. Choose the service that fits your home.
          </p>
        </div>

        {/* Eufy entry pill, centred above the service grid. Text-only and
            sized to its label (not full-width) so it reads as a neat pill,
            in Eufy's brand blue (#005D8E) to set it apart from the Ring grid. */}
        <div className="mb-10 flex justify-center">
          <Link
            href="/services/eufy"
            className="inline-flex items-center justify-center bg-gradient-to-r from-[#0a6ea3] to-[#005d8e] hover:from-[#005d8e] hover:to-[#004c75] text-white font-bold text-sm sm:text-base px-7 py-3 rounded-full transition-all shadow-[0_10px_30px_-8px_rgba(0,93,142,0.5)] hover:shadow-[0_16px_45px_-8px_rgba(0,93,142,0.65)] hover:-translate-y-0.5"
          >
            Or View Our Eufy Services
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCategories.map((cat) => {
            const matchingProduct = products.find(cat.filter);
            const image = cat.staticImage
              || (matchingProduct
                ? getProductImage(matchingProduct.handle, matchingProduct.images.edges[0]?.node.url)
                : null);

            return (
              <Link
                key={cat.title}
                href={cat.href}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative bg-white aspect-[4/3] flex items-center justify-center p-6 overflow-hidden rounded-t-2xl border-b border-gray-100">
                  {image ? (
                    <Image
                      src={image}
                      alt={cat.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className={`${cat.imageClass || ""} object-contain group-hover:scale-105 transition-transform duration-300`}
                    />
                  ) : (
                    <div className="text-gray-300 text-sm">No image</div>
                  )}
                </div>
                <div className="p-6 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-500 transition-colors mb-2">
                    {cat.title}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">{cat.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500">
                    View Options <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

      </div>

      {/* Complimentary consultation */}
      <div className="mt-8">
        <FreeConsultationCTA />
      </div>
    </div>
    </>
  );
}
