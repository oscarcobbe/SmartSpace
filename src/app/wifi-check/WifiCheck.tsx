"use client";

/**
 * The Wi-Fi check: a speed test and six questions, then the report.
 *
 * Where the test is taken matters more than the number it gives. Beside the
 * router it measures the line into the house; in the room that struggles it
 * measures what the Wi-Fi delivers there, and the gap between the two is the
 * whole diagnosis. So every reading is labelled with where it was taken, the
 * label is chosen before the test can start, and the page asks for a second
 * reading when somebody says a room struggles and has not tested in it.
 *
 * Nothing is stored. The finished check becomes the report's URL.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertTriangle, X, RotateCcw, Wifi } from "lucide-react";
import SpeedGauge from "@/components/wifi/SpeedGauge";
import { runSpeedTest, onMobileData, type Progress } from "@/lib/wifi-check/speed-test";
import { reportPath, type WifiCheck as Saved } from "@/lib/wifi-check/codec";
import { AREA_WORD, PLACE_LABEL, mbps, type Answers, type Area, type Drops, type Home, type Place, type Reading } from "@/lib/wifi-check/grade";

const HOMES: { v: Home; label: string }[] = [
  { v: "apartment", label: "Apartment" },
  { v: "terrace", label: "Terraced" },
  { v: "semi", label: "Semi-detached" },
  { v: "detached", label: "Detached" },
  { v: "bungalow", label: "Bungalow" },
];
const FLOORS: { v: 1 | 2 | 3; label: string }[] = [
  { v: 1, label: "One" },
  { v: 2, label: "Two" },
  { v: 3, label: "Three or more" },
];
const PEOPLE: { v: 1 | 3 | 5 | 6; label: string }[] = [
  { v: 1, label: "Just me" },
  { v: 3, label: "2 to 3" },
  { v: 5, label: "4 to 5" },
  { v: 6, label: "6 or more" },
];
const AREAS: { v: Area; label: string }[] = [
  { v: "upstairs", label: "Upstairs" },
  { v: "back", label: "Back of the house" },
  { v: "office", label: "Home office" },
  { v: "garden", label: "Garden room or garden" },
  { v: "front", label: "Front door" },
];
const DROPS: { v: Drops; label: string }[] = [
  { v: "often", label: "Often" },
  { v: "sometimes", label: "Now and then" },
  { v: "rarely", label: "Rarely" },
];
const CAMERAS: { v: 0 | 1 | 2 | 3 | 4; label: string }[] = [
  { v: 0, label: "None" },
  { v: 1, label: "1" },
  { v: 2, label: "2" },
  { v: 3, label: "3" },
  { v: 4, label: "4 or more" },
];

const ONE_FLOOR: Home[] = ["apartment", "bungalow"];

interface Draft {
  home?: Home;
  floors?: 1 | 2 | 3;
  people?: 1 | 3 | 5 | 6;
  trouble: Area[];
  everywhere: boolean;
  nowhere: boolean;
  drops?: Drops;
  cameras?: 0 | 1 | 2 | 3 | 4;
}

const draftFrom = (a?: Answers): Draft =>
  a
    ? { ...a, nowhere: !a.everywhere && a.trouble.length === 0 }
    : { trouble: [], everywhere: false, nowhere: false };

function complete(d: Draft): Answers | null {
  const floors = d.home && ONE_FLOOR.includes(d.home) ? 1 : d.floors;
  const troubleAnswered = d.everywhere || d.nowhere || d.trouble.length > 0;
  if (!d.home || !floors || !d.people || !troubleAnswered || !d.drops || d.cameras === undefined) return null;
  return {
    home: d.home,
    floors,
    people: d.people,
    trouble: d.everywhere || d.nowhere ? [] : d.trouble,
    everywhere: d.everywhere,
    drops: d.drops,
    cameras: d.cameras,
  };
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 px-4 rounded-full border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
        on
          ? "bg-[#1C1A18] border-[#1C1A18] text-white"
          : "bg-white border-gray-200 text-ink-soft hover:border-gray-300 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="py-5 first:pt-0 border-b border-gray-100 last:border-0">
      <legend className="text-[15px] font-bold text-ink mb-3 flex items-baseline gap-2">
        <span className="text-brand-500 text-xs font-bold tabular-nums">{n}</span>
        {title}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

const PHASE_WORD: Record<Progress["phase"], string> = {
  locating: "Finding the nearest test server",
  download: "Testing download",
  upload: "Testing upload",
};

export default function WifiCheck({ initial, initialPlace }: { initial: Saved | null; initialPlace: Place | null }) {
  const router = useRouter();
  const [readings, setReadings] = useState<Reading[]>(initial?.readings ?? []);
  const [draft, setDraft] = useState<Draft>(draftFrom(initial?.answers));
  const [place, setPlace] = useState<Place | null>(initialPlace);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [announce, setAnnounce] = useState("");
  const testRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMobile(onMobileData()), []);

  useEffect(() => {
    if (initialPlace) testRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [initialPlace]);

  const answers = complete(draft);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function toggleArea(a: Area) {
    setDraft((d) => {
      const has = d.trouble.includes(a);
      return { ...d, everywhere: false, nowhere: false, trouble: has ? d.trouble.filter((x) => x !== a) : [...d.trouble, a] };
    });
  }

  async function start() {
    if (!place || running) return;
    const where = place;
    setRunning(true);
    setError(null);
    setAnnounce(PHASE_WORD.locating);
    let lastPhase: Progress["phase"] = "locating";
    try {
      const r = await runSpeedTest((p) => {
        setProgress(p);
        if (p.phase !== lastPhase) {
          lastPhase = p.phase;
          setAnnounce(PHASE_WORD[p.phase]);
        }
      });
      const reading: Reading = { place: where, ...r, at: Date.now() };
      setReadings((rs) => [...rs, reading].slice(-4));
      setAnnounce(`Test finished: ${mbps(r.down)} Mbps download, ${mbps(r.up)} Mbps upload.`);
      setPlace(null);
    } catch (e) {
      setError(
        "The test could not reach a test server. Check you are connected, turn off any VPN, and try again." +
          (e instanceof Error && e.message ? ` (${e.message})` : ""),
      );
      setAnnounce("The test did not finish.");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  function testThere() {
    setPlace("trouble");
    testRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const hasTrouble = readings.some((r) => r.place === "trouble");
  const saidStruggles = draft.everywhere || draft.trouble.length > 0;
  const nudge = readings.length > 0 && saidStruggles && !hasTrouble && !running;
  const ready = readings.length > 0 && answers && !running;
  const live = progress?.mbps ?? null;
  const tone = progress?.phase === "upload" ? "upload" : "download";
  const oneFloor = Boolean(draft.home && ONE_FLOOR.includes(draft.home));
  let q = 0;

  return (
    <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
      <p className="sr-only" aria-live="polite">{announce}</p>

      {/* The test */}
      <div ref={testRef} className="lg:col-span-3 scroll-mt-36 bg-white rounded-3xl border border-gray-100/80 shadow-premium p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-lg sm:text-xl font-extrabold text-ink tracking-[-0.02em]">
            {readings.length ? "Test another room" : "Speed test"}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-500">
            <Wifi className="w-3.5 h-3.5" /> Step 1
          </span>
        </div>

        {mobile && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            This phone looks to be on mobile data. Connect it to your Wi-Fi first, or the test measures the mobile network.
          </p>
        )}

        <div className="relative">
          <div className="text-center text-sm font-semibold text-ink-soft h-5 mb-1">
            {running && progress ? PHASE_WORD[progress.phase] : readings.length ? "Last result" : "Ready when you are"}
            {running && progress?.city ? <span className="text-ink-muted font-medium">, server in {progress.city}</span> : null}
          </div>
          <SpeedGauge
            value={running ? live : readings.length ? readings[readings.length - 1].down : null}
            tone={tone}
            label={running && progress ? PHASE_WORD[progress.phase] : "Download"}
          />
          <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden max-w-[260px] mx-auto -mt-2" aria-hidden="true">
            {running && progress && progress.phase !== "locating" ? (
              <div key={progress.phase} className="h-full bg-brand-500 rounded-full wifi-grow" />
            ) : null}
          </div>
        </div>

        {!running && (
          <div className="mt-6">
            <p className="text-sm font-bold text-ink mb-2.5">Where are you right now?</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PLACE_LABEL) as Place[]).map((p) => (
                <Chip key={p} on={place === p} onClick={() => setPlace(p)}>
                  {PLACE_LABEL[p]}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={start}
          disabled={!place || running}
          className="btn-sheen mt-5 w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold text-sm px-6 shadow-[0_10px_30px_-8px_rgba(242,130,34,0.55)] transition-all"
        >
          <span className="relative z-10">
            {running ? "Testing, about 20 seconds" : readings.length ? "Run the test here" : "Start the speed test"}
          </span>
        </button>
        {!place && !running && (
          <p className="mt-2 text-xs text-ink-muted text-center">Choose where you are first. The report compares rooms.</p>
        )}

        {readings.length > 0 && (
          <ul className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
            {readings.map((r, i) => (
              <li key={r.at + ":" + i} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-ink">{PLACE_LABEL[r.place]}</div>
                  <div className="text-xs text-ink-muted tabular-nums">
                    {mbps(r.down)} down · {mbps(r.up)} up Mbps
                    {r.ping != null ? ` · ${Math.round(r.ping)} ms ping` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReadings((rs) => rs.filter((_, j) => j !== i))}
                  className="p-2 -m-1 rounded-full text-ink-muted hover:text-ink hover:bg-gray-100 transition-colors"
                  aria-label={`Remove the reading taken ${PLACE_LABEL[r.place].toLowerCase()}`}
                  disabled={running}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-[11px] leading-relaxed text-ink-muted">
          The speed test is run by Measurement Lab (M-Lab), the open platform behind Google&apos;s own speed test.
          Starting it agrees to M-Lab&apos;s data policy: M-Lab publishes each result, including your IP address.{" "}
          <a
            href="https://www.measurementlab.net/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            M-Lab privacy policy
          </a>
          .
        </p>
      </div>

      {/* The questions */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100/80 shadow-premium p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-lg sm:text-xl font-extrabold text-ink tracking-[-0.02em]">About your home</h2>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-500">Step 2</span>
        </div>

        <Question n={++q} title="What kind of home?">
          {HOMES.map((h) => (
            <Chip key={h.v} on={draft.home === h.v} onClick={() => set({ home: h.v })}>
              {h.label}
            </Chip>
          ))}
        </Question>

        {!oneFloor && (
          <Question n={++q} title="How many floors?">
            {FLOORS.map((f) => (
              <Chip key={f.v} on={draft.floors === f.v} onClick={() => set({ floors: f.v })}>
                {f.label}
              </Chip>
            ))}
          </Question>
        )}

        <Question n={++q} title="How many people use the internet at home?">
          {PEOPLE.map((p) => (
            <Chip key={p.v} on={draft.people === p.v} onClick={() => set({ people: p.v })}>
              {p.label}
            </Chip>
          ))}
        </Question>

        <Question n={++q} title="Where does the Wi-Fi struggle?">
          {AREAS.map((a) => (
            <Chip key={a.v} on={draft.trouble.includes(a.v)} onClick={() => toggleArea(a.v)}>
              {a.label}
            </Chip>
          ))}
          <Chip on={draft.everywhere} onClick={() => set({ everywhere: !draft.everywhere, nowhere: false, trouble: [] })}>
            Everywhere
          </Chip>
          <Chip on={draft.nowhere} onClick={() => set({ nowhere: !draft.nowhere, everywhere: false, trouble: [] })}>
            Nowhere
          </Chip>
        </Question>

        <Question n={++q} title="How often does it drop or buffer?">
          {DROPS.map((d) => (
            <Chip key={d.v} on={draft.drops === d.v} onClick={() => set({ drops: d.v })}>
              {d.label}
            </Chip>
          ))}
        </Question>

        <Question n={++q} title="Smart cameras or doorbells, now or planned?">
          {CAMERAS.map((c) => (
            <Chip key={c.v} on={draft.cameras === c.v} onClick={() => set({ cameras: c.v })}>
              {c.label}
            </Chip>
          ))}
        </Question>
      </div>

      {/* The way out */}
      <div className="lg:col-span-5">
        {nudge && (
          <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="flex-1 text-sm text-ink">
              You said it struggles{" "}
              {draft.everywhere ? "everywhere" : draft.trouble.map((t) => AREA_WORD[t]).join(", ")}. A reading there shows
              how much speed is lost on the way.
            </p>
            <button
              type="button"
              onClick={testThere}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full bg-white border border-brand-300 text-brand-700 font-bold text-sm hover:bg-brand-100 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" /> Test there now
            </button>
          </div>
        )}
        <button
          type="button"
          disabled={!ready}
          onClick={() => answers && router.push(reportPath({ answers, readings }))}
          className="btn-sheen w-full inline-flex items-center justify-center gap-2 min-h-14 rounded-2xl bg-[#1C1A18] hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-base px-6 transition-colors"
        >
          <span className="relative z-10">See my Wi-Fi report</span>
          <ArrowRight className="relative z-10 w-5 h-5" />
        </button>
        {!ready && !running && (
          <p className="mt-2 text-xs text-ink-muted text-center">
            {readings.length === 0 && !answers
              ? "Run the test and answer the questions to see your report."
              : readings.length === 0
                ? "Run the speed test to see your report."
                : "Answer the questions to see your report."}
          </p>
        )}
      </div>
    </div>
  );
}
