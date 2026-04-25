import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { createBookingEvent, TIME_SLOTS } from "@/lib/calendly";

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  eircode?: string;
  product?: string;
  date?: string;     // YYYY-MM-DD — guaranteed Tue/Wed/Thu by BookingCalendar
  timeSlot?: string; // one of "10:00-12:00" | "12:30-14:30" | "15:00-17:00"
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
 * Book the exact slot the user picked on the calendar. The slot is
 * already guaranteed-valid by BookingCalendar (which only shows
 * Tue/Wed/Thu × 3 fixed slots that Calendly says are available), so
 * this is a single Calendly call — no fallback iteration needed.
 */
async function bookSlot(args: {
  date: string;
  timeSlot: string;
  name: string;
  email: string;
  phone: string;
  productLabel: string;
  eircode: string;
}): Promise<boolean> {
  try {
    if (!TIME_SLOTS.some((s) => s.value === args.timeSlot)) {
      console.error(`[ring-installation] Unknown timeSlot: ${args.timeSlot}`);
      return false;
    }
    const result = await createBookingEvent({
      date: args.date,
      timeSlot: args.timeSlot,
      customerName: args.name,
      email: args.email,
      phone: args.phone,
      address: args.eircode || undefined,
      productTitle: args.productLabel,
      kind: "installation",
    });
    if (result) {
      console.log(`[ring-installation] Calendly booked: ${args.date} ${args.timeSlot} eventId=${result.eventId}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[ring-installation] Calendly booking error:", err);
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
  timeSlot: string;
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
      ? `[Ads LP] Booking auto-confirmed: ${args.name} — ${args.date} ${args.timeSlot}`
      : `[Ads LP] Booking received — ${args.name} — call within 1h`;
    const lines = [
      `Source: /ring-installation (Google Ads landing page)`,
      `Calendly auto-booked: ${args.calendlyBooked ? "YES — slot confirmed" : "NO — Calendly call failed; please call customer to rebook"}`,
      ``,
      `Name:     ${args.name}`,
      `Phone:    ${args.phone}`,
      `Email:    ${args.email}`,
      `Eircode:  ${args.eircode || "(not provided)"}`,
      `Product:  ${args.productLabel}`,
      `Date:     ${args.date}`,
      `Slot:     ${args.timeSlot}`,
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
  const timeSlot = (body.timeSlot || "").trim();
  const productLabel = PRODUCT_LABELS[productKey] ?? productKey ?? "(unspecified)";

  if (!name || !phone || !email || !productKey || !date || !timeSlot) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields (name, phone, email, product, date, timeSlot)" },
      { status: 400 }
    );
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
    bookingSlot: timeSlot,
    source: "smart-space.ie/ring-installation",
    attribution: body.attribution,
    notes: "Ring-installation paid LP booking",
  });

  // 2) Book the exact slot the user picked on Calendly
  const calendlyBooked = await bookSlot({
    date,
    timeSlot,
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
    timeSlot,
    calendlyBooked,
    attribution: body.attribution,
  });

  return NextResponse.json({ ok: true, calendlyBooked });
}
