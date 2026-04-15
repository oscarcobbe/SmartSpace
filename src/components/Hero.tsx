import Link from "next/link";

export default function Hero() {
  return (
    <section className="w-full bg-[#d4d4d4] h-[70vh] sm:h-screen relative overflow-hidden">
      {/* Full-bleed desktop hero image from ring.com */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.ctfassets.net/2xsswpd01u70/2NWGNqdYfFotIijt96Zb9n/cd6be1445272e247f685b2d4eba888d5/H1_Hero_HP_desktop_1366x768_V5.png"
        alt="Ring security cameras and video doorbells on display"
        className="absolute inset-0 w-full h-full object-cover object-bottom"
      />

      {/* Text — upper area */}
      <div className="absolute z-10 top-[25%] sm:top-[16%] left-0 right-0 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[2rem] sm:text-5xl lg:text-[3.5rem] font-extrabold text-[#1a1a1a] leading-[1.1] tracking-tight mb-3 sm:mb-5">
            Expertly Installed.<br className="hidden sm:block" /> Perfectly Secured.
          </h1>
          <p className="text-[#555] text-sm sm:text-lg max-w-lg mx-auto">
            We professionally install every doorbell, camera, and floodlight. 5,000+ installations across Leinster.
          </p>
        </div>
      </div>

      {/* Button — lower area */}
      <div className="absolute z-10 bottom-16 sm:bottom-32 lg:bottom-36 left-0 right-0 px-4 text-center">
        <Link
          href="/services/bundles"
          className="inline-block bg-[#1a1a1a] hover:bg-black text-white font-semibold text-sm px-8 py-3 rounded-full transition-colors"
        >
          View Popular Bundles
        </Link>
      </div>
    </section>
  );
}
