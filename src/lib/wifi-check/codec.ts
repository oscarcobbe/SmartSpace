/**
 * A Wi-Fi check travels as one URL parameter.
 *
 * The report is the URL: /wifi-check/report?r=... holds the readings and the
 * answers, so a report can be reopened, emailed and forwarded without a table
 * behind it. It carries measurements and house details only. Name, email and
 * phone never go in it; they arrive separately, in a POST, when somebody asks
 * for the report to be sent.
 *
 * Whatever comes back in is untrusted: a link can be edited by hand. Decoding
 * accepts only the known values and clamps every number, and anything it does
 * not recognise is a report that does not open, never one that half opens.
 *
 * Pure and dependency free, like grade.ts, so the build check runs it as is.
 */
import type { Answers, Area, Drops, Home, Place, Reading } from "./grade";

const HOMES: Home[] = ["apartment", "terrace", "semi", "detached", "bungalow"];
const AREAS: Area[] = ["upstairs", "back", "office", "garden", "front"];
const DROPS: Drops[] = ["often", "sometimes", "rarely"];
const PLACES: Place[] = ["router", "trouble", "other"];
const FLOORS = [1, 2, 3] as const;
const PEOPLE = [1, 3, 5, 6] as const;
const CAMERAS = [0, 1, 2, 3, 4] as const;

/** Four readings is a router, two rooms and a spare. More is somebody leaning on the button. */
export const MAX_READINGS = 4;

export interface WifiCheck {
  answers: Answers;
  readings: Reading[];
}

type WireReading = [Place, number, number, number | null, number | null, number, string?];

interface Wire {
  v: 1;
  a: { h: Home; f: number; p: number; t: Area[]; e: 0 | 1; d: Drops; c: number };
  r: WireReading[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function encodeCheck(c: WifiCheck): string {
  const wire: Wire = {
    v: 1,
    a: {
      h: c.answers.home,
      f: c.answers.floors,
      p: c.answers.people,
      t: c.answers.trouble,
      e: c.answers.everywhere ? 1 : 0,
      d: c.answers.drops,
      c: c.answers.cameras,
    },
    r: c.readings.slice(-MAX_READINGS).map((r) => {
      const row: WireReading = [
        r.place,
        round1(r.down),
        round1(r.up),
        r.ping == null ? null : Math.round(r.ping),
        r.busy == null ? null : Math.round(r.busy),
        Math.round(r.at),
      ];
      if (r.city) row.push(r.city);
      return row;
    }),
  };
  return toBase64Url(JSON.stringify(wire));
}

const isOneOf = <T>(list: readonly T[], v: unknown): v is T => (list as readonly unknown[]).includes(v);

const speed = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000 ? v : null;

const millis = (v: unknown): number | null | undefined =>
  v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 60_000 ? v : undefined;

/** Latin letters (accents included), digits, spaces, dots, commas, dashes and apostrophes only, capped. */
const cleanCity = (v: unknown): string | undefined =>
  typeof v === "string" ? v.replace(/[^A-Za-z\u00C0-\u024F0-9 .,'-]/g, "").slice(0, 40) || undefined : undefined;

export function decodeCheck(param: string | null | undefined): WifiCheck | null {
  if (!param || param.length > 4000) return null;
  const text = fromBase64Url(param);
  if (!text) return null;
  let w: unknown;
  try {
    w = JSON.parse(text);
  } catch {
    return null;
  }
  if (!w || typeof w !== "object") return null;
  const wire = w as Partial<Wire>;
  if (wire.v !== 1 || !wire.a || !Array.isArray(wire.r)) return null;

  const a = wire.a;
  if (!isOneOf(HOMES, a.h) || !isOneOf(FLOORS, a.f) || !isOneOf(PEOPLE, a.p)) return null;
  if (!isOneOf(DROPS, a.d) || !isOneOf(CAMERAS, a.c) || (a.e !== 0 && a.e !== 1)) return null;
  if (!Array.isArray(a.t) || !a.t.every((t) => isOneOf(AREAS, t))) return null;

  const answers: Answers = {
    home: a.h,
    floors: a.f,
    people: a.p,
    trouble: a.t.filter((t, i) => a.t.indexOf(t) === i),
    everywhere: a.e === 1,
    drops: a.d,
    cameras: a.c,
  };

  const readings: Reading[] = [];
  for (const row of wire.r.slice(-MAX_READINGS)) {
    if (!Array.isArray(row)) return null;
    const [place, down, up, ping, busy, at, city] = row as unknown[];
    const d = speed(down);
    const u = speed(up);
    const p = millis(ping);
    const b = millis(busy);
    if (!isOneOf(PLACES, place) || d == null || u == null || p === undefined || b === undefined) return null;
    if (typeof at !== "number" || !Number.isFinite(at)) return null;
    readings.push({ place, down: d, up: u, ping: p, busy: b, at, city: cleanCity(city) });
  }
  if (!readings.length) return null;
  return { answers, readings };
}

/** Where a finished check is read. */
export const reportPath = (c: WifiCheck) => `/wifi-check/report?r=${encodeCheck(c)}`;
