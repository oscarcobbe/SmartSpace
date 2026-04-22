import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight, Phone, Mail } from "lucide-react";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Areas We Cover | Ring Installation Dublin & Leinster | Smart Space",
  description:
    "Smart Space installs Ring doorbells and cameras across all 12 counties of Leinster — Dublin, Wicklow, Kildare, Meath, Louth, Wexford, Carlow, Kilkenny, Laois, Offaly, Westmeath and Longford.",
  alternates: { canonical: "/areas" },
  openGraph: {
    title: "Ring Installation Across Leinster | Smart Space",
    description:
      "We cover all 12 counties of Leinster with professional Ring doorbell and camera installation.",
    url: `${SITE}/areas`,
    type: "website",
  },
};

const counties = [
  {
    name: "Dublin",
    slug: "dublin",
    towns: "Dublin city, Dún Laoghaire, Tallaght, Swords, Blanchardstown, Clontarf, Howth, Malahide, Dundrum, Rathmines",
    copy: "Dublin is our home turf — it's where Smart Space was founded and where we&apos;ve completed the vast majority of our 5,000+ installations. Whether you&apos;re in a Georgian terrace in Rathmines, a semi-D in Tallaght, or a new-build in Swords, we know Dublin properties inside and out. Our Ring installers work across every postcode from Dublin 1 to Dublin 24, plus Dún Laoghaire–Rathdown, Fingal and South Dublin. Most Dublin appointments are booked within the week. If you need a Ring Video Doorbell, Floodlight Cam, or a full whole-home bundle installed in Dublin, we offer free consultations, honest written quotes, and professional installation — usually in under three hours.",
  },
  {
    name: "Wicklow",
    slug: "wicklow",
    towns: "Bray, Greystones, Wicklow town, Arklow, Rathdrum, Newtownmountkennedy, Enniskerry, Blessington",
    copy: "We cover all of County Wicklow from Bray and Greystones in the north down to Arklow in the south, with regular appointments in Rathdrum, Newtownmountkennedy, Enniskerry and Blessington. Wicklow homes often have longer driveways and more rural Wi-Fi coverage challenges, which is exactly the sort of install we specialise in. Our Ring installers carry network extenders and long-run power cabling as standard, so we can get cameras and doorbells online even when your existing Wi-Fi doesn&apos;t reach. Free consultations available throughout the county — we&apos;ll survey the property, identify blind spots, and send a written quote the same day.",
  },
  {
    name: "Kildare",
    slug: "kildare",
    towns: "Naas, Newbridge, Maynooth, Celbridge, Leixlip, Kildare town, Athy, Clane, Kilcock",
    copy: "Smart Space covers all of County Kildare — Naas, Newbridge, Maynooth, Celbridge, Leixlip, Kildare town, Athy, Clane and Kilcock. Kildare is one of our most active counties outside Dublin, particularly around the M4 and M7 commuter belt. We install the full Ring range on Kildare homes: Video Doorbells (including the Pro models with pre-buffering), Floodlight Cams for driveways and rear gardens, and smart lock keyboxes for Airbnb hosts and eldercare setups. If you&apos;re building or renovating in Kildare, book a pre-install consultation so we can run cables before the walls close up.",
  },
  {
    name: "Meath",
    slug: "meath",
    towns: "Navan, Ashbourne, Ratoath, Trim, Dunboyne, Kells, Dunshaughlin, Duleek",
    copy: "County Meath is within our standard service area — we install Ring doorbells and cameras in Navan, Ashbourne, Ratoath, Trim, Dunboyne, Kells, Dunshaughlin and Duleek. Many Meath homes are on larger sites with multiple entry points, so we typically recommend a Driveway or Whole Home bundle covering both front and rear. Our installers will survey the property, flag Wi-Fi dead zones, and set up motion zones that ignore roadside cars and tree branches. Meath installations are typically booked within the week, and we offer complimentary consultations with written quotes.",
  },
  {
    name: "Louth",
    slug: "louth",
    towns: "Drogheda, Dundalk, Ardee, Dunleer, Carlingford, Omeath",
    copy: "We cover County Louth — Drogheda, Dundalk, Ardee, Dunleer, Carlingford and Omeath — with the same 5-star Ring installation service we&apos;re known for in Dublin. Louth sits at the northern edge of Leinster, and we regularly install Ring systems in border-area homes where mobile signal is patchy and Wi-Fi reliability matters even more. We bring Ring Chime Pro signal extenders as standard, so every camera and doorbell stays online. Louth customers get the full Smart Space service: on-site consultation, professional mounting and wiring, app setup, and a 30-day follow-up call.",
  },
  {
    name: "Wexford",
    slug: "wexford",
    towns: "Wexford town, Enniscorthy, Gorey, New Ross, Rosslare",
    copy: "Smart Space covers County Wexford for Ring doorbell and camera installations — Wexford town, Enniscorthy, Gorey, New Ross and Rosslare. Wexford tends to be a slightly longer drive from our Dublin base, so we often batch appointments in the county and offer a small scheduling window. That means if you&apos;re ready to book a Ring install in Wexford, drop us a line and we&apos;ll let you know the next available date. All our standard services apply: Video Doorbells, Floodlight Cams, Driveway and Whole Home bundles, and installation-only for Ring devices you&apos;ve already bought.",
  },
  {
    name: "Carlow",
    slug: "carlow",
    towns: "Carlow town, Tullow, Bagenalstown, Borris",
    copy: "Carlow is part of our Leinster service area. We install Ring doorbells and cameras in Carlow town, Tullow, Bagenalstown and Borris. Our installers will drive to Carlow for both residential and small-business jobs — if you run a shop, B&B or small office and want Ring cameras installed, we can do that too. Free in-home consultation, honest written quote, and a clean, professional install typically completed in under three hours for a standard doorbell-and-camera setup.",
  },
  {
    name: "Kilkenny",
    slug: "kilkenny",
    towns: "Kilkenny city, Thomastown, Callan, Castlecomer, Graiguenamanagh",
    copy: "We install Ring doorbells and security cameras across County Kilkenny — Kilkenny city, Thomastown, Callan, Castlecomer and Graiguenamanagh. Kilkenny has a mix of older period properties and newer developments, and we&apos;re comfortable working with both. Older homes often have existing wired doorbell systems that we can retrofit with a Ring Video Doorbell Pro (mains-powered, pre-buffered recording). Newer builds usually just need clean mounting and a Wi-Fi coverage check. Either way, we&apos;ll walk your property, identify the best camera positions, and deliver a professional install.",
  },
  {
    name: "Laois",
    slug: "laois",
    towns: "Portlaoise, Portarlington, Mountmellick, Mountrath, Abbeyleix",
    copy: "County Laois is within our Leinster service area. We cover Portlaoise, Portarlington, Mountmellick, Mountrath and Abbeyleix for Ring doorbell and camera installations. Many Laois homes are on larger plots with longer driveways, so we often recommend a Floodlight Cam at the entrance paired with a Video Doorbell at the main door. This gives you a full view of anyone arriving, plus motion alerts the moment a car pulls in. Free consultation available — we&apos;ll survey the property and send a written quote the same day.",
  },
  {
    name: "Offaly",
    slug: "offaly",
    towns: "Tullamore, Birr, Edenderry, Clara, Banagher",
    copy: "Smart Space installs Ring doorbells and cameras across County Offaly — Tullamore, Birr, Edenderry, Clara and Banagher. Offaly is one of the counties where we batch appointments, so get in touch and we&apos;ll let you know the next available date we&apos;re in the area. Installation includes everything you&apos;d expect: professional mounting, weatherproofing, wiring, Wi-Fi coverage check, Ring app setup, and a full walkthrough before we leave. We also offer installation-only service for customers who&apos;ve already bought a Ring, Eufy, Nest or Tapo device.",
  },
  {
    name: "Westmeath",
    slug: "westmeath",
    towns: "Athlone, Mullingar, Moate, Kinnegad, Castlepollard",
    copy: "We cover County Westmeath for Ring installations — Athlone, Mullingar, Moate, Kinnegad and Castlepollard. Westmeath&apos;s commuter towns (particularly Mullingar and Kinnegad) are within easy reach, and Athlone we treat as a regular scheduled visit. Whether you want a single Ring Video Doorbell installed on a semi-D in Mullingar, or a Whole Home Bundle with doorbell plus two Floodlight Cams on a detached property outside Athlone, we&apos;ll scope it on a complimentary consultation and deliver a written quote the same day.",
  },
  {
    name: "Longford",
    slug: "longford",
    towns: "Longford town, Granard, Edgeworthstown, Ballymahon",
    copy: "County Longford is the furthest corner of our Leinster service area — we install Ring doorbells and cameras in Longford town, Granard, Edgeworthstown and Ballymahon. Like Offaly and Wexford, we batch Longford appointments, so please get in touch and we&apos;ll schedule your install on our next trip to the area. The full Smart Space service applies: on-site consultation, professional installation, network setup, app configuration, and a 30-day follow-up call. Longford customers receive the same 5-star service our Dublin customers do.",
  },
];

export default function AreasPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Areas We Cover</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
            <MapPin className="w-3.5 h-3.5" />
            Ring Installation Across Leinster
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Areas We Cover
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Smart Space is based in Dublin and covers all 12 counties of Leinster.
            Same professional Ring installation, same 5-star service, wherever you are.
          </p>
        </div>

        {/* Counties */}
        <div className="space-y-8">
          {counties.map((c) => (
            <article
              key={c.slug}
              id={c.slug}
              className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 lg:p-10 scroll-mt-32"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Ring Installation in {c.name}
                </h2>
                <div className="text-sm text-brand-500 font-semibold">
                  County {c.name}
                </div>
              </div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Towns: {c.towns}
              </p>
              <p
                className="text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: c.copy }}
              />
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/services/free-consultation"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                >
                  Book Free {c.name} Consultation
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="text-gray-300">·</span>
                <a
                  href="tel:+35315130424"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-brand-500 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  01 513 0424
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Jump-nav */}
        <div className="mt-12 p-6 sm:p-8 bg-gray-50 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            Jump to county
          </h3>
          <div className="flex flex-wrap gap-2">
            {counties.map((c) => (
              <a
                key={c.slug}
                href={`#${c.slug}`}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white rounded-2xl p-8 sm:p-12 max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Ready to book a Ring install?
          </h2>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            Complimentary consultation, honest written quote, professional installation.
            Anywhere in Leinster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/services/free-consultation"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors"
            >
              Book Free Consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:info@smart-space.ie"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-full transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
