import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | Smart Space",
  description:
    "Get in touch with Smart Space. Book a free consultation for Ring doorbell and security camera installation in Ireland.",
};

export default function ContactPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Have a question or ready to secure your home? We&apos;d love to hear from you.
            Book a free consultation today.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-16">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Contact Details
              </h2>
              <div className="space-y-5">
                {[
                  {
                    icon: Mail,
                    label: "Email",
                    value: "info@smart-space.ie",
                    href: "mailto:info@smart-space.ie",
                  },
                  {
                    icon: Phone,
                    label: "Phone",
                    value: "+353 1 513 0424",
                    href: "tel:+35315130424",
                  },
                  {
                    icon: MapPin,
                    label: "Location",
                    value: "Dublin, Ireland",
                  },
                  {
                    icon: Clock,
                    label: "Hours",
                    value: "Mon–Fri: 9am–6pm",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="p-3 bg-brand-50 rounded-xl">
                      <item.icon className="h-5 w-5 text-brand-500" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {item.label}
                      </div>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-gray-900 font-medium hover:text-brand-500 transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <div className="text-gray-900 font-medium">
                          {item.value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick info */}
            <div className="bg-brand-50 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-2">Free Consultation</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Not sure which Ring products are right for your home? Book a free
                consultation and our experts will recommend the perfect setup.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Send us a message
              </h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
