import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Single Device Installation | Smart Space",
  description: "Choose a Ring Video Doorbell or External Camera — professionally supplied and installed across Leinster.",
};

const choices = [
  {
    title: "Video Doorbell",
    description: "See, hear, and speak to anyone at your door. All installations include a Ring Chime.",
    image: "/products/pro-video-doorbell.png",
    href: "/services/doorbell",
  },
  {
    title: "External Camera",
    description: "Powerful floodlight cameras for driveways, gardens, and rear entrances.",
    image: "/products/pro-floodlight-black.png",
    href: "/services/camera",
  },
];

export default function SingleDevicePage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-brand-500 transition-colors">Services</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Single Device</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            What would you like installed?
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Choose a Video Doorbell or External Camera — we supply and professionally install it.
          </p>
        </div>

        {/* Two choices */}
        <div className="grid sm:grid-cols-2 gap-8">
          {choices.map((choice) => (
            <Link
              key={choice.title}
              href={choice.href}
              className="group bg-white rounded-2xl border-2 border-gray-100 hover:border-brand-500 overflow-hidden transition-all hover:shadow-lg"
            >
              <div className="bg-transparent aspect-square flex items-center justify-center p-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={choice.image}
                  alt={choice.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 text-center">
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-brand-500 transition-colors mb-2">
                  {choice.title}
                </h2>
                <p className="text-sm text-gray-500">{choice.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Don't see what you need */}
        <div className="mt-12 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 font-semibold transition-colors"
          >
            Don&apos;t see what you need? Click here to contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
