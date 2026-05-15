import Link from "next/link";
import {
  CalendarCheck,
  Phone,
  ArrowRight,
  Star,
  Shield,
  Award,
  MapPin,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_E164,
  BUSINESS_EMAIL,
} from "@/lib/business-constants";

/**
 * /scan — QR / marketing landing page.
 *
 * Audience: someone who just scanned a Smart Space business-card or other
 * print-asset QR code. They're on mobile. They know who Smart Space is
 * (they're holding the card). They want to know what to do next.
 *
 * The page is deliberately short and mobile-first:
 *   - One hero with two big CTAs (book consultation / call)
 *   - A quick "what to expect" block (free consultation → quote → install)
 *   - A trust strip (Est. 2018, 5★ Google, 5,000+ installs, SME 2025)
 *   - A 6-tile services grid linking deeper into the site
 *   - A final call-to-action band
 *
 * Deliberately NO long-form copy, NO product carousels, NO cart. This isn't
 * /ring-installation (which is the paid-ads landing with full shop flow).
 * This is the "scanned your card" page — fewer choices, faster decision.
 */
export default function ScanPage() {
  return (
    <div className="bg-white text-[#1C1A18]">
      {/* ───────────────────── HERO ───────────────────── */}
      <section className="relative bg-gradient-to-b from-[#1C1A18] via-[#1C1A18] to-[#2a2724] text-white pt-28 pb-14 sm:pt-32 sm:pb-20">
        <div className="max-w-3xl mx-auto px-5">
          <div className="inline-flex items-center gap-2 bg-brand-500/15 text-brand-400 text-[11px] font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Welcome from Smart Space
          </div>
          <h1 className="text-[2rem] sm:text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] mb-5">
            Dublin&apos;s #1 Ring installer.<br />
            <span className="text-brand-400">Let&apos;s sort yours.</span>
          </h1>
          <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
            Free home consultation. Flat install fee from €139. No monthly
            contract. Brand-agnostic — Ring, Eufy, Nest, Tapo. Usually fitted
            within the week.
          </p>

          {/* Primary CTA + Call CTA — stacked on mobile, side-by-side on sm+ */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md sm:max-w-none">
            <Link
              href="/services/free-consultation?utm_source=scan&utm_medium=qr&utm_campaign=card"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold text-sm sm:text-base px-6 sm:px-7 py-3.5 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(242,130,34,0.5)] hover:shadow-[0_20px_60px_-5px_rgba(242,130,34,0.65)] hover:-translate-y-0.5 whitespace-nowrap"
            >
              <CalendarCheck className="w-4 h-4" />
              Book free consultation
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={`tel:${BUSINESS_PHONE_E164}`}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-sm sm:text-base px-6 sm:px-7 py-3.5 rounded-full transition-all border border-white/20 whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              Call {BUSINESS_PHONE_DISPLAY}
            </a>
          </div>

          {/* Trust strip — what Nigel asked to surface */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl">
            <TrustChip icon={<Clock className="w-3.5 h-3.5" />} label="Est. 2018" />
            <TrustChip icon={<Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />} label="5★ Google" />
            <TrustChip icon={<Shield className="w-3.5 h-3.5" />} label="5,000+ installs" />
            <TrustChip icon={<Award className="w-3.5 h-3.5" />} label="SME 2025 Winner" />
          </div>
        </div>
      </section>

      {/* ───────────────────── HOW IT WORKS ───────────────────── */}
      <section className="py-14 sm:py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 mb-3">
            What to expect
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 leading-tight">
            Three short steps. Most installs done in a week.
          </h2>
          <div className="space-y-5">
            <Step
              num="1"
              title="Free home consultation"
              body="We come to you, assess Wi-Fi reach, look at mounting points and chime wiring, and quote on the day. Takes about 30 minutes."
            />
            <Step
              num="2"
              title="Written quote on the spot"
              body="Flat from €139 install-only. From €329 for a Plus Ring doorbell supplied + fitted. No surprise add-ons, no callback for a price."
            />
            <Step
              num="3"
              title="Fitted this week"
              body="About one hour on site for a doorbell, two to three for a bundle. We mount, wire, set up the app, tune motion zones, and train the family before we leave."
            />
          </div>
        </div>
      </section>

      {/* ───────────────────── SERVICES GRID ───────────────────── */}
      <section className="py-14 sm:py-20 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 mb-3">
            What we install
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 leading-tight">
            Everything Ring, plus brand-agnostic.
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <ServiceTile
              href="/services/installation-only"
              title="Install-only"
              price="From €139"
              note="Already bought the box? We fit it."
            />
            <ServiceTile
              href="/services/plus-video-doorbell"
              title="Plus Doorbell"
              price="From €329"
              note="Plus tier, supplied + fitted"
            />
            <ServiceTile
              href="/services/pro-video-doorbell"
              title="Pro Doorbell"
              price="From €479"
              note="2K HDR, supplied + fitted"
            />
            <ServiceTile
              href="/services/bundles/driveway"
              title="Driveway Bundle"
              price="From €599"
              note="Doorbell + floodlight cam"
            />
            <ServiceTile
              href="/services/bundles/whole-home"
              title="Whole Home"
              price="From €999"
              note="Multi-camera coverage"
            />
            <ServiceTile
              href="/services/bundles/eldercare"
              title="Eldercare"
              price="From €599"
              note="Doorbell + smart lockbox"
            />
          </div>
        </div>
      </section>

      {/* ───────────────────── AREA + REVIEW STRIP ───────────────────── */}
      <section className="py-14 sm:py-20 px-5">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-8 sm:gap-12">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 mb-3">
              Where we install
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold mb-3 leading-tight">
              Dublin + all 12 counties of Leinster
            </h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              Dublin, Wicklow, Kildare, Meath, Louth, Wexford, Carlow,
              Kilkenny, Laois, Offaly, Westmeath, Longford. Most appointments
              booked within the week.
            </p>
            <Link
              href="/areas"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              <MapPin className="w-4 h-4" />
              See your county
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 mb-3">
              What customers say
            </p>
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-sm font-bold text-gray-900">5.0</span>
              <span className="text-sm text-gray-500">on Google</span>
            </div>
            <p className="text-gray-700 italic leading-relaxed text-sm">
              &ldquo;The lads arrived on time, installed the doorbell and two
              cameras in under two hours. Everything was set up on my phone
              before they left. Highly recommend.&rdquo;
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mt-2">
              Sarah M. · Dublin
            </p>
            <Link
              href="/reviews"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              Read all reviews
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────── FINAL CTA BAND ───────────────────── */}
      <section className="py-14 sm:py-20 px-5 bg-gradient-to-br from-[#1C1A18] to-[#2a2724] text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 leading-tight">
            Ready when you are.
          </h2>
          <p className="text-white/70 leading-relaxed mb-7 max-w-md mx-auto text-sm sm:text-base">
            30-minute consultation. Written quote on the day. No obligation,
            no monthly contract.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/services/free-consultation?utm_source=scan&utm_medium=qr&utm_campaign=card"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-full transition-all whitespace-nowrap"
            >
              <CalendarCheck className="w-4 h-4" />
              Book free consultation
            </Link>
            <a
              href={`tel:${BUSINESS_PHONE_E164}`}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-full transition-all border border-white/20 whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              {BUSINESS_PHONE_DISPLAY}
            </a>
          </div>
          <p className="mt-8 text-xs text-white/40">
            <a href={`mailto:${BUSINESS_EMAIL}`} className="hover:text-white/70 underline">
              {BUSINESS_EMAIL}
            </a>{" "}
            · Est. 2018 · Three Ireland SME Winner 2025
          </p>
        </div>
      </section>
    </div>
  );
}

function TrustChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold text-white/85">
      {icon}
      {label}
    </div>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-500 text-white font-extrabold text-sm flex items-center justify-center">
        {num}
      </div>
      <div>
        <h3 className="font-bold text-lg leading-tight mb-1">{title}</h3>
        <p className="text-gray-600 leading-relaxed text-sm">{body}</p>
      </div>
    </div>
  );
}

function ServiceTile({
  href,
  title,
  price,
  note,
}: {
  href: string;
  title: string;
  price: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white border border-gray-200 hover:border-brand-500 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md"
    >
      <CheckCircle2 className="w-4 h-4 text-brand-500 mb-3" />
      <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-brand-700 transition-colors">
        {title}
      </h3>
      <p className="text-brand-600 font-bold text-xs mb-1.5">{price}</p>
      <p className="text-gray-500 text-xs leading-snug">{note}</p>
    </Link>
  );
}
