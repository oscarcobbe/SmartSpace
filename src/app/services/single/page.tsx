import Image from "next/image";
import Link from "next/link";

const SITE = "https://smart-space.ie";

// metadata (title/description/canonical) lives in layout.tsx, duplicate
// declaration here was being silently overridden anyway and risked
// future drift. See src/app/services/single/layout.tsx.

const SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Single Ring Device Installation Dublin & Leinster",
  serviceType: "Home Security Installation",
  description:
    "Single-device installation of either a Ring Video Doorbell or a Ring Floodlight Camera, supplied and fitted across Dublin and all of Leinster. Includes mounting, wiring, app setup and walkthrough.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Dublin" },
    { "@type": "AdministrativeArea", name: "Leinster" },
  ],
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "299",
    highPrice: "599",
    priceCurrency: "EUR",
    offerCount: 4,
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/single`,
  },
  // aggregateRating intentionally omitted: see bundles/driveway/page.tsx.
};

const choices = [
  {
    title: "Video Doorbell",
    description: "See, hear, and speak to anyone at your door. All installations include a Ring Chime.",
    image: "/products/pro-video-doorbell.png",
    href: "/services/doorbell",
  },
  {
    title: "External Camera",
    description: "Powerful floodlight cameras for driveways, gardens, and rear entrances.",
    image: "/products/pro-floodlight-black.png",
    href: "/services/camera",
  },
];

export default function SingleDevicePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_SCHEMA) }} />
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-brand-500 transition-colors">Services</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Single Device</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            What would you like installed?
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Choose a Video Doorbell or External Camera, we supply and professionally install it.
          </p>
        </div>

        {/* Two choices */}
        <div className="grid sm:grid-cols-2 gap-8">
          {choices.map((choice) => (
            <Link
              key={choice.title}
              href={choice.href}
              className="group bg-white rounded-2xl border-2 border-gray-100 hover:border-brand-500 overflow-hidden transition-all hover:shadow-lg"
            >
              <div className="relative bg-transparent aspect-square flex items-center justify-center p-12">
                <Image
                  src={choice.image}
                  alt={choice.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-contain p-12 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 text-center">
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-brand-500 transition-colors mb-2">
                  {choice.title}
                </h2>
                <p className="text-sm text-gray-500">{choice.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Don't see what you need */}
        <div className="mt-12 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 font-semibold transition-colors"
          >
            Don&apos;t see what you need? Contact us
          </Link>
        </div>

        {/* Long-form content for SEO + decision support */}
        <section className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
            Choosing between a doorbell and a camera
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Most Dublin homeowners book a Video Doorbell first. It&apos;s the
              single most-installed Ring device in Ireland, partly because An
              Post and the major couriers all leave packages at the front door,
              and partly because seeing who&apos;s ringing the bell from the
              kitchen or the back garden solves an everyday inconvenience as much
              as a security concern. We supply a Ring Chime with every doorbell
              installation, so you don&apos;t need to be tied to your phone to
              hear it.
            </p>
            <p>
              An External Floodlight Camera is the right choice when the area you
              want covered isn&apos;t the front door, typically a driveway,
              side passage, rear garden, or shed. The Floodlight Cam doubles as
              your security light, so it usually replaces a separate PIR
              floodlight rather than adding to your fittings. Cameras also have
              a wider field of view than doorbells, so for a long driveway with
              parked cars you&apos;ll cover more ground with one Floodlight Cam
              than with multiple doorbells.
            </p>
            <p>
              If you&apos;re unsure which fits your property best, the{" "}
              <Link href="/services/free-consultation" className="text-brand-700 underline hover:text-brand-800">
                free home survey
              </Link>{" "}
              is the right next step. We walk the property with you, identify the
              blind spots, check Wi-Fi coverage, and send a written quote the
              same day. If you want to compare full bundles, see the{" "}
              <Link href="/services/bundles/driveway" className="text-brand-700 underline hover:text-brand-800">
                Driveway Bundle
              </Link>{" "}
              and{" "}
              <Link href="/services/bundles/whole-home" className="text-brand-700 underline hover:text-brand-800">
                Whole Home Bundle
              </Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
