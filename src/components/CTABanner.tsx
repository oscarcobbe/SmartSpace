import { Phone, ArrowRight, Shield } from "lucide-react";

export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 py-16 lg:py-24">
      {/* Background accents */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 rounded-2xl mb-2">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white max-w-2xl leading-tight">
            Ready to Secure Your Home?
          </h2>
          <p className="text-white/80 text-lg max-w-xl leading-relaxed">
            Get expert advice on the best Ring setup for your home. Free
            consultation, no obligation. We&apos;re here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <a
              href="#products"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-600 font-bold px-10 py-4 rounded-full hover:bg-gray-50 hover:shadow-lg hover:shadow-white/20 transition-all text-base"
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="tel:+35315130424"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-10 py-4 rounded-full hover:bg-white/10 hover:border-white/50 transition-all text-base"
            >
              <Phone className="h-4 w-4" />
              Book Consultation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
