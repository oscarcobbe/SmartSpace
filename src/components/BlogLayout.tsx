import Link from "next/link";
import { ArrowRight, Phone, Clock } from "lucide-react";
import type { ReactNode } from "react";
import type { BlogPost } from "@/app/blog/blog-posts";

type Props = {
  post: BlogPost;
  toc: { id: string; label: string }[];
  children: ReactNode;
};

export default function BlogLayout({ post, toc, children }: Props) {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-brand-500 transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium truncate max-w-[200px]">{post.title}</span>
        </nav>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 text-xs font-semibold text-gray-500">
          <span className="bg-brand-500/10 text-brand-500 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {post.category}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.readingTime}
          </span>
          <span>·</span>
          <time dateTime={post.datePublished}>
            {new Date(post.datePublished).toLocaleDateString("en-IE", { year: "numeric", month: "short", day: "numeric" })}
          </time>
        </div>

        {/* H1 */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          {post.title}
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-10">
          {post.description}
        </p>

        {/* ToC */}
        <aside className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-10">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            On this page
          </h2>
          <ol className="space-y-1.5">
            {toc.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-sm text-gray-700 hover:text-brand-500 transition-colors"
                >
                  <span className="text-gray-400 mr-2">{i + 1}.</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {/* Body */}
        <article className="prose-ss">{children}</article>

        {/* Final CTA */}
        <section className="mt-16 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Want Smart Space to handle it for you?
          </h2>
          <p className="text-white/70 mb-6 max-w-lg">
            Book a complimentary consultation. We&apos;ll walk your home with you,
            identify the right setup, and send a written quote the same day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/services/free-consultation"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors"
            >
              Get a Free Quote
              <ArrowRight className="w-4 h-4" />
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

        {/* Related */}
        <section className="mt-12 pt-8 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Keep reading
          </h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/blog" className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors">
              All guides
            </Link>
            <Link href="/services" className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors">
              Our services
            </Link>
            <Link href="/areas" className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors">
              Areas we cover
            </Link>
            <Link href="/faq" className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors">
              FAQ
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
