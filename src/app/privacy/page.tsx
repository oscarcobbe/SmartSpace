import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Smart Space",
  description:
    "How Smart Space collects, uses, and stores your personal data when you use smart-space.ie. GDPR-compliant policy for our Dublin-based Ring installation business.",
  alternates: { canonical: "https://smart-space.ie/privacy" },
  robots: { index: true, follow: true },
};

const lastUpdated = "4 May 2026";

export default function PrivacyPage() {
  return (
    <article className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
        </header>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Who we are</h2>
            <p>
              Smart Space (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a Ring camera and video-doorbell installation business
              operating across Dublin and Leinster, Ireland. We are the data controller for any personal data we
              collect through smart-space.ie. You can contact us at{" "}
              <a href="mailto:info@smart-space.ie" className="text-brand-500 hover:underline">
                info@smart-space.ie
              </a>{" "}
              or by phone on{" "}
              <a href="tel:+35315130424" className="text-brand-500 hover:underline">
                01 513 0424
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">What we collect</h2>
            <p>
              The personal data we collect depends on how you interact with us:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contact form:</strong> name, email, phone number, the topic you selected, and the message you wrote.
              </li>
              <li>
                <strong>Booking and consultation:</strong> name, email, phone, installation address, and your chosen
                date and time slot.
              </li>
              <li>
                <strong>Paid order (Stripe):</strong> name, email, phone, billing address, installation address (if
                different), and payment-card details. <strong>Your card number is processed entirely by Stripe and
                never touches our servers.</strong>
              </li>
              <li>
                <strong>Marketing attribution:</strong> if you arrived from a Google Ad, Facebook ad, or other source,
                we record the click ID (e.g. <code>gclid</code>) and any UTM parameters so we can credit the right
                channel for the conversion.
              </li>
              <li>
                <strong>Website analytics:</strong> Google Analytics 4 records anonymous interactions (pages viewed,
                scroll depth, clicks). We use Google&apos;s Consent Mode v2: by default we collect no personal
                advertising or analytics data until you accept cookies.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Why we collect it</h2>
            <p>The lawful bases under GDPR are:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Performance of a contract</strong> — when you place a paid order, book a free consultation, or
                request an installation, we need your contact details to deliver the service.
              </li>
              <li>
                <strong>Legitimate interest</strong> — to respond to enquiries, schedule installations, and run a small
                business safely.
              </li>
              <li>
                <strong>Consent</strong> — for advertising and analytics cookies. You give consent via the cookie
                banner; you can change your mind any time by clearing site data and re-visiting.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Who we share it with</h2>
            <p>
              We use a small number of trusted processors to run the business. Each is listed below with the data they
              receive and where they store it:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Stripe</strong> (payment processing) — name, email, phone, address, payment details. Stored in
                the EU and US.
              </li>
              <li>
                <strong>Calendly</strong> (booking calendar) — name, email, phone, address, booking slot. Stored in the
                US under SCCs.
              </li>
              <li>
                <strong>Resend</strong> (transactional email) — your email address and any message you sent us. Stored
                in the EU.
              </li>
              <li>
                <strong>Google</strong> (Analytics 4 and Ads) — anonymised behavioural data plus, when you consent,
                hashed email and phone for advertising attribution. Stored in the EU and US under SCCs.
              </li>
              <li>
                <strong>Google Sheets / Apps Script</strong> (internal lead tracking) — every field above. Stored in
                the EU.
              </li>
              <li>
                <strong>Vercel</strong> (website hosting) — request logs and error logs only. Stored in the EU
                (Dublin).
              </li>
            </ul>
            <p>
              We never sell your personal data to anyone. We never share it with third parties for their own marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">How long we keep it</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Lead enquiries (no purchase): 12 months, then archived.</li>
              <li>Customer order records: 7 years (Irish tax law).</li>
              <li>Marketing attribution (gclid, UTM): 90 days from first capture.</li>
              <li>Cookie consent preference: 12 months from your most recent decision.</li>
              <li>Website analytics in Google Analytics: 14 months (the maximum allowed by Consent Mode v2).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Your rights</h2>
            <p>Under GDPR you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Correct anything that&apos;s wrong.</li>
              <li>Have your data erased (the &ldquo;right to be forgotten&rdquo;).</li>
              <li>Object to processing based on legitimate interest.</li>
              <li>Withdraw consent for cookies and marketing at any time.</li>
              <li>Lodge a complaint with the Irish Data Protection Commission (
                <a href="https://www.dataprotection.ie" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
                  dataprotection.ie
                </a>
                ).</li>
            </ul>
            <p>
              To exercise any of these, email us at{" "}
              <a href="mailto:info@smart-space.ie" className="text-brand-500 hover:underline">
                info@smart-space.ie
              </a>
              . We&apos;ll respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Cookies</h2>
            <p>
              The cookie banner you see on your first visit lets you accept or reject advertising and analytics
              cookies. Essential cookies (e.g. shopping-cart state) are always on because the site can&apos;t function
              without them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Changes to this policy</h2>
            <p>
              We&apos;ll update this page if our processors, retention periods, or the data we collect ever change. The
              &ldquo;last updated&rdquo; date at the top reflects the most recent change. Material changes will be
              highlighted on the homepage for at least 30 days.
            </p>
          </section>

          <section className="mt-12 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              See also our{" "}
              <Link href="/terms" className="text-brand-500 hover:underline">
                Terms &amp; Conditions
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
