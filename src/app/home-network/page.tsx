import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Phone, Wifi } from "lucide-react";
import { BLOG_POSTS, getPostBySlug } from "../blog/blog-posts";

const SITE = "https://smart-space.ie";

/*
 * The Home Network Help Centre: a pillar hub for the home network guides,
 * modelled on the topic-cluster "Centre" layout (a hero, a tool to start with,
 * the guides grouped by what the reader is trying to do, and the assessment at
 * the end), in Smart Space's own design.
 *
 * It lives at /home-network, not under /services/wifi, so it stays indexed
 * whatever NEXT_PUBLIC_NETWORK_PAGES_LIVE is doing: the service pages are gated
 * by that switch, the content that feeds them is not, the same reason the blog
 * guides sit outside it. It links to /wifi-check and /services/wifi, which is
 * allowed (see scripts/check-signoff.mjs).
 *
 * The clusters are lists of slugs, resolved from BLOG_POSTS, with a catch-all
 * so a new Home Network guide cannot silently fall off the page.
 */

export const metadata: Metadata = {
  title: "Home Wi-Fi & Network Help Centre | Smart Space",
  description:
    "Every Smart Space guide to home Wi-Fi and broadband in one place: how to find the problem, what slows a house down, the fixes from free to fitted, and when to have it measured. Written for Irish homes.",
  alternates: { canonical: "/home-network" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Home Wi-Fi & Network Help Centre | Smart Space",
    description:
      "Every Smart Space guide to home Wi-Fi and broadband in one place, for Irish homes: find the problem, understand what slows a house down, and fix it.",
    url: `${SITE}/home-network`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Smart Space Home Network Help Centre" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Wi-Fi & Network Help Centre | Smart Space",
    description: "Every Smart Space guide to home Wi-Fi and broadband in one place, for Irish homes.",
    images: ["/og-default.png"],
  },
};

/* Each cluster answers a question the reader actually has, in the order they
   tend to hit them: what is wrong, why the house struggles, what fixes it,
   the awkward rooms, and keeping it safe. Slugs, resolved from BLOG_POSTS. */
const CLUSTERS: { title: string; blurb: string; slugs: string[] }[] = [
  {
    title: "Start by finding the problem",
    blurb:
      "Before you buy anything, work out whether it is the broadband line or the Wi-Fi, and which room is losing it.",
    slugs: [
      "broadband-speed-test-ireland-line-or-wifi",
      "how-to-test-wifi-speed-room-by-room",
      "why-wifi-slow-upstairs-irish-homes",
      "wifi-slow-in-the-evening-ireland",
      "why-does-my-wifi-keep-dropping-ireland",
    ],
  },
  {
    title: "A slow or overloaded house",
    blurb: "What a busy, device-filled Irish home asks of the connection, and how much broadband you actually need.",
    slugs: [
      "what-broadband-speed-do-i-need-ireland",
      "too-many-devices-slow-wifi-ireland",
      "working-from-home-wifi-ireland",
    ],
  },
  {
    title: "The fixes, from free to fitted",
    blurb:
      "Mesh, powerline, extenders, cabling and new routers: what each one actually does, and which problem it solves.",
    slugs: [
      "wifi-extender-mesh-or-powerline-ireland",
      "mesh-wifi-explained",
      "powerline-adapters-ireland",
      "running-ethernet-cable-existing-house-ireland",
      "wifi-6-wifi-7-new-router-ireland",
    ],
  },
  {
    title: "Rooms, offices and devices",
    blurb: "Garden offices, home working, Wi-Fi calling, and smart cameras that keep dropping the signal.",
    slugs: ["wifi-garden-office-ireland", "wifi-calling-ireland", "smart-camera-wifi-drops-irish-homes"],
  },
  {
    title: "Keep your network secure",
    blurb: "Lock down the router, the cameras and the accounts, and spot a call pretending to be your provider.",
    slugs: ["secure-home-wifi-ireland"],
  },
];

/* Resolve the clusters, and sweep up any Home Network guide not placed in one,
   so a future guide appears here on its own. */
const resolved = CLUSTERS.map((c) => ({
  ...c,
  posts: c.slugs.flatMap((s) => {
    const p = getPostBySlug(s);
    return p ? [p] : [];
  }),
})).filter((c) => c.posts.length > 0);

const placed = new Set(CLUSTERS.flatMap((c) => c.slugs));
const leftover = BLOG_POSTS.filter((p) => p.category === "Home Network" && !placed.has(p.slug));
if (leftover.length > 0) {
  resolved.push({ title: "More home network guides", blurb: "", slugs: [], posts: leftover });
}

const allPosts = resolved.flatMap((c) => c.posts);

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE}/home-network/#hub`,
  url: `${SITE}/home-network`,
  name: "Home Wi-Fi & Network Help Centre",
  description:
    "Smart Space's guides to home Wi-Fi and broadband for Irish homes, grouped by what the reader is trying to do.",
  isPartOf: { "@id": `${SITE}/#website` },
  publisher: { "@id": `${SITE}/#organization` },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: allPosts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/blog/${p.slug}`,
      name: p.title,
    })),
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Home Network", item: `${SITE}/home-network` },
  ],
};

export default function HomeNetworkHub() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Home Network</span>
        </nav>

        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            The Home Network Help Centre
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Slow Wi-Fi, a room that never gets a signal, calls that drop, a camera that keeps going offline. These guides
            explain what is actually happening in an Irish home, and how to fix it, in plain English. They are written
            the way we work: measure first, then spend only where it helps.
          </p>
        </div>

        {/* Start here: the free check, our version of "not sure where to start" */}
        <div className="mb-16 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center">
              <Wifi className="w-6 h-6 text-brand-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-1.5">Not sure where to start?</h2>
              <p className="text-gray-600 leading-relaxed">
                Run the free Wi-Fi check beside your router and again in the room that struggles. It grades the result
                green, amber or red, and tells you whether it is the line or the Wi-Fi, so you know which guide you need.
              </p>
            </div>
            <Link
              href="/wifi-check"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3.5 rounded-full transition-colors"
            >
              Run the Free Wi-Fi Check
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Clusters */}
        <div className="space-y-16">
          {resolved.map((group) => (
            <section key={group.title}>
              <header className="mb-8 text-center">
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-2.5">{group.title}</h2>
                {group.blurb && (
                  <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">{group.blurb}</p>
                )}
              </header>
              <div className="grid gap-6 lg:gap-8 max-w-3xl mx-auto">
                {group.posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 hover:border-brand-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3 text-xs font-semibold text-gray-500">
                      <span className="bg-brand-500/10 text-brand-500 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readingTime}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 group-hover:text-brand-500 transition-colors mb-3">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">{post.description}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500">
                      Read the guide
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Assessment CTA */}
        <section className="mt-16 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Want it measured and fixed for you?</h2>
          <p className="text-white/70 mb-6 max-w-xl leading-relaxed">
            The home network assessment tests your broadband by cable at the router, measures every floor, and leaves a
            working powerline and access point trial on the floor that struggles for three days, with the figures in a
            written report. It is €395, credited in full against any work, across Dublin and the rest of Leinster.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/services/wifi"
              className="inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold px-8 py-3.5 rounded-full transition-colors"
            >
              See the Assessment
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/wifi-check"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-full transition-colors"
            >
              Run the Free Check
            </Link>
            <a
              href="tel:+35315130424"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-full transition-colors"
            >
              <Phone className="w-4 h-4" />
              01 513 0424
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
