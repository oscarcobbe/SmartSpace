import { Search, ShoppingBag, Wrench } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Browse",
    description: "Explore our range of Ring doorbells, cameras, and floodlights.",
    step: "01",
  },
  {
    icon: ShoppingBag,
    title: "Order",
    description: "Place your order online or book a free consultation with our team.",
    step: "02",
  },
  {
    icon: Wrench,
    title: "Install",
    description: "We deliver and professionally install your Ring system. Simple.",
    step: "03",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-brand-500 font-semibold text-sm uppercase tracking-widest">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 mb-4">
            How It Works
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-50 text-brand-500 rounded-2xl mb-5">
                <s.icon className="h-7 w-7" />
              </div>
              <div className="text-xs font-bold text-brand-400 mb-2">STEP {s.step}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
