import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { createBookingEvent, TIME_SLOTS, AVAILABLE_DAYS } from "@/lib/calendly";

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  eircode?: string;
  product?: string;
  date?: string; // YYYY-MM-DD
  attribution?: AttributionRecord;
}

const PRODUCT_LABELS: Record<string, string> = {
  "ring-doorbell": "Ring Doorbell",
  "ring-camera": "Ring Camera",
  eufy: "Eufy doorbell / camera",
  tapo: "Tapo doorbell / camera",
  nest: "Google Nest",
  other: "Other",
};

/**
 * Best-effort: figure out if the requested date is one of our install days
 * (Tue/Wed/Thu) and if so, attempt to book the first available time slot
 * on Calendly. Always returns gracefully — if Calendly is unavailable or
 * the date isn't workable, we just return false and the team handles it
 * manually.
 */
async function tryAutoCalendly(args: {
  date: string;
  name: string;
  email: string;
  phone: string;
  productLabel: string;
  eircode: string;
}): Promise<boolean> {
  try {
    // Validate date is a Tue/Wed/Thu in Dublin time
    const d = new Date(`${args.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    const dow = d.getUTCDay();
    if (!AVAILABLE_DAYS.includes(dow)) return false;

    // Try slots in order until one books
    for (const slot of TIME_SLOTS) {
      const result = await createBookingEvent({
        date: args.date,
        timeSlot: slot.value,
        customerName: args.name,
        email: args.email,
        phone: args.phone,
        address: args.eircode || undefined,
        productTitle: args.productLabel,
        kind: "installation",
      });
      if (result) {
        console.log(`[ring-installation] Calendly booked: slot=${slot.value} eventId=${result.eventId}`);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("[ring-installation] Calendly auto-book error:", err);
    return false;
  }
}

async function notifyOwner(args: {
  name: string;
  email: string;
  phone: string;
  eircode: string;
  productLabel: string;
  date: string;
  calendlyBooked: boolean;
  attribution?: AttributionRecord;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Smart Space <onboarding@resend.dev>";
  const to = process.env.CONTACT_TO_EMAIL || "info@smart-space.ie";
  if (!apiKey) {
    console.warn("[ring-installation] RESEND_API_KEY not set — skipping owner email");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const subject = args.calendlyBooked
      ? `[Ads LP] Booking auto-confirmed: ${args.name} — ${args.date}`
      : `[Ads LP] New booking — ${args.name} — call within 1h`;
    const lines = [
      `Source: /ring-installation (Google Ads landing page)`,
      `Calendly auto-booked: ${args.calendlyBooked ? "YES — slot confirmed" : "NO — please call to confirm date/slot"}`,
      ``,
      `Name:     ${args.name}`,
      `Phone:    ${args.phone}`,
      `Email:    ${args.email}`,
      `Eircode:  ${args.eircode || "(not provided)"}`,
      `Product:  ${args.productLabel}`,
      `Pref date: ${args.date}`,
      ``,
      `Attribution:`,
      `  gclid: ${args.attribution?.gclid || "(none)"}`,
      `  utm_source: ${args.attribution?.utmSource || "(none)"}`,
      `  utm_campaign: ${args.attribution?.utmCampaign || "(none)"}`,
      `  landing: ${args.attribution?.landingPage || "(none)"}`,
      `  referrer: ${args.attribution?.referrer || "(none)"}`,
    ].join("\n");
    await resend.emails.send({
      from,
      to,
      replyTo: args.email,
      subject,
      text: lines,
    });
  } catch (err) {
    console.error("[ring-installation] Resend error:", err);
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();
  const eircode = (body.eircode || "").trim();
  const productKey = (body.product || "").trim();
  const date = (body.date || "").trim();
  const productLabel = PRODUCT_LABELS[productKey] ?? productKey ?? "(unspecified)";

  if (!name || !phone || !email || !productKey || !date) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "Invalid date format" }, { status: 400 });
  }

  // 1) Always log the lead — fire-and-forget, must not block
  void logLead({
    type: "Free Consultation",
    name,
    email,
    phone,
    address: eircode || undefined,
    product: productLabel,
    bookingDate: date,
    source: "smart-space.ie/ring-installation",
    attribution: body.attribution,
    notes: "Ring-installation paid LP booking",
  });

  // 2) Best-effort auto-Calendly
  const calendlyBooked = await tryAutoCalendly({
    date,
    name,
    email,
    phone,
    productLabel,
    eircode,
  });

  // 3) Always email the owner (fire-and-forget)
  void notifyOwner({
    name,
    email,
    phone,
    eircode,
    productLabel,
    date,
    calendlyBooked,
    attribution: body.attribution,
  });

  return NextResponse.json({ ok: true, calendlyBooked });
}
