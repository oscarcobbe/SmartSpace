import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Plus, ShieldCheck } from "lucide-react";
import TrafficLight, { LightDot, LIGHT_TEXT, LIGHT_WORD } from "@/components/wifi/TrafficLight";
import WifiEnquiryForm from "@/components/wifi/WifiEnquiryForm";
import { approval } from "@/lib/signoff/state";
import { decodeCheck } from "@/lib/wifi-check/codec";
import {
  grade,
  mbps,
  AREA_WORD,
  PLACE_LABEL,
  BUSY_GREEN_MS,
  BUSY_RED_MS,
  MIN_NEED_MBPS,
  NETFLIX_4K_MBPS,
  RING_1080P_UPLOAD,
  RING_UPLOAD_GOOD,
  RING_UPLOAD_OKAY,
  ROOM_KEEP_GREEN,
  ROOM_KEEP_RED,
  type Cause,
  type Reading,
} from "@/lib/wifi-check/grade";
import { packageBySlug, priceLabel, priceNote, type WifiPackage } from "@/data/wifiPackages";

export const metadata: Metadata = {
  title: "Your Wi-Fi Report | Smart Space",
  description: "Your Wi-Fi check, graded green, amber or red, with what to do next.",
  robots: { index: false, follow: false },
};

const WHY: Record<Cause, string> = {
  rooms: "The Wi-Fi fades between the router and the rooms you use. The assessment measures every floor and leaves a trial fix working on the worst one for three days, so you see the result before you buy anything.",
  line: "The speed is short before the Wi-Fi is involved. The assessment's wired test at the router, and three days of monitoring, show whether the line itself is the problem: figures you can take to your provider.",
  busy: "Responses slow down when the line is busy. Three days of monitoring during the assessment show when it happens and how often.",
  drops: "Drop-outs that come and go are missed by a one-off test. The assessment monitors your network for three days and catches them as they happen.",
  none: "",
};

const when = (at: number) =>
  new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Dublin" }).format(new Date(at));

function ReadingCard({ r }: { r: Reading }) {
  const cells = [
    { k: "Download", v: `${mbps(r.down)}`, u: "Mbps" },
    { k: "Upload", v: `${mbps(r.up)}`, u: "Mbps" },
    { k: "Ping", v: r.ping == null ? "-" : `${Math.round(r.ping)}`, u: "ms" },
    { k: "When busy", v: r.busy == null ? "-" : `${Math.round(r.busy)}`, u: "ms" },
  ];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-premium">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="font-bold text-ink">{PLACE_LABEL[r.place]}</h3>
        <span className="text-xs text-ink-muted">{when(r.at)}</span>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cells.map((c) => (
          <div key={c.k} className="rounded-xl bg-cream px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{c.k}</dt>
            <dd className="mt-0.5 text-xl font-extrabold text-ink tabular-nums tracking-[-0.02em]">
              {c.v} <span className="text-xs font-semibold text-ink-muted">{c.u}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PackageCard({ pkg, lead, why }: { pkg: WifiPackage; lead: boolean; why?: string }) {
  return (
    <div
      className={`relative rounded-3xl bg-white p-6 sm:p-8 flex flex-col ${
        lead
          ? "border-2 border-brand-500 shadow-[0_30px_70px_-20px_rgba(242,100,25,0.35)]"
          : "border border-gray-100 shadow-premium"
      }`}
    >
      {lead && (
        <span className="absolute -top-3.5 left-6 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30 tracking-wide uppercase">
          Recommended for you
        </span>
      )}
      <h3 className="text-xl font-bold text-ink tracking-[-0.02em]">{pkg.name}</h3>
      <p className="mt-1 text-sm text-ink-muted">{pkg.forWho}</p>
      <div className="mt-4 text-2xl font-extrabold text-brand-500 tracking-[-0.03em]">{priceLabel(pkg)}</div>
      <p className="mt-1 text-xs text-ink-muted">{priceNote(pkg)}</p>
      {why && <p className="mt-4 text-sm text-ink-soft leading-relaxed">{why}</p>}
      <ul className="mt-5 space-y-2.5 flex-1">
        {pkg.features.slice(0, lead ? 6 : 3).map((f) => (
          <li key={f} className="flex items-start gap-3 text-[13.5px] text-ink-soft leading-relaxed">
            <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
              <Check className="h-3 w-3 text-brand-500" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={`/services/wifi/${pkg.slug}`}
        className="mt-6 inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm hover:underline"
      >
        {pkg.slug === "home-network-assessment" ? "What the assessment includes" : "Find out more"} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function WifiReportPage({ searchParams }: { searchParams: { r?: string } }) {
  const raw = typeof searchParams.r === "string" ? searchParams.r : null;
  const check = decodeCheck(raw);

  if (!check || !raw) {
    return (
      <section className="pt-36 pb-24 bg-gradient-to-b from-cream to-white">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-extrabold text-ink mb-3">This report link is incomplete</h1>
          <p className="text-ink-soft mb-8">The link may have been cut short when it was copied. Run the check again for a fresh report.</p>
          <Link
            href="/wifi-check"
            className="btn-sheen inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-sm px-7 py-3.5 rounded-full"
          >
            <span className="relative z-10">Run the Wi-Fi check</span>
          </Link>
        </div>
      </section>
    );
  }

  const { answers, readings } = check;
  const g = grade(readings, answers);
  const lead = packageBySlug(g.recommend);
  const also = packageBySlug(g.also);
  const city = readings.find((r) => r.city)?.city;
  const lowUp = Math.min(...readings.map((r) => r.up));
  const hasRouter = readings.some((r) => r.place === "router");
  const addReading = (place: "router" | "trouble") => `/wifi-check?r=${raw}&place=${place}`;

  return (
    <>
      {/* The verdict */}
      <section className="pt-32 lg:pt-36 pb-12 bg-gradient-to-b from-cream to-white relative overflow-clip">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 text-center sm:text-left">
            <TrafficLight light={g.light} />
            <div className="flex-1">
              <div className={`inline-block text-xs font-bold uppercase tracking-[0.2em] mb-3 ${LIGHT_TEXT[g.light]}`}>
                Your Wi-Fi Report · {LIGHT_WORD[g.light]}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-4 tracking-[-0.035em]">{g.headline}</h1>
              <p className="text-ink-soft text-base sm:text-lg max-w-2xl">{g.summary}</p>
              <p className="mt-4 text-xs text-ink-muted">
                {readings.length} reading{readings.length === 1 ? "" : "s"}
                {city ? `, test server in ${city}` : ""}. Your home needs about {g.needDown} Mbps download at its busiest.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* What was checked */}
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-[-0.02em] mb-4">What we checked</h2>
            <ul className="rounded-3xl border border-gray-100 bg-white shadow-premium divide-y divide-gray-100">
              {g.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-4 px-5 sm:px-6 py-4">
                  <span className="mt-1.5">
                    <LightDot light={c.light} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="font-bold text-ink">{c.title}</h3>
                      <span className={`text-xs font-bold uppercase tracking-wider ${c.light ? LIGHT_TEXT[c.light] : "text-ink-muted"}`}>
                        {c.light ? LIGHT_WORD[c.light] : "Not tested"}
                      </span>
                    </div>
                    <p className="text-sm text-ink-soft mt-0.5">{c.finding}</p>
                  </div>
                </li>
              ))}
            </ul>

            {(!hasRouter || g.untested.length > 0 || (answers.everywhere && !readings.some((r) => r.place === "trouble"))) && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                {!hasRouter && (
                  <Link
                    href={addReading("router")}
                    className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full border border-brand-300 bg-brand-50 text-brand-700 font-bold text-sm hover:bg-brand-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add a reading beside the router
                  </Link>
                )}
                {(g.untested.length > 0 || answers.everywhere) && !readings.some((r) => r.place === "trouble") && (
                  <Link
                    href={addReading("trouble")}
                    className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full border border-brand-300 bg-brand-50 text-brand-700 font-bold text-sm hover:bg-brand-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add a reading {answers.everywhere ? "where it is worst" : AREA_WORD[g.untested[0]]}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* The numbers */}
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-[-0.02em] mb-4">Your numbers</h2>
            <div className="space-y-4">
              {readings.map((r, i) => (
                <ReadingCard key={r.at + ":" + i} r={r} />
              ))}
            </div>
          </div>

          {/* What to do */}
          {lead ? (
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-[-0.02em] mb-6">What we recommend</h2>
              <div className={`grid gap-6 ${also ? "md:grid-cols-5" : ""}`}>
                <div className={also ? "md:col-span-3" : ""}>
                  <PackageCard pkg={lead} lead why={WHY[g.cause]} />
                </div>
                {also && (
                  <div className="md:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-ink-muted mb-3 md:mt-1">Also worth a look</div>
                    <PackageCard pkg={also} lead={false} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a1a] via-[#1f1a16] to-[#1a1a1a] p-6 sm:p-10 shadow-premium-lg">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-green-500/15 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ready for smart security
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.025em] mb-3">
                  Your Wi-Fi can carry smart cameras
                </h2>
                <p className="text-white/70 max-w-2xl">
                  Ring asks for {RING_1080P_UPLOAD} Mbps of upload for each camera streaming in 1080p, and 10 Mbps for 2K.
                  Your weakest reading uploads at {mbps(lowUp)} Mbps.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/services"
                    className="btn-sheen inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-sm px-7 py-3.5 rounded-full"
                  >
                    <span className="relative z-10">Ring installation</span>
                  </Link>
                  <Link
                    href="/services/eufy"
                    className="btn-sheen inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a6ea3] to-[#005d8e] text-white font-bold text-sm px-7 py-3.5 rounded-full"
                  >
                    <span className="relative z-10">Eufy installation</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Send it */}
          <div className="max-w-2xl mx-auto w-full">
            {/* The customer's emailed copy waits on Nigel's sign-off
                (src/app/api/wifi-check/route.ts). Until it is approved the
                form offers a call about the report, and promises no email. */}
            {(await approval("email:wifi-report")).approved ? (
              <WifiEnquiryForm
                report={raw}
                pkg={g.recommend}
                title="Email me this report"
                blurb="We send the full report to your inbox and ring you to talk it through."
                button="Send my report"
                emailsReport
              />
            ) : (
              <WifiEnquiryForm
                report={raw}
                pkg={g.recommend}
                title="Talk this report through with us"
                blurb="Leave your details and we ring you to go through it. The report stays at this page's address, so you can come back to it."
                button="Request a callback"
              />
            )}
          </div>

          {/* The rules */}
          <details className="rounded-2xl border border-gray-100 bg-cream px-5 sm:px-6 py-4 group">
            <summary className="cursor-pointer font-bold text-ink list-none flex items-center justify-between">
              How we grade
              <span className="text-ink-muted text-sm font-semibold group-open:hidden">Show</span>
              <span className="text-ink-muted text-sm font-semibold hidden group-open:inline">Hide</span>
            </summary>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft leading-relaxed">
              <li>
                <strong className="text-ink">Your home&apos;s need.</strong> One 4K stream per person at the same time, at
                Netflix&apos;s recommended {NETFLIX_4K_MBPS} Mbps each, and never less than {MIN_NEED_MBPS} Mbps.
              </li>
              <li>
                <strong className="text-ink">Speed into the house.</strong> Green at or above the need, amber from half the
                need, red below half.
              </li>
              <li>
                <strong className="text-ink">Rooms that struggle.</strong> Green when the room keeps{" "}
                {Math.round(ROOM_KEEP_GREEN * 100)}% of the router&apos;s speed and meets the need. Red below{" "}
                {Math.round(ROOM_KEEP_RED * 100)}%, or below half the need. Amber between.
              </li>
              <li>
                <strong className="text-ink">Upload.</strong> Ring&apos;s own scale: good above {RING_UPLOAD_GOOD} Mbps, okay
                from {RING_UPLOAD_OKAY} to {RING_UPLOAD_GOOD}, poor below {RING_UPLOAD_OKAY}. Red when it cannot carry{" "}
                {RING_1080P_UPLOAD} Mbps for each camera you told us about.
              </li>
              <li>
                <strong className="text-ink">Response when busy.</strong> Green under {BUSY_GREEN_MS} ms, amber to{" "}
                {BUSY_RED_MS} ms, red above. These lines are ours.
              </li>
              <li>
                <strong className="text-ink">Drop-outs.</strong> Often is red, now and then is amber, rarely is green.
              </li>
              <li>
                <strong className="text-ink">The light.</strong> The report takes the worst colour among the checks.
              </li>
            </ul>
            <p className="mt-4 text-xs text-ink-muted">
              Speed test by Measurement Lab (M-Lab). Results change with the device, the room and the time of day.
            </p>
          </details>

          <div className="text-center">
            <Link href="/wifi-check" className="inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm hover:underline">
              Start a new check <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
