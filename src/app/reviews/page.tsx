import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Reviews | Smart Space — Dublin's #1 Ring Installer",
  description:
    "See customer reviews for Smart Space. Rated 5.0 on Google. 5,000+ Ring installations across Dublin and Leinster.",
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: "Reviews | Smart Space — Dublin's #1 5-Star Ring Installer",
    description:
      "5.0 on Google · 5,000+ installations across Dublin and Leinster.",
    url: `${SITE}/reviews`,
    type: "website",
  },
};

const googleReviews = [
  {
    author: "Sarah M.",
    rating: 5,
    text: "Fantastic service from start to finish. The lads arrived on time, installed the doorbell and two cameras in under two hours. Everything was set up on my phone before they left. Highly recommend!",
    date: "2 weeks ago",
    datePublished: "2026-04-08",
  },
  {
    author: "James O'Brien",
    rating: 5,
    text: "Had the driveway bundle installed — doorbell and floodlight cam. Professional job, very tidy cabling, and they took the time to explain how everything works. Great value.",
    date: "1 month ago",
    datePublished: "2026-03-22",
  },
  {
    author: "Mary K.",
    rating: 5,
    text: "Got the eldercare bundle for my mother's house. The doorbell and lockbox give us great peace of mind. The installer was so patient explaining everything to her. Five stars.",
    date: "1 month ago",
    datePublished: "2026-03-15",
  },
  {
    author: "David C.",
    rating: 5,
    text: "Second time using Smart Space — they installed cameras at my office after doing my home. Same brilliant service both times. These guys know Ring inside out.",
    date: "2 months ago",
    datePublished: "2026-02-20",
  },
  {
    author: "Aoife D.",
    rating: 5,
    text: "Couldn't be happier. We had a whole home setup done — doorbell, two floodlights. The team were friendly, professional, and left everything spotless. Already recommended to neighbours.",
    date: "2 months ago",
    datePublished: "2026-02-10",
  },
  {
    author: "Patrick L.",
    rating: 5,
    text: "Had a Nest camera that another company couldn't install properly. Smart Space came out, sorted it in 30 minutes, and even helped me set up the app. Brilliant service.",
    date: "3 months ago",
    datePublished: "2026-01-20",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

const reviewsSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE}/#localbusiness`,
  name: "Smart Space",
  url: SITE,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    bestRating: "5",
    reviewCount: "100",
  },
  review: googleReviews.map((r) => ({
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
    author: { "@type": "Person", name: r.author },
    reviewBody: r.text,
    datePublished: r.datePublished,
  })),
};

export default function ReviewsPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsSchema) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            What Our Customers Say
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
            5,000+ installations across Dublin and Leinster. Here&apos;s what some of our customers have to say.
          </p>

          {/* Google rating badge */}
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-gray-900">5.0</span>
              <StarRating rating={5} />
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="text-left">
              <div className="text-sm font-bold text-gray-900">Google Reviews</div>
              <div className="text-xs text-gray-500">Based on 100+ reviews</div>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {googleReviews.map((review) => (
            <div
              key={review.author}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <StarRating rating={review.rating} />
              <p className="text-gray-600 text-sm leading-relaxed mt-4 mb-5">
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">{review.author}</span>
                <span className="text-xs text-gray-400">{review.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gray-50 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            Join 5,000+ happy customers
          </h2>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            See why we&apos;re Dublin&apos;s #1 5-star Ring installer. Browse our services and book your installation today.
          </p>
          <Link
            href="/services"
            className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
          >
            Browse Services
          </Link>
        </div>
      </div>
    </div>
  );
}
