import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";

/**
 * Service tiers — editorial-row layout.
 *
 * Replaces the previous three-column "pricing card" layout (raised
 * Most-Popular middle card + gradient halo + bullet checkmarks). That
 * pattern reads as a SaaS pricing page, not a Dublin tradesman's
 * portfolio. Each row now leads with a real photograph of the actual
 * solution and uses asymmetric weighting so visual hierarchy comes
 * from copy + photo, not from chrome.
 *
 * To swap a photo: drop a 1200×800 image into /public/products/ and
 * update the `image` field. Aspect ratio is locked at 4:3 by the
 * outer container; images are object-cover so they crop gracefully.
 */
const tiers = [
  {
    name: "Single Ring Doorbell or Camera",
    blurb:
      "One device, one job. Doorbell at the front, camera at the side, that's it. Most homes start here.",
    price: "From €299",
    features: [
      "Professional installation included",
      "Ring Chime included with doorbells",
      "App setup, motion zones, alerts",
      "Wi-Fi signal check",
    ],
    href: "/services/single",
    image: "/products/plus-video-doorbell.jpg",
    imageAlt: "Ring video doorbell mounted at a Dublin home's front door",
  },
  {
    name: "Whole-Home Bundle",
    blurb:
      "Doorbell, side camera, driveway camera, floodlight cam. The full setup, professionally installed and configured. What most homes end up with.",
    price: "From €509",
    features: [
      "Multiple devices supplied and installed",
      "Network optimisation",
      "Linked devices and shared users",
      "User training session at handover",
    ],
    href: "/services/bundles",
    image: "/products/plus-wholehome-black-black.png",
    imageAlt: "Ring whole-home bundle: doorbell, cameras, and floodlight",
  },
  {
    name: "Installation Only",
    blurb:
      "Already bought your gear? We install it. Ring, Eufy, Nest, Tapo. Same craftsmanship, no product markup.",
    price: "From €139",
    features: [
      "Your existing device installed",
      "Ring, Eufy, Nest and Tapo supported",
      "Professional mounting and wiring",
      "App setup and Wi-Fi check",
    ],
    href: "/services/installation-only",
    image: "/products/installation-lifestyle.jpg",
    imageAlt: "Smart Space installer mounting a security camera",
  },
];

export default function CategoryCards() {
  return (
    <section className="py-24 lg:py-32 bg-surface-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section heading. No eyebrow tag — the headline carries it. */}
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-1 mb-4 tracking-[-0.035em]">
            What&apos;s right for your home?
          </h2>
          <p className="text-ink-3 text-base sm:text-lg max-w-xl mx-auto">
            Three ways we work. Transparent prices. No hidden fees.
          </p>
        </div>

        {/* Editorial rows. Each row alternates photo-left / photo-right
            on desktop for visual rhythm; on mobile they stack photo-on-top
            in source order. Spacing between rows uses divider lines, not
            gap-only — divider gives the page editorial structure. */}
        <div className="divide-y divide-gray-200/70">
          {tiers.map((tier, i) => {
            const reverse = i % 2 === 1;
            return (
              <article
                key={tier.name}
                className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-center py-12 lg:py-16 first:pt-0 last:pb-0"
              >
                {/* Photo */}
                <div
                  className={`lg:col-span-5 ${reverse ? "lg:order-2" : ""}`}
                >
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface-2">
                    <Image
                      src={tier.image}
                      alt={tier.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Copy */}
                <div className={`lg:col-span-7 ${reverse ? "lg:order-1" : ""}`}>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-1 mb-3 tracking-[-0.025em] leading-[1.15]">
                    {tier.name}
                  </h3>
                  <p className="text-ink-3 text-base leading-relaxed mb-6 max-w-prose">
                    {tier.blurb}
                  </p>

                  {/* Price + included list. Side-by-side on desktop so the
                      price stays prominent without needing a separate
                      "Most Popular" pill. */}
                  <div className="grid sm:grid-cols-[auto_1fr] gap-x-10 gap-y-4 mb-7 items-start">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-ink-4 mb-1">
                        Price
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-brand-700 tracking-[-0.03em] whitespace-nowrap">
                        {tier.price}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-sm text-ink-2"
                        >
                          <Check
                            className="w-4 h-4 text-brand-700 flex-shrink-0 mt-0.5"
                            strokeWidth={2.5}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={tier.href}
                    className="btn-sheen focus-ring group inline-flex items-center gap-2 bg-ink-1 hover:bg-black text-white font-semibold text-sm px-7 py-3.5 rounded-full transition-all shadow-premium hover:shadow-premium-lg hover:-translate-y-0.5"
                  >
                    <span className="relative z-10">See {tier.name}</span>
                    <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
