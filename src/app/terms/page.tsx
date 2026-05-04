import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | Smart Space",
  description:
    "Terms of service for Smart Space — the conditions under which we provide Ring camera and video-doorbell installation services across Dublin and Leinster.",
  alternates: { canonical: "https://smart-space.ie/terms" },
  robots: { index: true, follow: true },
};

const lastUpdated = "4 May 2026";

export default function TermsPage() {
  return (
    <article className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Terms &amp; Conditions</h1>
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
        </header>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <p>
              These terms govern any installation, consultation, or product purchase you make from Smart Space
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;) via smart-space.ie or by phone. By booking an installation, paying
              for a service, or filling out our contact form, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">1. Who we are</h2>
            <p>
              Smart Space is a Ring, Eufy, Nest, and Tapo camera and video-doorbell installation business operating
              across Dublin, Leinster, and the surrounding counties. Contact:{" "}
              <a href="mailto:info@smart-space.ie" className="text-brand-500 hover:underline">
                info@smart-space.ie
              </a>{" "}
              /{" "}
              <a href="tel:+35315130424" className="text-brand-500 hover:underline">
                01 513 0424
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">2. Quotes and pricing</h2>
            <p>
              Prices shown on smart-space.ie are inclusive of VAT (where applicable) and reflect a flat fee for the
              specified scope. If on-site conditions differ materially from what you described at booking (for
              example, additional cabling required, structural drilling beyond the agreed scope, or installation
              outside our standard service area), we may quote a revised price before proceeding. You can decline and
              we will refund any deposit in full.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">3. Scheduling and access</h2>
            <p>
              Installation appointments are arranged via our booking calendar or directly by phone. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be present, or have an authorised adult present, for the full duration of the installation.</li>
              <li>Provide safe access to the installation locations and to a working power source.</li>
              <li>Confirm the device(s) you want installed are on-site at the appointment start time.</li>
              <li>Provide your Wi-Fi password if app-pairing is part of the installation scope.</li>
            </ul>
            <p>
              If we arrive at the agreed time and cannot complete the installation due to access issues outside our
              control (no one home, no Wi-Fi, device not on-site), we may charge a call-out fee of €60 to cover travel
              time before re-booking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">4. Cancellation and rescheduling</h2>
            <p>
              You can reschedule or cancel any booking up to 24 hours before the appointment at no charge — use the
              link in your Calendly confirmation email or call us. Cancellations within 24 hours may incur a €60
              call-out charge if travel has already commenced.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">5. Payment</h2>
            <p>
              All online payments are processed by Stripe (Stripe Payments Europe, Limited). We do not store
              payment-card details on our servers. By paying via Stripe checkout you also agree to{" "}
              <a href="https://stripe.com/ie/legal/consumer" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
                Stripe&apos;s Consumer Terms
              </a>
              . VAT receipts are provided automatically by Stripe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">6. Workmanship guarantee</h2>
            <p>
              Every installation is covered by a 12-month workmanship guarantee. If a fault arises that&apos;s a
              direct result of how we installed the device (for example, a loose mount, a wiring issue we caused, or
              an app-configuration mistake), we&apos;ll come back and fix it at no charge. The guarantee does not
              cover:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Faults in the device hardware itself (covered by the manufacturer&apos;s warranty).</li>
              <li>Damage caused by power surges, water ingress beyond the device&apos;s IP rating, or third-party
                modifications after we leave site.</li>
              <li>Wi-Fi or network problems caused by changes to your home network after installation.</li>
              <li>Subscription fees charged by Ring, Eufy, Nest, or any other manufacturer.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">7. Manufacturer warranties</h2>
            <p>
              The device manufacturer&apos;s standard warranty applies to the hardware itself. We will help you raise
              a warranty claim with Ring or any other brand at no charge during your 12-month workmanship-guarantee
              window.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">8. Liability</h2>
            <p>
              To the extent permitted by Irish law, our total liability for any claim arising from work we perform is
              limited to the price you paid for that installation. We&apos;re not liable for indirect or consequential
              losses (e.g. loss of footage, missed events, third-party subscription costs). Nothing in these terms
              limits our liability for death or personal injury caused by negligence, or for fraud.
            </p>
            <p>
              We carry public liability insurance to cover accidental property damage caused by our team during an
              installation. If something gets damaged, tell us before we leave site and we&apos;ll make it right.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">9. Refunds</h2>
            <p>
              Free consultations are, well, free — nothing to refund. For paid installations, you can cancel for a
              full refund up to 24 hours before your appointment. After installation is complete, you have 14 days to
              raise any workmanship issue under section 6 above and we will fix it at no charge. Cash refunds after a
              completed installation are at our discretion and reviewed on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">10. Service area</h2>
            <p>
              We cover Dublin, Wicklow, Kildare, Meath, Louth, Wexford, Carlow, Kilkenny, Laois, Offaly, Westmeath, and
              Longford. Outside these counties, we may still travel by arrangement; call-out distances are quoted per
              job.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">11. Privacy</h2>
            <p>
              How we handle your personal data is set out in our{" "}
              <Link href="/privacy" className="text-brand-500 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">12. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. The &ldquo;last updated&rdquo; date at the top reflects the
              most recent change. The terms in force at the time you booked govern that booking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">13. Governing law</h2>
            <p>
              These terms are governed by the laws of Ireland. Any dispute will be resolved in the Irish courts. If
              any clause of these terms is found to be unenforceable, the rest remain in full effect.
            </p>
          </section>

          <section className="mt-12 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Questions? Email{" "}
              <a href="mailto:info@smart-space.ie" className="text-brand-500 hover:underline">
                info@smart-space.ie
              </a>{" "}
              or see our{" "}
              <Link href="/privacy" className="text-brand-500 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
