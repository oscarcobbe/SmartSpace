import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { BLOG_POSTS } from "./blog-posts";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Guides | Ring Installation & Home Security in Ireland | Smart Space",
  description:
    "Practical guides on Ring doorbell installation, home security cameras, and smart home setup for Irish homes, written by Dublin's #1 Ring installer.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Guides | Ring Installation & Home Security in Ireland",
    description:
      "Practical guides on Ring doorbells, cameras, and smart home setup for Irish homes.",
    url: `${SITE}/blog`,
    type: "website",
  },
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${SITE}/blog/#blog`,
  url: `${SITE}/blog`,
  name: "Smart Space Guides",
  description:
    "Practical guides on Ring doorbell installation, home security cameras, and smart home setup for Irish homes.",
  publisher: { "@id": `${SITE}/#organization` },
  blogPost: BLOG_POSTS.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    url: `${SITE}/blog/${p.slug}`,
    datePublished: p.datePublished,
    dateModified: p.dateModified,
  })),
};

export default function BlogIndexPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Guides</span>
        </nav>

        {/* Header */}
        <div className="mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Guides
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            Practical guides on Ring installation, home security cameras, and smart
            home setup for Irish homes. Written by Dublin&apos;s #1 Ring installer.
          </p>
        </div>

        {/* Post list */}
        <div className="grid gap-6 lg:gap-8">
          {BLOG_POSTS.map((post) => (
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
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 group-hover:text-brand-500 transition-colors mb-3">
                {post.title}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                {post.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500">
                Read guide
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gray-50 rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            Ready to book your install?
          </h2>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            Book a complimentary consultation with Dublin&apos;s #1 Ring installer.
            Serving all of Leinster.
          </p>
          <Link
            href="/services/free-consultation"
            className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
          >
            Get a Free Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
