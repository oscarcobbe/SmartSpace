/**
 * The Wi-Fi check's grading: measurements and answers in, a traffic light and
 * a recommendation out.
 *
 * Pure, and imports nothing, so the report page, the lead email and the build
 * check all run exactly this code. The light a customer sees and the light
 * Nigel is emailed cannot disagree, because the server regrades from the raw
 * readings rather than trusting a colour sent from the browser.
 *
 * Every threshold is written down here and printed on the report under "How we
 * grade". The sourced ones say whose figure they are:
 *
 *   - Netflix recommends 15 Mbps for each 4K stream (help.netflix.com/node/306).
 *   - Ring grades upload as good above 10 Mbps, okay from 5 to 10 and poor
 *     below 5, and asks for 2 Mbps of upload per 1080p camera
 *     (ring.com/support/articles/xp7mi and 92bd2).
 *
 * The rest are Smart Space's own lines and the report says so.
 */

export type Light = "green" | "amber" | "red";

/** Where the reading was taken. */
export type Place = "router" | "trouble" | "other";

export type Home = "apartment" | "terrace" | "semi" | "detached" | "bungalow";

export type Area = "upstairs" | "back" | "office" | "garden" | "front";

export type Drops = "often" | "sometimes" | "rarely";

export interface Reading {
  place: Place;
  /** Megabits per second. */
  down: number;
  up: number;
  /** The quickest round trip to the test server, in milliseconds. */
  ping: number | null;
  /** The typical round trip while the download was running, in milliseconds. */
  busy: number | null;
  /** City of the test server, when M-Lab said. */
  city?: string;
  /** When the reading was taken, epoch milliseconds. */
  at: number;
}

export interface Answers {
  home: Home;
  /** 3 means three or more. */
  floors: 1 | 2 | 3;
  /** Bands, stored as the number of people used in the sums: 1, 3, 5, 6. */
  people: 1 | 3 | 5 | 6;
  /** Where the Wi-Fi struggles. Empty means nowhere in particular. */
  trouble: Area[];
  /** True when they said it struggles everywhere. */
  everywhere: boolean;
  drops: Drops;
  /** Smart cameras and doorbells at home or planned. 4 means four or more. */
  cameras: 0 | 1 | 2 | 3 | 4;
}

export type CheckKey = "speed" | "rooms" | "upload" | "busy" | "drops";

export interface Check {
  key: CheckKey;
  title: string;
  /** Null when the check had nothing to measure. */
  light: Light | null;
  finding: string;
}

export type Cause = "line" | "rooms" | "busy" | "drops" | "none";

/** The network services, by slug in src/data/wifiPackages.ts. */
export type PackageSlug = "home-network-assessment" | "powerline-access-points" | "network-monitoring";

export interface Grade {
  light: Light;
  checks: Check[];
  cause: Cause;
  /** The package the report leads with. Null when the Wi-Fi is fine. */
  recommend: PackageSlug | null;
  /** A second package worth a look, when one applies. */
  also: PackageSlug | null;
  /** Download each person could use at once, the home's busiest hour. */
  needDown: number;
  headline: string;
  summary: string;
  /** Places the customer said struggle but did not test in. */
  untested: Area[];
}

export const NETFLIX_4K_MBPS = 15;
export const MIN_NEED_MBPS = 25;
export const RING_UPLOAD_GOOD = 10;
export const RING_UPLOAD_OKAY = 5;
export const RING_1080P_UPLOAD = 2;
/** A room that keeps at least this share of the router's speed is fine. */
export const ROOM_KEEP_GREEN = 0.6;
/** Below this share, the room has lost most of it. */
export const ROOM_KEEP_RED = 0.3;
export const BUSY_GREEN_MS = 60;
export const BUSY_RED_MS = 150;

export const PLACE_LABEL: Record<Place, string> = {
  router: "Beside the router",
  trouble: "Where the Wi-Fi struggles",
  other: "Somewhere else",
};

/** The same places, mid-sentence. */
export const PLACE_PHRASE: Record<Place, string> = {
  router: "beside the router",
  trouble: "where the Wi-Fi struggles",
  other: "where you tested",
};

export const AREA_WORD: Record<Area, string> = {
  upstairs: "upstairs",
  back: "at the back of the house",
  office: "in the home office",
  garden: "in the garden room or garden",
  front: "at the front door",
};

const RANK: Record<Light, number> = { green: 0, amber: 1, red: 2 };

export const worst = (lights: (Light | null)[]): Light | null =>
  lights.reduce<Light | null>((w, l) => (l && (!w || RANK[l] > RANK[w]) ? l : w), null);

/** One whole number for a speed, one decimal under ten, so 0.4 is not "0". */
export const mbps = (v: number) => (v >= 10 ? String(Math.round(v)) : v.toFixed(1));

/** What the home needs at its busiest: one 4K stream per person, never under 25. */
export const needDownFor = (people: number) => Math.max(MIN_NEED_MBPS, people * NETFLIX_4K_MBPS);

const bestAt = (rs: Reading[], place: Place) =>
  rs.filter((r) => r.place === place).sort((a, b) => b.down - a.down)[0] ?? null;

const worstAt = (rs: Reading[], place: Place) =>
  rs.filter((r) => r.place === place).sort((a, b) => a.down - b.down)[0] ?? null;

/*
 * A reading taken only in a room that struggles says nothing about the line
 * into the house, and grading it here would blame the broadband for a Wi-Fi
 * problem. So this check reads the router, or failing that anywhere else.
 */
function speedCheck(rs: Reading[], need: number): Check {
  const router = bestAt(rs, "router");
  const r = router ?? bestAt(rs, "other");
  const title = "Speed into the house";
  if (!r) {
    return {
      key: "speed",
      title,
      light: null,
      finding: "Not tested beside the router yet. Run the test there to see what reaches the house.",
    };
  }
  const where = router ? "beside the router" : "where you tested";
  const light: Light = r.down >= need ? "green" : r.down >= need / 2 ? "amber" : "red";
  const finding =
    light === "green"
      ? `${mbps(r.down)} Mbps ${where}. Your home needs about ${need} Mbps at its busiest.`
      : light === "amber"
        ? `${mbps(r.down)} Mbps ${where}, short of the ${need} Mbps your home needs at its busiest.`
        : `${mbps(r.down)} Mbps ${where}, well short of the ${need} Mbps your home needs at its busiest.`;
  return { key: "speed", title, light, finding };
}

function roomsCheck(rs: Reading[], a: Answers, need: number): Check {
  const router = bestAt(rs, "router");
  const room = worstAt(rs, "trouble");
  const title = "Wi-Fi in the rooms that struggle";
  if (!room) {
    const said = a.everywhere ? "everywhere" : a.trouble.map((t) => AREA_WORD[t]).join(", ");
    return {
      key: "rooms",
      title,
      light: null,
      finding: said
        ? `Not tested yet. You said it struggles ${said}. Run the test there to measure it.`
        : "Not tested. You said no room gives you trouble.",
    };
  }
  if (!router) {
    const light: Light = room.down >= need ? "green" : room.down >= need / 2 ? "amber" : "red";
    return {
      key: "rooms",
      title,
      light,
      finding: `${mbps(room.down)} Mbps where it struggles. Test beside the router as well to see how much is lost on the way.`,
    };
  }
  const keep = router.down > 0 ? room.down / router.down : 0;
  const pct = Math.round(Math.min(keep, 1) * 100);
  const light: Light =
    keep < ROOM_KEEP_RED || room.down < need / 2
      ? "red"
      : keep >= ROOM_KEEP_GREEN && room.down >= need
        ? "green"
        : "amber";
  return {
    key: "rooms",
    title,
    light,
    finding: `${mbps(room.down)} Mbps where it struggles, ${pct}% of the ${mbps(router.down)} Mbps beside the router.`,
  };
}

function uploadCheck(rs: Reading[], a: Answers): Check {
  const low = [...rs].sort((x, y) => x.up - y.up)[0];
  let light: Light = low.up > RING_UPLOAD_GOOD ? "green" : low.up >= RING_UPLOAD_OKAY ? "amber" : "red";
  const cams = a.cameras;
  if (cams > 0 && low.up < cams * RING_1080P_UPLOAD) light = "red";
  const band = low.up > RING_UPLOAD_GOOD ? "good" : low.up >= RING_UPLOAD_OKAY ? "okay" : "poor";
  const camLine =
    cams > 0
      ? ` ${cams === 4 ? "Four or more cameras need" : `${cams} camera${cams === 1 ? " needs" : "s need"}`} at least ${cams * RING_1080P_UPLOAD} Mbps at 1080p.`
      : "";
  return {
    key: "upload",
    title: "Upload, for video calls and cameras",
    light,
    finding: `${mbps(low.up)} Mbps upload, which Ring's own scale rates ${band}.${camLine}`,
  };
}

/*
 * The slowest response anywhere is the one a call in that room feels, so this
 * reads the worst reading, not the router's, and says where it was taken.
 */
function busyCheck(rs: Reading[]): Check {
  const title = "Response while the line is busy";
  const r = rs.filter((x) => x.busy != null).sort((a, b) => (b.busy ?? 0) - (a.busy ?? 0))[0];
  if (!r || r.busy == null) {
    return { key: "busy", title, light: null, finding: "The test server did not report round trips this time." };
  }
  const light: Light = r.busy < BUSY_GREEN_MS ? "green" : r.busy < BUSY_RED_MS ? "amber" : "red";
  const rest = r.ping != null ? `${Math.round(r.ping)} ms at rest and ` : "";
  const where = rs.length > 1 ? `, ${PLACE_PHRASE[r.place]}` : "";
  return {
    key: "busy",
    title,
    light,
    finding: `A round trip to the test server took ${rest}${Math.round(r.busy)} ms while downloading${where}.`,
  };
}

function dropsCheck(a: Answers): Check {
  const light: Light = a.drops === "often" ? "red" : a.drops === "sometimes" ? "amber" : "green";
  const said = a.drops === "often" ? "often" : a.drops === "sometimes" ? "now and then" : "rarely";
  return { key: "drops", title: "Drop-outs you notice", light, finding: `You said the Wi-Fi drops or buffers ${said}.` };
}

const HEADLINE: Record<Light, string> = {
  green: "Your Wi-Fi is in good shape",
  amber: "Your Wi-Fi needs attention",
  red: "Your Wi-Fi is holding your home back",
};

const SUMMARY: Record<Cause, string> = {
  line: "The speed is below what your home needs even outside the rooms that struggle. The connection into the house is the first thing to look at.",
  rooms: "The connection into the house is fine. The Wi-Fi loses speed on the way to the rooms that struggle.",
  busy: "The speed is there, but responses slow down when the line is busy. Video calls and online games are the first to suffer.",
  drops: "Today's numbers are good, and you still see drop-outs. Faults that come and go show up when the network is watched over time.",
  none: "Your connection covers what your home needs in the places you tested.",
};

const SUSPECTED =
  "You told us the Wi-Fi struggles in parts of the house. A test in those rooms shows how much speed is lost on the way.";

export function grade(readings: Reading[], a: Answers): Grade {
  if (!readings.length) throw new Error("grade needs at least one reading");
  const needDown = needDownFor(a.people);

  const speed = speedCheck(readings, needDown);
  const rooms = roomsCheck(readings, a, needDown);
  const upload = uploadCheck(readings, a);
  const busy = busyCheck(readings);
  const drops = dropsCheck(a);
  const checks = [speed, rooms, upload, busy, drops];

  /* Said it struggles somewhere, never tested there, and it drops: the rooms
     are the likely cause even without a number to prove it. */
  const tested = readings.some((r) => r.place === "trouble");
  const saidRooms = a.everywhere || a.trouble.length > 0;
  const roomsSuspected = !tested && saidRooms && a.drops !== "rarely";

  const bad = (c: Check) => c.light === "red" || c.light === "amber";
  /* Low upload is the Wi-Fi's fault only when the router's own upload was
     fine. With no reading beside the router it could be either, and watching
     the line over time is how to tell. */
  const routerUp = bestAt(readings, "router")?.up ?? null;
  const uploadIsRooms = routerUp != null && routerUp >= RING_UPLOAD_OKAY;

  /* Slow to respond only where the Wi-Fi struggles, and fine at the router:
     that is the Wi-Fi's fault, and a mesh answers it. */
  const routerBusy = bestAt(readings, "router")?.busy ?? null;
  const worstBusy = readings.filter((r) => r.busy != null).sort((x, y) => (y.busy ?? 0) - (x.busy ?? 0))[0];
  const busySlowOnlyInRooms = worstBusy?.place === "trouble" && routerBusy != null && routerBusy < BUSY_GREEN_MS;

  let cause: Cause = "none";
  if (speed.light === "red") cause = "line";
  else if (bad(rooms) || roomsSuspected) cause = "rooms";
  else if (speed.light === "amber") cause = "line";
  else if (bad(upload)) cause = uploadIsRooms ? "rooms" : "line";
  else if (bad(busy)) cause = busySlowOnlyInRooms ? "rooms" : "busy";
  else if (bad(drops)) cause = "drops";

  const light = worst(checks.map((c) => c.light)) ?? "amber";

  /*
   * Anything short of green points to the assessment, because finding the
   * cause is what it is for: a speed test from one device in one room cannot
   * tell the house from the line, and the assessment's wired test and three
   * days of monitoring can. Monitoring is the second suggestion where the
   * trouble is the line or comes and goes, since that is what it watches.
   */
  const recommend: PackageSlug | null = cause === "none" ? null : "home-network-assessment";
  const also: PackageSlug | null = cause === "line" || cause === "busy" || cause === "drops" ? "network-monitoring" : null;

  const untested: Area[] = tested ? [] : a.trouble;

  return {
    light,
    checks,
    cause,
    recommend,
    also,
    needDown,
    headline: HEADLINE[light],
    summary: cause === "rooms" && roomsSuspected && !bad(rooms) ? SUSPECTED : SUMMARY[cause],
    untested,
  };
}
