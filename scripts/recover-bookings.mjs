#!/usr/bin/env node
/**
 * One-off recovery script.
 *
 * Step 1 (default): DIAGNOSE — list paid Stripe orders + current Calendly
 * events, show which orders are missing a Calendly booking. Side-effect free.
 *
 * Step 2 (with --book flag): BOOK — for each missing Stripe order with a
 * booking_date+booking_slot, create the Calendly event and send Nigel an email.
 *
 * Reads creds from .env.local. Run from project root:
 *   node scripts/recover-bookings.mjs           # diagnose only
 *   node scripts/recover-bookings.mjs --book    # actually create Calendly events
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── load .env.local ────────────────────────────────────────────────────
const env = {};
try {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch (err) {
  console.error("Failed to read .env.local:", err.message);
  process.exit(1);
}

const STRIPE_KEY = env.STRIPE_SECRET_KEY;
const CALENDLY_TOKEN = env.CALENDLY_PERSONAL_TOKEN;
const CALENDLY_INSTALLATION_URI =
  env.CALENDLY_INSTALLATION_EVENT_TYPE_URI || env.CALENDLY_EVENT_TYPE_URI;
const CALENDLY_CONSULTATION_URI = env.CALENDLY_CONSULTATION_EVENT_TYPE_URI;
const RESEND_KEY = env.RESEND_API_KEY;
const RESEND_FROM = env.RESEND_FROM_EMAIL;

if (!STRIPE_KEY || !CALENDLY_TOKEN || !CALENDLY_INSTALLATION_URI) {
  console.error("Missing one of: STRIPE_SECRET_KEY, CALENDLY_PERSONAL_TOKEN, CALENDLY_INSTALLATION_EVENT_TYPE_URI");
  process.exit(1);
}

const SHOULD_BOOK = process.argv.includes("--book");

// ─── helpers ────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  { value: "10:00-12:00", startHour: 10, startMin: 0 },
  { value: "12:30-14:30", startHour: 12, startMin: 30 },
  { value: "15:00-17:00", startHour: 15, startMin: 0 },
];

async function fetchPaidStripeOrders() {
  const r = await fetch(
    "https://api.stripe.com/v1/checkout/sessions?limit=100&status=complete&expand[]=data.custom_fields",
    { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
  );
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.data || [];
}

async function fetchCalendlyEvents() {
  // Look at events both past and future to be safe
  const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  // Get current user URI first
  const meRes = await fetch("https://api.calendly.com/users/me", {
    headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` },
  });
  if (!meRes.ok) throw new Error(`Calendly /users/me ${meRes.status}: ${await meRes.text()}`);
  const me = await meRes.json();
  const userUri = me.resource.uri;

  const r = await fetch(
    `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${past}&max_start_time=${future}&status=active&sort=start_time:asc&count=100`,
    { headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` } }
  );
  if (!r.ok) throw new Error(`Calendly events ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const events = data.collection || [];

  // Hydrate each event with its primary invitee email
  const hydrated = [];
  for (const ev of events) {
    let inviteeEmail = "";
    let inviteeName = "";
    try {
      const ir = await fetch(`${ev.uri}/invitees`, {
        headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` },
      });
      const id = await ir.json();
      const inv = (id.collection || [])[0];
      if (inv) {
        inviteeEmail = inv.email || "";
        inviteeName = inv.name || "";
      }
    } catch {}
    hydrated.push({
      uri: ev.uri,
      name: ev.name,
      startTime: ev.start_time,
      inviteeEmail: inviteeEmail.toLowerCase(),
      inviteeName,
    });
  }
  return hydrated;
}

async function getAvailableTimeForSlot(eventTypeUri, dateStr, slotValue) {
  const slot = TIME_SLOTS.find((s) => s.value === slotValue);
  if (!slot) return null;
  const r = await fetch(
    `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${dateStr}T00:00:00Z&end_time=${dateStr}T23:59:59Z`,
    { headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` } }
  );
  if (!r.ok) {
    console.error(`  available_times ${r.status}: ${await r.text()}`);
    return null;
  }
  const data = await r.json();
  for (const t of (data.collection || []).filter((t) => t.status === "available")) {
    const utc = new Date(t.start_time);
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Dublin",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(utc);
    const hour = parseInt(fmt.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(fmt.find((p) => p.type === "minute")?.value ?? "0", 10);
    if (hour === slot.startHour && minute === slot.startMin) return t.start_time;
  }
  return null;
}

async function createInvitee(eventTypeUri, params) {
  const startTime = await getAvailableTimeForSlot(eventTypeUri, params.date, params.timeSlot);
  if (!startTime) {
    return { ok: false, reason: `No available Calendly time matching ${params.timeSlot} on ${params.date}` };
  }

  const nameParts = (params.customerName || "Customer").trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || undefined;

  let formattedPhone;
  if (params.phone) {
    const digits = params.phone.replace(/[\s\-()]/g, "");
    formattedPhone = digits.startsWith("+")
      ? digits
      : digits.startsWith("0")
      ? "+353" + digits.slice(1)
      : "+353" + digits;
  }

  const r = await fetch("https://api.calendly.com/invitees", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CALENDLY_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_type: eventTypeUri,
      start_time: startTime,
      invitee: {
        email: params.email,
        first_name: firstName,
        last_name: lastName,
        timezone: "Europe/Dublin",
        text_reminder_number: formattedPhone,
      },
      location: { kind: "physical", location: "Customer's home" },
      questions_and_answers: [
        {
          question: "Please share anything that will help prepare for our meeting.",
          answer: [
            `Product: ${params.productTitle}`,
            params.orderId ? `Order: ${params.orderId}` : "",
            params.address ? `Address: ${params.address}` : "",
            params.phone ? `Phone: ${params.phone}` : "",
            "[Recovered booking — created retroactively after webhook gap]",
          ]
            .filter(Boolean)
            .join(" | "),
          position: 0,
        },
      ],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    return { ok: false, reason: `Calendly create_invitee ${r.status}: ${err}` };
  }
  const ev = await r.json();
  return { ok: true, eventUri: ev.resource?.uri || "created", startTime };
}

async function sendRecoveryEmail({ orders }) {
  if (!RESEND_KEY || !RESEND_FROM || orders.length === 0) return;
  const rows = orders
    .map(
      (o) =>
        `<tr><td>${o.name}</td><td>${o.email}</td><td>${o.product}</td><td>${o.bookingLabel || o.bookingDate}</td><td>${o.bookingSlot}</td><td>${o.calendlyResult}</td></tr>`
    )
    .join("");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: ["nigel@smart-space.ie"],
      subject: `Recovered ${orders.length} missed booking${orders.length === 1 ? "" : "s"}`,
      html: `
        <h2>Booking Recovery Report</h2>
        <p>The following paid Stripe orders were missing Calendly events. They have now been created retroactively.</p>
        <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:system-ui">
          <thead style="background:#f3f4f6">
            <tr><th>Customer</th><th>Email</th><th>Product</th><th>Date</th><th>Slot</th><th>Result</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#666;font-size:13px;margin-top:20px">
          Calendly will email each customer their event invite. Verify in your Calendly dashboard +
          Google Calendar.
        </p>
      `,
    }),
  });
  if (!r.ok) console.error(`Recovery email failed: ${r.status} ${await r.text()}`);
  else console.log("Recovery email sent.");
}

// ─── main ───────────────────────────────────────────────────────────────
const [stripeOrders, calendlyEvents] = await Promise.all([
  fetchPaidStripeOrders(),
  fetchCalendlyEvents(),
]);

console.log(`\n📦 Paid Stripe orders fetched: ${stripeOrders.length}`);
console.log(`📅 Calendly events fetched: ${calendlyEvents.length}\n`);

// Index Calendly events by invitee email (lowercased)
const calByEmail = new Map();
for (const ev of calendlyEvents) {
  if (ev.inviteeEmail) {
    const list = calByEmail.get(ev.inviteeEmail) || [];
    list.push(ev);
    calByEmail.set(ev.inviteeEmail, list);
  }
}

const missed = [];
for (const session of stripeOrders) {
  const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
  const name = session.customer_details?.name || email.split("@")[0];
  const phone = session.customer_details?.phone || "";
  const created = new Date(session.created * 1000).toISOString();
  const product = session.metadata?.product_name || "Order";
  const bookingDate = session.metadata?.booking_date || "";
  const bookingSlot = session.metadata?.booking_slot || "";
  const bookingLabel = session.metadata?.booking_label || "";
  const amount = (session.amount_total / 100).toFixed(2);
  const installAddr = session.custom_fields?.find((f) => f.key === "installation_address")?.text?.value;
  const billAddr = session.customer_details?.address;
  const billStr = billAddr
    ? [billAddr.line1, billAddr.line2, billAddr.city, billAddr.postal_code, billAddr.country].filter(Boolean).join(", ")
    : "";
  const address = installAddr || billStr;

  const hasCalendly = calByEmail.has(email);
  const status = hasCalendly ? "✅ has Calendly" : "❌ MISSING";
  console.log(
    `${status}  ${created.slice(0, 10)}  €${amount.padStart(7)}  ${(name || "").padEnd(20)}  ${(email || "").padEnd(32)}  ${product.slice(0, 30)}`
  );
  console.log(
    `             booking_date=${bookingDate || "(none)"}  booking_slot=${bookingSlot || "(none)"}`
  );

  if (!hasCalendly && bookingDate && bookingSlot) {
    const amountFloat = parseFloat(amount);
    const isTestOrder = amountFloat < 5 || /smart-space|smartspace|test/i.test(email);
    const slotEndHour = parseInt(bookingSlot.split("-")[1]?.split(":")[0] || "0", 10);
    const bookingEndDate = new Date(`${bookingDate}T${String(slotEndHour).padStart(2, "0")}:00:00`);
    const isPast = bookingEndDate.getTime() < Date.now();
    missed.push({
      sessionId: session.id,
      name,
      email,
      phone,
      product,
      bookingDate,
      bookingSlot,
      bookingLabel,
      amount,
      address,
      isTestOrder,
      isPast,
    });
  }
}

const futureRecoverable = missed.filter((m) => !m.isTestOrder && !m.isPast);
const pastUnrecoverable = missed.filter((m) => !m.isTestOrder && m.isPast);
const testOrders = missed.filter((m) => m.isTestOrder);

console.log(`\n🔧 Future bookings to recover:  ${futureRecoverable.length}`);
console.log(`⏰ Past bookings (need manual): ${pastUnrecoverable.length}`);
console.log(`🧪 Test orders (skipped):       ${testOrders.length}\n`);

if (!SHOULD_BOOK) {
  console.log("Diagnostic only. Re-run with --book to create Calendly events for the missed orders above.\n");
  process.exit(0);
}

if (futureRecoverable.length === 0 && pastUnrecoverable.length === 0) {
  console.log("Nothing real to recover. Exiting.");
  process.exit(0);
}

// Book each future missed order in Calendly under the INSTALLATION event type
const results = [];
for (const m of futureRecoverable) {
  console.log(`\nBooking: ${m.name} (${m.email}) — ${m.bookingDate} ${m.bookingSlot}`);
  const res = await createInvitee(CALENDLY_INSTALLATION_URI, {
    date: m.bookingDate,
    timeSlot: m.bookingSlot,
    customerName: m.name,
    email: m.email,
    phone: m.phone,
    productTitle: m.product,
    orderId: m.sessionId,
    address: m.address,
  });
  if (res.ok) {
    console.log(`  ✅ Created — ${res.eventUri}`);
    results.push({ ...m, calendlyResult: `Created at ${res.startTime}` });
  } else {
    console.error(`  ❌ Failed — ${res.reason}`);
    results.push({ ...m, calendlyResult: `FAILED: ${res.reason}` });
  }
}

// Combine results + past bookings into one email so Nigel sees the full picture
const allOrders = [
  ...results,
  ...pastUnrecoverable.map((m) => ({
    ...m,
    calendlyResult: `⚠️ PAST DATE — book manually + apologise to customer`,
  })),
];

if (allOrders.length > 0) await sendRecoveryEmail({ orders: allOrders });
console.log("\nDone.");
