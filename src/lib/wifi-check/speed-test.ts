/**
 * The speed test: M-Lab's ndt7, the same measurement Google's own speed test
 * runs, with our screen over it.
 *
 * ndt7 opens a WebSocket to the nearest M-Lab server and moves data for ten
 * seconds each way. The two workers doing that live in public/ndt7 and must be
 * the files from the installed package, byte for byte; scripts/check-ndt7.mjs
 * fails the build if they drift or if the CSP stops allowing M-Lab's hosts.
 *
 * Which numbers are used, and why:
 *
 *   - Download is the browser's own count of bytes received (MeanClientMbps),
 *     as M-Lab's reference client does.
 *   - Upload is the server's count of bytes received. The browser only knows
 *     what it handed to the socket, which on a fast upload is ahead of what
 *     has actually left the house. The browser's figure is the fallback.
 *   - Ping is the server's smallest round trip (TCP MinRTT). "Busy" is the
 *     median of the server's smoothed round trip while the download runs, the
 *     latency a video call would see with somebody streaming in the next room.
 *
 * Starting the test agrees to M-Lab's data policy: M-Lab publishes each test,
 * including the visitor's IP address. The page says so beside the button, and
 * nothing here runs before that button is pressed.
 */

import type { Ndt7Measurement, Ndt7ServerMeasurement } from "@m-lab/ndt7";

export type TestPhase = "locating" | "download" | "upload";

export interface Progress {
  phase: TestPhase;
  /** Live Mbps for the phase that is running, null while locating. */
  mbps: number | null;
  city?: string;
}

export interface TestResult {
  down: number;
  up: number;
  ping: number | null;
  busy: number | null;
  city?: string;
}

export const NDT7_WORKERS = {
  download: "/ndt7/ndt7-download-worker.js",
  upload: "/ndt7/ndt7-upload-worker.js",
} as const;

/** Sent to M-Lab so it can tell this integration's tests apart from others. */
export const NDT7_CLIENT = { client_name: "smart-space-wifi-check", client_version: "1.0.0" };

const serverUpMbps = (d: Ndt7ServerMeasurement): number | null => {
  const t = d.TCPInfo;
  if (!t?.BytesReceived || !t.ElapsedTime) return null;
  /* bytes per microsecond, times eight, is megabits per second. */
  return (t.BytesReceived / t.ElapsedTime) * 8;
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Next dev only: point the test at a local ndt7 server instead of M-Lab, so
 * the page can be exercised end to end without publishing anybody's IP
 * address. `?ndt7=localhost:8765` on /wifi-check. Ignored in production.
 */
function localServer(): { server: string; protocol: "ws" } | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  const s = new URLSearchParams(window.location.search).get("ndt7");
  return s && /^localhost:\d{2,5}$/.test(s) ? { server: s, protocol: "ws" } : null;
}

export async function runSpeedTest(onProgress: (p: Progress) => void): Promise<TestResult> {
  const { default: ndt7 } = await import("@m-lab/ndt7");

  /* Written from inside the callbacks, which TypeScript's narrowing cannot
     see, so each starts life at its full type rather than narrowed to null. */
  let city = undefined as string | undefined;
  let downClient = null as number | null;
  let upServer = null as number | null;
  let upClient = null as number | null;
  let minRtt = null as number | null;
  const rtts: number[] = [];
  const errors: string[] = [];

  onProgress({ phase: "locating", mbps: null });

  const code = await ndt7.test(
    {
      userAcceptedDataPolicy: true,
      downloadworkerfile: NDT7_WORKERS.download,
      uploadworkerfile: NDT7_WORKERS.upload,
      metadata: NDT7_CLIENT,
      ...(localServer() ?? {}),
    },
    {
      error: (e) => {
        errors.push(e instanceof Error ? e.message : String(e));
      },
      serverChosen: (s) => {
        city = s?.location?.city || undefined;
      },
      downloadStart: () => onProgress({ phase: "download", mbps: 0, city }),
      downloadMeasurement: (m: Ndt7Measurement) => {
        if (m.Source === "client") {
          downClient = m.Data.MeanClientMbps;
          onProgress({ phase: "download", mbps: downClient, city });
        } else {
          const t = m.Data.TCPInfo;
          if (t?.RTT) rtts.push(t.RTT);
          if (t?.MinRTT) minRtt = t.MinRTT;
        }
      },
      downloadComplete: (m) => {
        if (m.LastClientMeasurement) downClient = m.LastClientMeasurement.MeanClientMbps;
        const t = m.LastServerMeasurement?.TCPInfo;
        if (t?.MinRTT) minRtt = t.MinRTT;
      },
      uploadStart: () => onProgress({ phase: "upload", mbps: 0, city }),
      uploadMeasurement: (m: Ndt7Measurement) => {
        if (m.Source === "server") {
          const v = serverUpMbps(m.Data);
          if (v != null) upServer = v;
        } else {
          upClient = m.Data.MeanClientMbps;
        }
        const live = upServer ?? upClient;
        if (live != null) onProgress({ phase: "upload", mbps: live, city });
      },
      uploadComplete: (m) => {
        const v = m.LastServerMeasurement ? serverUpMbps(m.LastServerMeasurement) : null;
        if (v != null) upServer = v;
        if (m.LastClientMeasurement) upClient = m.LastClientMeasurement.MeanClientMbps;
      },
    },
  );

  const up = upServer ?? upClient;
  if (downClient == null || up == null) {
    throw new Error(errors[0] || `The speed test stopped early (code ${code}).`);
  }
  const busyUs = median(rtts);
  return {
    down: downClient,
    up,
    ping: minRtt != null ? minRtt / 1000 : null,
    busy: busyUs != null ? busyUs / 1000 : null,
    city,
  };
}

/** Android Chrome says when a page is on mobile data. Nothing else does, so this only ever warns. */
export function onMobileData(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as Navigator & { connection?: { type?: string } }).connection;
  return c?.type === "cellular";
}
