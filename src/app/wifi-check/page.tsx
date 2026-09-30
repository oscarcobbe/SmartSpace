import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowDown, ArrowUp, Timer, Activity } from "lucide-react";
import WifiCheck from "./WifiCheck";
import TrafficLight from "@/components/wifi/TrafficLight";
import GuideLinks from "@/components/wifi/GuideLinks";
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

/*
 * The questions people type when they want a speed test (Keyword Planner,
 * Ireland, 30 September 2026: "check wifi speed" 720 a month, "upload speed
 * test" and "check upload speed" 210 each, "ping speed test" 170, "check wifi
 * signal strength" 140), answered with the check's own published rules and
 * the two sourced figures it uses (Netflix's 15 Mbps per 4K stream, Ring's
 * upload scale). Plain strings, because the same text feeds the FAQ markup.
 */
const FAQ = [
  {
    q: "How do I check my Wi-Fi speed?",
    a: "Run the test beside your router first, then again in the room where the Wi-Fi struggles, on the same device. The router result is roughly what your broadband delivers, and the gap between it and the room is your Wi-Fi.",
  },
  {
    q: "What is a good Wi-Fi speed for a home?",
    a: "Enough for everyone at once, in the rooms you use. Netflix recommends 15 Mbps for each 4K stream, so the check allows 15 Mbps for each person in the house, with 25 Mbps as the least any home needs.",
  },
  {
    q: "How do I check my upload speed?",
    a: "This test measures upload as well as download. Upload carries video calls and every clip a smart camera or doorbell sends. Ring asks for 2 Mbps of upload for each 1080p camera, and rates upload above 10 Mbps as good, 5 to 10 Mbps as okay, and below 5 Mbps as poor.",
  },
  {
    q: "What does ping mean on a speed test?",
    a: "How quickly the connection answers, in milliseconds. The check also measures it while the connection is busy, because a line that answers quickly when idle can stall when someone starts streaming. It grades under 60 ms while busy as green and over 150 ms as red.",
  },
  {
    q: "How do I check my Wi-Fi signal strength?",
    a: "Signal bars on a phone do not say how much of your broadband reaches a room. Speed does: test in the room and compare it with the result beside the router. The check treats a room that keeps at least 60 per cent of the router's speed as fine, and one that keeps under 30 per cent as a room that has lost most of it.",
  },
  {
    q: "Why is my result lower than my broadband package?",
    a: "A test over Wi-Fi measures the Wi-Fi as well as the line, and results are often lower in the evening, when more people nearby are online. To see what the line itself delivers, test on a cable plugged into the router.",
  },
  {
    q: "Who runs the speed test?",
    a: "Measurement Lab, the open platform behind Google's own speed test. It publishes each result, with the internet address it came from. Your report is kept in its own link, and we only get your name and number if you send them to us.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};


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
              className="inline-flex items-center gap-1.5 text-brand-700 font-semibold text-sm hover:underline"
            >
              See the home network assessment <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="py-14 lg:py-20 bg-gradient-to-b from-white to-cream">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-[-0.03em] text-center mb-8">Speed Test Questions</h2>
          <div className="divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white shadow-premium">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 sm:px-7 py-5">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-bold text-ink">
                  {f.q}
                  <span className="text-brand-500 text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-ink-soft leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <GuideLinks className="mt-8 text-center" />
        </div>
      </section>
    </>
  );
}
