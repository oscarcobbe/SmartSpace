import Link from "next/link";

const categories = [
  {
    title: "Video Doorbells",
    image: "https://images.ctfassets.net/2xsswpd01u70/5A1JdSRcakmssS97jvMCWr/8bb6c9a55d4e6bac1b7cb35883293242/Belem_Starlit_H2_tiles_HP_Desktop-Tablet-Mobile_735x552_2x.jpg",
    href: "/products/doorbells",
  },
  {
    title: "Security Cameras",
    image: "https://images.ctfassets.net/2xsswpd01u70/4630K5xQIMBFiPIvP79fZt/af9fafa3caa9794de6fb44077253d242/Belem_Squirrelfish_H2_tiles_HP_Desktop-Tablet-Mobile_735x552_2x.jpg",
    href: "/products/cameras",
  },
  {
    title: "Bundles & Packs",
    image: "https://images.ctfassets.net/2xsswpd01u70/ka62uA0Qt0SIsZ985SxiB/49212d2268c71ea9d181e081523ff93e/Belem_Vanilla_H2_tiles_HP_Desktop-Tablet-Mobile_735x552_2x.jpg",
    href: "/products/bundles",
  },
  {
    title: "Services",
    image: "https://images.ctfassets.net/2xsswpd01u70/27khOYndclWpXM5cNxdbQb/b498e3c510b52fc0fb6d7ec5f08e0ce6/hp_h2_mobile_01_327x245_2x.jpg",
    href: "/products/services",
  },
];

export default function CategoryCards() {
  return (
    <section className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] text-center mb-10">
          Discover Ring
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group relative rounded-2xl overflow-hidden bg-[#f5f5f5] aspect-[4/5] sm:aspect-[3/4]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.image}
                alt={cat.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3 className="text-white font-bold text-sm sm:text-base">{cat.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
