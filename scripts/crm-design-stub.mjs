/**
 * Stands in for the two HTTP sources the CRM reads, so every screen can be
 * looked at with realistic content on it.
 *
 * Invented people and invented orders. Nothing here touches a real customer,
 * which matters because a design pass means screenshotting every screen and
 * real names do not need to be in that loop.
 */
import { createServer } from "node:http";

const NAMES = [
  ["Aoife Byrne", "aoife.byrne@gmail.com", "0871234501", "Rathgar", "Dublin", "D06 X291"],
  ["Declan O'Sullivan", "declan.osullivan@outlook.com", "0861234502", "Malahide", "Dublin", "K36 YV52"],
  ["Siobhán Kelly", "s.kelly@eircom.net", "0851234503", "Naas", "Kildare", "W91 C4P7"],
  ["Peter Lynch", "peterlynch1954@gmail.com", "0831234504", "Bray", "Wicklow", "A98 F2K3"],
  ["Máire Ní Dhomhnaill", "maire.nd@gmail.com", "0871234505", "Clontarf", "Dublin", "D03 R6T1"],
  ["Tom Gallagher", "tgallagher@yahoo.ie", "0891234506", "Drogheda", "Louth", "A92 W8H4"],
  ["Fiona Walsh", "fiona.walsh@gmail.com", "0861234507", "Stillorgan", "Dublin", "A94 P3D9"],
  ["Brendan Murphy", "b.murphy@hotmail.com", "0851234508", "Navan", "Meath", "C15 K7L2"],
  ["Niamh Doyle", "niamh.doyle@gmail.com", "0871234509", "Lucan", "Dublin", "K78 T5N6"],
  ["Gerry Fitzpatrick", "gerryfitz@gmail.com", "0831234510", "Wexford", "Wexford", "Y35 D2M8"],
  ["Orla Hennessy", "orla.hennessy@gmail.com", "0861234511", "Terenure", "Dublin", "D6W H4R2"],
  ["Michael Connolly", "mconnolly@eir.ie", "0871234512", "Swords", "Dublin", "K67 V9X3"],
];

const STATUSES = ["won", "installed", "booked", "quoted", "contacted", "new", "lost", "new", "won", "booked", "new", "quoted"];
const SOURCES = [
  ["stripe", "Ring doorbell, wired install"],
  ["contact_form", "Camera and doorbell, semi-detached"],
  ["booking", "Free consultation"],
  ["contact_form", "Chime wiring question"],
  ["stripe", "Two cameras, driveway"],
  ["quiz", "Eufy doorbell"],
];

const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
const uuidOf = (i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;

const contacts = NAMES.map((n, i) => ({
  id: uuidOf(i), site: "smart-space",
  name: n[0], first_name: n[0].split(" ")[0], last_name: n[0].split(" ").slice(1).join(" "),
  email: n[1], phone: n[2],
  address_line1: `${4 + i} ${["Grove", "Park", "Avenue", "Road", "Close"][i % 5]}`,
  address_line2: null, city: n[3], county: n[4], eircode: n[5],
  notes: i === 0 ? "Wants the chime left working. Side gate code 1984. Prefers mornings." : null,
  created_at: day(90 - i * 6), updated_at: day(30 - i * 2),
}));

const leads = contacts.map((c, i) => ({
  id: uuidOf(100 + i), site: "smart-space", contact_id: c.id,
  status: STATUSES[i], source: SOURCES[i % SOURCES.length][0], source_detail: SOURCES[i % SOURCES.length][1],
  message: i % 3 === 0 ? "Bought a Ring doorbell in Currys before Christmas and it is still in the box. No existing chime wiring that I can see." : null,
  value_cents: ["won", "installed"].includes(STATUSES[i]) ? [13900, 13900, 24900, 18900][i % 4] : null,
  currency: "eur",
  utm_source: i % 2 ? "google" : null, utm_medium: i % 2 ? "cpc" : null,
  utm_campaign: i % 2 ? "Installer April 2026" : null, utm_term: null, utm_content: null,
  gclid: i % 2 ? `Cj0KCQjw${i}` : null, referrer: null, tags: [], custom: {},
  stripe_session_id: SOURCES[i % SOURCES.length][0] === "stripe" ? `cs_live_${i}` : null,
  paid_at: ["won", "installed"].includes(STATUSES[i]) ? day(28 - i) : null,
  booked_for: ["booked", "installed"].includes(STATUSES[i]) ? day(-4 - i) : null,
  installed_at: STATUSES[i] === "installed" ? day(12) : null,
  created_at: day(60 - i * 4), updated_at: day(20 - i),
}));

const activity = [
  { kind: "lead_created", summary: "contact_form (Camera and doorbell, semi-detached)", actor: "website", n: 44 },
  { kind: "status", summary: "Moved to contacted", actor: "nigel@smart-space.ie", n: 41 },
  { kind: "note", summary: "Note updated", actor: "nigel@smart-space.ie", n: 40 },
  { kind: "status", summary: "Moved to quoted", actor: "nigel@smart-space.ie", n: 33 },
  { kind: "task", summary: "Task added: Ring back about the second camera", actor: "nigel@smart-space.ie", n: 33 },
  { kind: "status", summary: "Moved to booked", actor: "nigel@smart-space.ie", n: 21 },
  { kind: "lead_created", summary: "stripe (Ring doorbell, wired install)", actor: "website", n: 19 },
  { kind: "status", summary: "Moved to installed", actor: "nigel@smart-space.ie", n: 12 },
].map((a, i) => ({
  id: uuidOf(200 + i), site: "smart-space", lead_id: leads[0].id, contact_id: contacts[0].id,
  kind: a.kind, summary: a.summary, detail: {}, actor: a.actor, happened_at: day(a.n),
}));

const tasks = [
  { what: "Ring back about the second camera", due: -1 },
  { what: "Send the quote for the driveway pair", due: 0 },
  { what: "Confirm the ladder height for Thursday", due: 2 },
  { what: "Chase the Malahide install date", due: 5 },
].map((t, i) => ({
  id: uuidOf(300 + i), site: "smart-space", lead_id: leads[i].id, what: t.what,
  due_on: new Date(Date.now() + t.due * 86400000).toISOString().slice(0, 10),
  done_at: null, created_at: day(6),
}));

/* The admin leads feed, in the shape src/lib/crm/leads.ts expects. */
const adminLeads = {
  leads: contacts.flatMap((c, i) => {
    const l = leads[i];
    const paid = Boolean(l.value_cents);
    const rows = [];
    const d = new Date(l.created_at).toLocaleString("en-GB", { timeZone: "Europe/Dublin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    rows.push({
      date: d,
      type: paid ? "Paid Order" : i % 3 === 1 ? "Consultation" : "Contact Enquiry",
      name: c.name, email: c.email, phone: c.phone,
      address: [c.address_line1, c.city, c.county, c.eircode].join(", "),
      product: paid ? "Ring Video Doorbell, wired installation" : i % 3 === 1 ? "Free consultation" : "-",
      amount: paid ? `€${(l.value_cents / 100).toFixed(2)}` : "-",
      bookingDate: l.booked_for ? new Date(l.booked_for).toLocaleDateString("en-GB") : "-",
      bookingSlot: l.booked_for ? "09:00 - 11:00" : "-",
      status: l.booked_for && new Date(l.booked_for) > new Date() ? "Upcoming" : paid ? "Paid" : "New",
      upcoming: Boolean(l.booked_for && new Date(l.booked_for) > new Date()),
      orderId: l.stripe_session_id ?? "-",
      details: i % 3 === 0
        ? [{ question: "What did you buy?", answer: "Ring Video Doorbell Pro 2" },
           { question: "Is there an existing doorbell?", answer: "Yes, a wired one with a chime in the hall" },
           { question: "Anything we should know?", answer: "Side gate is locked, please ring the mobile on arrival" }]
        : undefined,
    });
    return rows;
  }),
  count: contacts.length,
  generated: new Date().toISOString(),
  stripeUpcomingPayout: "€1,247.30",
  sourceErrors: undefined,
};

const json = (res, body, code = 200) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = req.url ?? "";

  if (url.startsWith("/api/admin/leads")) return json(res, adminLeads);

  if (url.startsWith("/rest/v1/crm_contacts")) {
    if (req.method !== "GET") return json(res, [{ id: uuidOf(999) }], 201);
    const m = /id=eq\.([0-9a-f-]+)/.exec(url);
    if (m) return json(res, contacts.filter((c) => c.id === m[1]));
    const q = /or=\(name\.ilike\.\*([^*]*)\*/.exec(url);
    if (q && q[1]) {
      const needle = decodeURIComponent(q[1]).toLowerCase();
      return json(res, contacts.filter((c) =>
        [c.name, c.email, c.phone, c.eircode].some((v) => String(v).toLowerCase().includes(needle))));
    }
    return json(res, contacts);
  }
  if (url.startsWith("/rest/v1/crm_leads")) {
    if (req.method !== "GET") return json(res, [{ id: uuidOf(998) }], 201);
    const m = /contact_id=eq\.([0-9a-f-]+)/.exec(url);
    return json(res, m ? leads.filter((l) => l.contact_id === m[1]) : leads);
  }
  if (url.startsWith("/rest/v1/crm_activity")) {
    if (req.method !== "GET") return json(res, null, 204);
    const m = /contact_id=eq\.([0-9a-f-]+)/.exec(url);
    return json(res, m ? activity.filter((a) => a.contact_id === m[1]) : activity);
  }
  if (url.startsWith("/rest/v1/crm_tasks")) {
    if (req.method !== "GET") return json(res, null, 204);
    const m = /lead_id=in\.\(([^)]*)\)/.exec(url);
    if (m) { const ids = m[1].split(","); return json(res, tasks.filter((t) => ids.includes(t.lead_id))); }
    return json(res, tasks);
  }
  if (url.startsWith("/rest/v1/crm_users")) return json(res, [{ sites: ["smart-space", "smartcareliving"] }]);
  if (url.startsWith("/rest/v1/crm_sessions")) return json(res, [], req.method === "GET" ? 200 : 201);

  json(res, { error: "no stub for " + url }, 404);
}).listen(3999, () => console.log("design stub on 3999"));
