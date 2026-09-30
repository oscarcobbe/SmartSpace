import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowDown, ArrowUp, Timer, Activity } from "lucide-react";
import WifiCheck from "./WifiCheck";
import TrafficLight from "@/components/wifi/TrafficLight";
import { decodeCheck } from "@/lib/wifi-check/codec";
import type { Light, Place } from "@/lib/wifi-check/grade";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Free Wi-Fi Speed Test, Room by Room | Smart Space Ireland",
  description:
    "A free Wi-Fi and broadband speed test for Irish homes. Test beside the router, then in the room where it struggles, answer six questions, and get a report graded green, amber or red with what to do next.",
  alternates: { canonical: "/wifi-check" },
  openGraph: {
    title: "Free Wi-Fi Speed Test, Room by Room | Smart Space",
    description:
      "A speed test and six questions about your home. Your report is graded green, amber or red.",
    url: `${SITE}/wifi-check`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Smart Space Wi-Fi Check" }],
  },
};

const MEASURES = [
  {
    icon: ArrowDown,
    title: "Download",
    body: "How fast data reaches you. Streaming, browsing and downloads all run on it.",
  },
  {
    icon: ArrowUp,
    title: "Upload",
    body: "How fast data leaves the house. Video calls and smart cameras send on it.",
  },
  {
    icon: Timer,
    title: "Ping",
    body: "The quickest round trip to the test server, in milliseconds. Lower is better.",
  },
  {
    icon: Activity,
    title: "Response when busy",
    body: "The round trip while the download runs, the delay a call feels when somebody else is streaming.",
  },
];

const LIGHTS: { light: Light; title: string; body: string }[] = [
  {
    light: "green",
    title: "Green",
    body: "Your connection covers what your home needs in every place you tested.",
  },
  {
    light: "amber",
    title: "Amber",
    body: "Something falls short: a room, the upload, the response when busy, or drop-outs you notice.",
  },
  {
    light: "red",
    title: "Red",
    body: "Your home needs more than the Wi-Fi delivers, in speed, reach or both.",
  },
];

export default function WifiCheckPage({ searchParams }: { searchParams: { r?: string; place?: string } }) {
  const initial = decodeCheck(typeof searchParams.r === "string" ? searchParams.r : null);
  const place = (["router", "trouble", "other"] as Place[]).find((p) => p === searchParams.place) ?? null;

  return (
    <>
      <section className="pt-32 lg:pt-36 pb-14 lg:pb-20 bg-gradient-to-b from-cream to-white relative overflow-clip">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -right-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <nav className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services/wifi" className="hover:text-brand-500 transition-colors">Home Network</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Wi-Fi Check</span>
          </nav>

          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
              Free Wi-Fi Check
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-4 tracking-[-0.035em]">
              Free Wi-Fi Speed Test, Room by Room
            </h1>
            <p className="text-ink-soft text-base sm:text-lg max-w-2xl mx-auto">
              Test beside the router, then in the room where it struggles. Answer six questions about your home and
              your report is graded green, amber or red, with what to do next.
            </p>
          </div>

          <WifiCheck initial={initial} initialPlace={place} />
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">
              What It Measures
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-[-0.03em]">Four numbers per room</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {MEASURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-cream p-5">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-ink mb-1">{title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-4 sm:gap-5">
            {LIGHTS.map(({ light, title, body }) => (
              <div key={light} className="flex items-start gap-4 rounded-2xl border border-gray-100 p-5 bg-white shadow-premium">
                <TrafficLight light={light} size="sm" />
                <div>
                  <h3 className="font-bold text-ink mb-1">{title}</h3>
                  <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/services/wifi"
              className="inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm hover:underline"
            >
              See the home network assessment <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
