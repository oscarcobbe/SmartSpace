/**
 * Nigel's capture sheet, as the portal's form.
 *
 * Laid out in the order of "Assessment Capture Sheet TEMPLATE" in the
 * SmartSpace Networks Templates folder (the version of 2 October 2026, 23:56,
 * which added "Booking the visit"), with his own wording, so the screen reads
 * like the paper he already fills in. Each section's fields are stored under
 * capture[section id] in network_assessments.capture, so adding a line to the
 * paper sheet is adding a field here, not a migration.
 *
 * Three things the paper sheet does by hand are done by the Pi instead, and so
 * have no field here: the socket and baseline readings (a Measure button fills
 * them), "Log cleared" and "Cron result confirmed landing" (Start the trial and
 * the check report them), and the per-device table at collection (read from
 * devices.log).
 *
 * Words on screen follow the CRM's: customer, never client.
 */

export type FieldKind = "text" | "long" | "number" | "date" | "datetime" | "tick" | "choice";

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
  /** Wide fields take the whole row on a desktop. */
  wide?: boolean;
}

export type ColumnKind = "text" | "number" | "tick";

export interface Column { key: string; label: string; kind: ColumnKind; placeholder?: string }

export interface TableSpec {
  key: string;
  label: string;
  columns: Column[];
  addLabel: string;
  maxRows: number;
  note?: string;
}

export type Group =
  | { heading?: string; note?: string; fields: Field[] }
  | { heading?: string; note?: string; table: TableSpec };

export interface Section {
  id: string;
  title: string;
  /** The "Do this" list from the sheet, shown above the fields. */
  doThis?: string[];
  groups: Group[];
}

export const FLOORS = ["Garden level", "Ground floor", "First floor", "Second floor", "Third floor"] as const;

export const LINE_VERDICTS = [
  { value: "fine", label: "Line is fine. Problem is inside the house. Carry on." },
  { value: "provider", label: "Speed far below package. Fault is the provider. Document and say so." },
  { value: "latency", label: "Latency climbs badly under load. Mesh will not fix this." },
  { value: "loss", label: "Packet loss on a wired test. Raise with the provider first." },
  { value: "placement", label: "Router placement is itself part of the problem." },
];

export const RECOMMENDATIONS = [
  { value: "proceed", label: "Proceed: install as trialled" },
  { value: "ceiling", label: "Proceed with a stated ceiling on one or more floors" },
  { value: "partial", label: "Partial: some floors yes, some need cabling" },
  { value: "decline", label: "Decline the remedial work. The honest answer is no." },
  { value: "refer", label: "Refer on for cabling" },
];

const tick = (key: string, label: string): Field => ({ key, label, kind: "tick" });
const text = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, kind: "text", ...extra });
const num = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, kind: "number", ...extra });
const long = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, kind: "long", wide: true, ...extra });

export const SECTIONS: Section[] = [
  {
    id: "booking",
    title: "Booking the visit",
    groups: [
      {
        heading: "Confirm these before the day",
        fields: [
          tick("paid", "Payment taken. If the Stripe link is unpaid, the visit does not happen"),
          tick("adult", "Someone over eighteen in the house for the whole two hour slot, not nipping out"),
          tick("access", "Access to every floor, including bedrooms"),
          tick("wifi", "Their Wi-Fi password, or that they will hand it over on the day"),
          tick("worst", "Which floor or room is worst, in their words"),
          tick("provider", "Broadband provider and rough package speed"),
          tick("trial", "They understand a system is being left in the house for three days and then removed"),
          tick("review", "Who needs to be on the review call on day three. If it is a couple, both"),
        ],
      },
      {
        fields: [
          text("bookedFor", "Booked for"),
          text("whoInHouse", "Who will be in the house"),
          text("reviewCall", "Review call: date, time, who attends"),
          text("secondVisit", "Second visit provisionally booked for"),
        ],
      },
    ],
  },
  {
    id: "customer",
    title: "The customer and the complaint",
    doThis: [
      "Ask before touching anything: what goes wrong, in which room, at what time of day",
      "Write their exact words, not a tidied version",
      "List every named device and where it actually sits",
      "Look around: where the router lives, wall construction, floor count, whether there is a second consumer unit",
      "Say up front that no cables will be chased into walls and no floors lifted",
    ],
    groups: [
      {
        fields: [
          text("propertyType", "Property type", { placeholder: "Victorian end-of-terrace" }),
          text("floors", "Floors, and which floor the router is on"),
          text("walls", "Wall construction"),
        ],
      },
      {
        fields: [
          long("complaint", "The complaint, in their words", {
            hint: "Write what they say, not a tidied version. This is what the report has to answer at the end.",
          }),
        ],
      },
      {
        heading: "Named problem devices",
        table: {
          key: "devices",
          label: "Named problem devices",
          addLabel: "Add a device",
          maxRows: 20,
          columns: [
            { key: "device", label: "Device", kind: "text" },
            { key: "room", label: "Room", kind: "text" },
            { key: "symptom", label: "Symptom", kind: "text" },
            { key: "only24", label: "2.4GHz only?", kind: "tick" },
          ],
        },
      },
      {
        heading: "Background",
        fields: [
          text("provider", "Broadband provider", { placeholder: "Virgin Media" }),
          num("packageMbps", "Package speed, Mbps", { placeholder: "500" }),
          text("changed", "What changed recently"),
          text("tried", "What they have already tried"),
          text("whoWhen", "Who is in the house, and when"),
          text("worstTime", "Worst time of day"),
          tick("eveningTrouble", "They said the trouble is worst in the evening"),
        ],
      },
    ],
  },
  {
    id: "line",
    title: "Step 1: the line at the router",
    doThis: [
      "Plug the Mac into the router with the USB-C adapter. Never do this test over Wi-Fi",
      "Note the gateway, to compare later with the Pi's reading: route -n get default | grep gateway",
      "Ask the household to stay off the internet for two minutes",
      "Run the Waveform test, screenshot the result page, save the URL",
      "Record loss, average and standard deviation: ping -c 100 1.1.1.1",
      "Decide the verdict before moving on: is the line itself at fault?",
    ],
    groups: [
      {
        fields: [
          text("router", "Router make and model"),
          text("where", "Where it is: press, hall, behind TV"),
          text("extension", "On an extension lead? What else is on it"),
          text("spareLan", "Spare LAN ports"),
          text("gateway", "Gateway address", { placeholder: "192.168.1.1" }),
          text("secondRouter", "Second router or mesh present?"),
          text("doubleNat", "Double NAT? Gateway versus the Pi's eth0", {
            hint: "The pre-departure check compares the two Pis' gateways for you.",
          }),
        ],
      },
      {
        heading: "Waveform bufferbloat test",
        fields: [
          text("url", "Result URL", { wide: true, placeholder: "https://www.waveform.com/tools/bufferbloat?test-id=..." }),
          text("grade", "Grade", { placeholder: "A" }),
          num("down", "Download Mbps"),
          num("up", "Upload Mbps"),
          num("idleMs", "Idle latency ms"),
          num("loadDownMs", "Latency under download load ms"),
          num("loadUpMs", "Latency under upload load ms"),
        ],
      },
      {
        heading: "Packet loss: ping -c 100 1.1.1.1",
        note: "Anything above zero loss on a wired test points upstream, at the provider or the router, and belongs in the report as a finding. A high standard deviation with a low average means a jittery line, which feels like intermittent trouble to the customer even when the average looks healthy.",
        fields: [
          num("loss", "Loss percentage"),
          text("minAvgMax", "Min, average, max ms"),
          num("jitter", "Standard deviation ms (jitter)"),
        ],
      },
      {
        heading: "Verdict on the line",
        fields: [{ key: "verdict", label: "Verdict on the line", kind: "choice", options: LINE_VERDICTS, wide: true }],
      },
    ],
  },
  {
    id: "sockets",
    title: "Step 2: the socket hunt",
    doThis: [
      "Source adapter into a wall socket beside the router, never an extension lead",
      "If the router is on a four-way, take the wall socket and put the four-way through the adapter passthrough",
      "Carry the far adapter, the node Pi, a patch lead and the power bank to each floor",
      "Try three or four sockets per floor. At each one, add a row and press Measure",
      "Keep the Pi powered and move only the adapter, so you are not shutting it down at every socket",
      "Mark the winning socket with tape and photograph it",
    ],
    groups: [
      {
        note: "\"down\" is the streaming direction and matches most complaints. \"up\" is the outbound direction, for cameras and video calls. Verdict bands: above line speed with headroom is good. 100 to line speed is usable with a stated ceiling. Below 100 is marginal, try more sockets. A factor of two between directions is a finding, not variance.",
        table: {
          key: "rows",
          label: "Sockets",
          addLabel: "Add a socket",
          maxRows: 40,
          columns: [
            { key: "floor", label: "Floor", kind: "text", placeholder: "First floor" },
            { key: "socket", label: "Socket: room and position", kind: "text" },
            { key: "down", label: "down", kind: "number" },
            { key: "up", label: "up", kind: "number" },
            { key: "notes", label: "Notes", kind: "text" },
            { key: "chosen", label: "Winning socket", kind: "tick" },
          ],
        },
      },
      {
        heading: "If a floor fails",
        fields: [
          text("tried", "Sockets tried"),
          text("secondUnit", "Second consumer unit?"),
          text("noisy", "Noisy loads found and moved"),
          text("conclusion", "Conclusion"),
        ],
      },
    ],
  },
  {
    id: "rooms",
    title: "Step 3: the room by room survey",
    doThis: [
      "Walk every room with the phone and a Wi-Fi analyser",
      "Stand where each problem device actually sits, not in the middle of the room",
      "Note the channel and how many neighbouring networks are on it",
      "Check 2.4GHz separately: that is where thermostats, doorbells and most cameras live",
    ],
    groups: [
      {
        table: {
          key: "rows",
          label: "Rooms",
          addLabel: "Add a room",
          maxRows: 40,
          columns: [
            { key: "floor", label: "Floor", kind: "text", placeholder: "Ground floor" },
            { key: "room", label: "Room", kind: "text" },
            { key: "signal", label: "Signal", kind: "text" },
            { key: "band", label: "Band", kind: "text" },
            { key: "attached", label: "Attached to", kind: "text" },
            { key: "channel", label: "Channel", kind: "text" },
            { key: "neighbours", label: "Neighbours", kind: "text" },
            { key: "speed", label: "Speed, Mbps", kind: "number" },
          ],
        },
      },
      {
        heading: "At the problem devices",
        note: "Stand where the device is. A good reading on the landing is not evidence about a thermostat in a hall cupboard.",
        table: {
          key: "atDevices",
          label: "At the problem devices",
          addLabel: "Add a device",
          maxRows: 20,
          columns: [
            { key: "device", label: "Device", kind: "text" },
            { key: "signal", label: "Signal where it sits", kind: "text" },
            { key: "band", label: "Band", kind: "text" },
            { key: "notes", label: "Notes", kind: "text" },
          ],
        },
      },
      {
        heading: "The 2.4GHz picture",
        fields: [
          text("channels", "Channels in use nearby"),
          text("crowded", "How crowded, roughly"),
          text("clear5", "5GHz clear by comparison?"),
        ],
      },
      {
        heading: "Observations worth noting",
        fields: [
          tick("strongButSlow", "Strong signal but poor speed somewhere: congestion or weak backhaul"),
          tick("farAp", "A device attached to a far access point with a nearer one available"),
          tick("extender", "Existing extender on the problem floor"),
          tick("routerInPress", "Router in a press, strong in one room only"),
          tick("sshDrops", "Connection to the Pi dropping while working: note where and when"),
        ],
      },
    ],
  },
  {
    id: "trial",
    title: "Step 4: the trial install",
    doThis: [
      "Clean baseline BEFORE the Deco goes on the path: Measure the baseline below",
      "Deco 1 at the router, Deco 2 at the winning socket",
      "Give the trial its own SSID and leave the customer's Wi-Fi switched on",
      "Confirm in the Deco app that the far unit shows as wired, not wireless",
      "Move the named devices across, set a DHCP reservation for each, note the IPs below",
      "Start the trial: the Pi files the previous log away, starts a fresh one and watches the devices",
      "Fix anything red in the check before you walk out",
      "Book the review call for day three",
    ],
    groups: [
      {
        heading: "The clean baseline, before the Deco goes on the path",
        fields: [
          text("trialFloor", "Floor the trial system is on", { placeholder: "Second floor" }),
          text("floorWhy", "Floor chosen, and why", { wide: true }),
          text("socket", "Winning socket", { placeholder: "Back bedroom, beside the window" }),
          num("baselineDown", "Baseline down, Mbps", { hint: "Filled by Measure the baseline, or type it." }),
          num("baselineUp", "Baseline up, Mbps"),
          text("timeTaken", "Time taken"),
        ],
      },
      {
        heading: "The install",
        fields: [
          text("deco1", "Deco 1 position, at the router"),
          text("deco2", "Deco 2 position, far node"),
          text("ssid", "Trial SSID used", { placeholder: "SmartSpace Trial" }),
          tick("wired", "Confirmed in the app as a wired node"),
          tick("ownWifi", "Customer's own Wi-Fi left on"),
          text("piPower", "Pi powered from socket or bank"),
        ],
      },
      {
        heading: "Said to the customer before leaving",
        fields: [
          tick("saidDemo", "This is a demonstration and leaves on collection day unless you want it"),
          tick("saidSwitch", "Your own Wi-Fi is still on. Switch between the two and judge it yourself"),
          tick("saidUnplug", "Please do not unplug the small box or the adapter in the marked socket"),
          tick("saidDrops", "When the kit leaves, the house drops back to how it was and will feel worse"),
          tick("saidCollection", "Collection day and time confirmed"),
          tick("saidCables", "No cables chased into walls, no floors lifted"),
          tick("saidWalked", "Walked the floor with them on the trial network"),
        ],
      },
      {
        heading: "Move the named devices onto the trial network",
        note: "Only the devices in the complaint. Everything else stays on the customer's own Wi-Fi, which is what preserves the comparison. Set a DHCP reservation for each in the Deco app first, so the address cannot change part way through the three days. Expect Nest thermostats and battery sensors not to answer a ping; leave their IP empty and rely on the Deco log at collection.",
        table: {
          key: "devices",
          label: "Devices on the trial network",
          addLabel: "Add a device",
          maxRows: 12,
          columns: [
            { key: "device", label: "Device", kind: "text" },
            { key: "was", label: "Was attached to", kind: "text" },
            { key: "now", label: "Now attached to", kind: "text" },
            { key: "ip", label: "IP address", kind: "text", placeholder: "192.168.68.54" },
          ],
        },
      },
      {
        heading: "For the report",
        fields: [
          text("compareRoom", "Room the report compares with", {
            hint: "A room from the survey, usually the one they complained about.",
          }),
          num("roomOnTrial", "That room's speed on the trial network, Mbps", {
            hint: "Measured with the phone after the install, the same way as the survey. Leave empty if not measured.",
          }),
        ],
      },
      {
        heading: "Before you walk out",
        fields: [
          tick("decoShot", "Deco app device list screenshotted, showing which node each device joined"),
          tick("customerTold", "Customer told these devices are on the trial network and will be moved back"),
          tick("reviewBooked", "Review call booked for day three"),
        ],
      },
    ],
  },
  {
    id: "photos",
    title: "Photos",
    doThis: [
      "Take them as you go, not as an afterthought at the door",
      "Photograph anything unusual even if you are not sure it matters yet",
    ],
    groups: [
      {
        note: "Six photos, two minutes, and the report looks like a survey rather than an invoice.",
        fields: [
          tick("router", "The router in situ, showing where it actually lives"),
          tick("sockets", "Each winning socket with its tape label"),
          tick("consumerUnit", "The consumer unit, and a second one if there is one"),
          tick("adapter", "The adapter in place with its lights"),
          tick("decoWired", "The Deco app screen showing the far node as wired"),
          tick("devices", "Each problem device in position"),
          tick("unusual", "Anything unusual: foil insulation, a chimney breast, a garden room feed"),
        ],
      },
    ],
  },
  {
    id: "collection",
    title: "Collection visit",
    doThis: [
      "Collect the logs BEFORE unplugging anything",
      "Export the Deco log from 192.168.68.1 while still on the trial network",
      "Ask what they noticed and write down their actual words",
      "Move the devices back, then shut each Pi down properly before pulling power: sudo shutdown -h now. Confirm their own Wi-Fi works before leaving",
      "Remove their Wi-Fi network from the Mac",
    ],
    groups: [
      {
        fields: [
          num("finalDown", "Final down, Mbps", { hint: "Filled by Measure now, or type it." }),
          num("finalUp", "Final up, Mbps"),
          text("gapsNote", "Any gaps, and at what hours", { wide: true, hint: "The logs below list every hour without a reading." }),
        ],
      },
      {
        heading: "Export the Deco log before unplugging anything",
        note: "On a device connected to the trial network, go to 192.168.68.1, log in with the TP-Link account password (not the Wi-Fi password), then Advanced, System, System Log. Set Log Type to ALL and choose Save to Local. Put the file in the customer's Data folder.",
        fields: [
          tick("decoLog", "Deco system log exported and filed"),
          tick("decoListAgain", "Deco app device list screenshotted again, for the after picture"),
          tick("movedBack", "Devices moved back onto the customer's own Wi-Fi"),
        ],
      },
      {
        fields: [
          text("before", "What the customer said was happening before", { wide: true, placeholder: "two or three times a week" }),
          long("noticed", "What the customer noticed. Their actual words", {
            hint: "This is the quote for the report and, with permission, the website.",
          }),
          tick("websiteOk", "They are happy for it to be used on the website"),
        ],
      },
      {
        heading: "Pack down",
        fields: [
          tick("decosOut", "Decos out"),
          tick("piDown", "Pi shut down properly, then unplugged"),
          tick("adaptersOut", "Adapters out, sockets noted before the tape comes off"),
          tick("ownWifiWorks", "Their original Wi-Fi confirmed working before leaving"),
          tick("wifiRemoved", "Their Wi-Fi network removed from the Mac"),
          tick("reportDate", "Report date promised, and written in the diary"),
        ],
      },
    ],
  },
  {
    id: "conclusions",
    title: "Conclusions and the quote",
    doThis: [
      "Decide the verdict first, then pick the figures that support it",
      "State clearly which figures are three-day measurements and which are single readings",
      "Write what you will not do, and why. Never leave this blank",
      "Price per floor, with the 395 shown as credited in full",
    ],
    groups: [
      {
        fields: [
          text("lineAtFault", "Is the line at fault?"),
          text("kind", "Coverage, backhaul, or device level congestion?"),
          text("floorsServed", "Which floors can be served over the mains, and at what ceiling", { wide: true }),
          text("floorsNot", "Which floors cannot"),
          text("eveningSag", "Evening sag seen in the three day log?", { hint: "The logs panel works this out once the logs are in." }),
        ],
      },
      {
        heading: "Recommendation",
        fields: [{ key: "recommendation", label: "Recommendation", kind: "choice", options: RECOMMENDATIONS, wide: true }],
      },
      {
        heading: "What would be installed",
        table: {
          key: "plan",
          label: "What would be installed",
          addLabel: "Add a floor",
          maxRows: 8,
          columns: [
            { key: "floor", label: "Floor", kind: "text" },
            { key: "hardware", label: "Hardware", kind: "text", placeholder: "tri-band access point, fed by an interfloor portal" },
            { key: "position", label: "Position", kind: "text" },
            { key: "expect", label: "Expected throughput", kind: "text", placeholder: "200 Mbps" },
          ],
        },
      },
      {
        heading: "The quote",
        note: "Your pricing rule: hardware cost ex VAT times 3.7 is the price including VAT, rounded to the nearest five. The hardware cost stays in the CRM; only the lines in the report reach the customer.",
        fields: [
          num("hardwareExVat", "Hardware cost ex VAT, €"),
          num("labour", "Labour and visits, €"),
          num("priceIncVat", "Quoted price incl VAT, €"),
          text("monitoring", "Monitoring offered, and tier", { hint: "Left out of the report while the price is not settled." }),
          { key: "reportSentOn", label: "Report sent on", kind: "date" },
        ],
      },
    ],
  },
  {
    id: "report",
    title: "The report",
    groups: [
      {
        note: "The report is drawn from the figures above. These are the parts only you can write.",
        fields: [
          long("verdict", "What we found, in plain words", {
            hint: "The first thing they read. One or two sentences.",
            placeholder: "Your broadband line is healthy. The problem is that one router, in a hall cupboard, cannot reach the top two floors through solid brick.",
          }),
          long("verdictAfter", "What the trial showed", { hint: "Leave empty to use the sentence drafted from the logs." }),
          long("wont", "What we are not recommending, and why", { hint: "Never empty." }),
          text("property", "Property, as it appears on the report", { wide: true, hint: "Leave empty to use the property type above." }),
          { key: "reportDate", label: "Report date", kind: "date" },
        ],
      },
      {
        heading: "What it costs, as the customer sees it",
        note: "Amounts include VAT. The €395 assessment fee is shown credited in full.",
        table: {
          key: "lines",
          label: "Quote lines",
          addLabel: "Add a line",
          maxRows: 10,
          columns: [
            { key: "item", label: "Item", kind: "text", placeholder: "Equipment, installation, configuration and testing" },
            { key: "amount", label: "Amount incl VAT, €", kind: "number" },
          ],
        },
      },
    ],
  },
];

export type Row = Record<string, string | number | boolean | null> & { id: string };
export type SectionValues = Record<string, string | number | boolean | null | Row[]>;
export type Capture = Record<string, SectionValues>;

export function sectionById(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}

const MAX_TEXT = 300;
const MAX_LONG = 4000;
const ROW_ID = /^[a-z0-9]{6,16}$/;

/** "212", "212.5", "212,5" and " 212 Mbps" are all 212(.5). Empty is null. */
export function parseNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw ?? "").trim().replace(",", ".").replace(/[^\d.\-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cleanText(raw: unknown, max: number): string {
  /* No control characters: these values reach the Pi (device names) and the
     report, and a newline or a pipe in a device name would break the log line
     devicewatch.sh writes. Pipes are handled where it matters; here, length
     and control characters. */
  return String(raw ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").slice(0, max).trim();
}

function cleanRows(raw: unknown, spec: TableSpec): Row[] {
  let list: unknown;
  try { list = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return []; }
  if (!Array.isArray(list)) return [];
  const out: Row[] = [];
  for (const item of list.slice(0, spec.maxRows)) {
    if (!item || typeof item !== "object") continue;
    const src = item as Record<string, unknown>;
    const id = typeof src.id === "string" && ROW_ID.test(src.id) ? src.id : Math.random().toString(36).slice(2, 10);
    const row: Row = { id };
    let any = false;
    for (const c of spec.columns) {
      const v = src[c.key];
      if (c.kind === "tick") row[c.key] = v === true || v === "true" || v === "on";
      else if (c.kind === "number") { row[c.key] = parseNumber(v); if (row[c.key] != null) any = true; }
      else { row[c.key] = cleanText(v, MAX_TEXT); if (row[c.key]) any = true; }
    }
    if (any) out.push(row);
  }
  return out;
}

/**
 * One section's form, as the values to store. Every field in the section is
 * read, so an unticked box is saved as false rather than left as it was.
 */
export function readSection(sectionId: string, form: FormData): SectionValues | null {
  const section = sectionById(sectionId);
  if (!section) return null;
  const values: SectionValues = {};
  for (const g of section.groups) {
    if ("table" in g) {
      values[g.table.key] = cleanRows(form.get(`table:${g.table.key}`), g.table);
      continue;
    }
    for (const f of g.fields) {
      const raw = form.get(f.key);
      switch (f.kind) {
        case "tick": values[f.key] = raw === "on" || raw === "true"; break;
        case "number": values[f.key] = parseNumber(raw); break;
        case "long": values[f.key] = cleanText(raw, MAX_LONG); break;
        case "choice": {
          const v = String(raw ?? "");
          values[f.key] = f.options?.some((o) => o.value === v) ? v : "";
          break;
        }
        case "date": values[f.key] = /^\d{4}-\d{2}-\d{2}$/.test(String(raw ?? "")) ? String(raw) : ""; break;
        case "datetime": values[f.key] = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(raw ?? "")) ? String(raw) : ""; break;
        default: values[f.key] = cleanText(raw, MAX_TEXT);
      }
    }
  }
  return values;
}

/* ── Reading the capture without trusting its shape ─────────────── */

export function str(c: Capture, section: string, key: string): string {
  const v = c?.[section]?.[key];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

export function numberOf(c: Capture, section: string, key: string): number | null {
  const v = c?.[section]?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : parseNumber(typeof v === "string" ? v : null);
}

export function ticked(c: Capture, section: string, key: string): boolean {
  return c?.[section]?.[key] === true;
}

export function rows(c: Capture, section: string, key: string): Row[] {
  const v = c?.[section]?.[key];
  return Array.isArray(v) ? (v as Row[]) : [];
}

/** How many of a section's ticks are ticked, for the progress shown on each section. */
export function sectionProgress(c: Capture, section: Section): { filled: number; total: number } {
  let filled = 0, total = 0;
  for (const g of section.groups) {
    if ("table" in g) {
      total++;
      if (rows(c, section.id, g.table.key).length) filled++;
      continue;
    }
    for (const f of g.fields) {
      total++;
      const v = c?.[section.id]?.[f.key];
      if (f.kind === "tick" ? v === true : v != null && v !== "") filled++;
    }
  }
  return { filled, total };
}

/** Nigel's rule: hardware cost ex VAT x 3.7, rounded to the nearest five, is the price incl VAT. */
export function ruleOfThumbPrice(hardwareExVat: number | null): number | null {
  if (hardwareExVat == null || hardwareExVat <= 0) return null;
  return Math.round((hardwareExVat * 3.7) / 5) * 5;
}
