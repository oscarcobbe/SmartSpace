import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createBookingEvent, TIME_SLOTS } from "@/lib/calendly";
import { logLead, type AttributionRecord } from "@/lib/leads";

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Enquiry",
  installation: "Installation Enquiry",
  product: "Product Question",
  support: "Support Request",
  other: "Other",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateLong(iso: string): string {
  // iso is YYYY-MM-DD; render Dublin-local long form
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

interface BookingBody {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  date?: string;
  timeSlot?: string;
  attribution?: AttributionRecord;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookingBody;
    const { name, email, phone, subject, message, date, timeSlot, attribution } = body;

    if (!name?.trim() || !email?.trim() || !date || !timeSlot) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, date, timeSlot" },
        { status: 400 }
      );
    }

    const subjectKey = typeof subject === "string" ? subject : "";
    const subjectLabel = SUBJECT_LABELS[subjectKey] ?? (subjectKey || "Site Visit");
    const slot = TIME_SLOTS.find((s) => s.value === timeSlot);
    const slotLabel = slot?.label ?? timeSlot;
    const dateLabel = formatDateLong(date);

    // 1. Create Calendly event (auto-syncs to Google Calendar via Calendly's
    //    integration, sends ICS invite to the customer). This is the only
    //    blocking step — if it fails we abort so the user sees an error
    //    instead of a fake confirmation.
    const productTitle = `Site Visit — ${subjectLabel}`;
    const calendly = await createBookingEvent({
      date,
      timeSlot,
      customerName: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      productTitle,
      orderId: `booking-${Date.now()}`,
      kind: "consultation",
    });

    if (!calendly) {
      console.error(
        `[booking] Calendly booking failed for ${email} on ${date} ${timeSlot}`
      );
      return NextResponse.json(
        {
          error:
            "We couldn't lock in that time slot. Please try a different time or contact us directly.",
        },
        { status: 500 }
      );
    }

    // 2. Notify Nigel via Resend (non-blocking; failure logs but doesn't
    //    break the user flow since the Calendly booking already succeeded).
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const to = process.env.CONTACT_TO_EMAIL ?? "nigel@smart-space.ie";

    if (apiKey && from) {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from,
          to: [to],
          replyTo: email.trim(),
          subject: `New Site Visit Booking — ${name.trim()} — ${dateLabel}`,
          text: [
            `New booking via smart-space.ie`,
            "",
            `Name: ${name.trim()}`,
            `Email: ${email.trim()}`,
            `Phone: ${phone?.trim() || "—"}`,
            `Topic: ${subjectLabel}`,
            "",
            `Date: ${dateLabel}`,
            `Time: ${slotLabel}`,
            "",
            message?.trim() ? `Notes from customer:\n${message.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          html: `
            <h2>New Site Visit Booking</h2>
            <p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>
            <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone?.trim() || "—")}</p>
            <p><strong>Topic:</strong> ${escapeHtml(subjectLabel)}</p>
            <hr />
            <p><strong>Date:</strong> ${escapeHtml(dateLabel)}</p>
            <p><strong>Time:</strong> ${escapeHtml(slotLabel)}</p>
            ${
              message?.trim()
                ? `<hr /><p><strong>Notes from customer:</strong></p><pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(message.trim())}</pre>`
                : ""
            }
          `,
        });
      } catch (err) {
        console.error("[booking] Resend email failed:", err);
      }
    } else {
      console.warn(
        "[booking] RESEND_API_KEY or RESEND_FROM_EMAIL missing — skipping notification email"
      );
    }

    // 3. Log to Google Sheet (fire-and-forget)
    logLead({
      type: "Free Consultation",
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      product: productTitle,
      amount: 0,
      currency: "EUR",
      bookingDate: dateLabel,
      bookingSlot: slotLabel,
      attribution,
      notes: message?.trim() ? `${subjectLabel}: ${message.trim()}` : subjectLabel,
      source: "smart-space.ie/booking",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[booking] Failed to process booking:", err);
    return NextResponse.json(
      { error: "Failed to process booking" },
      { status: 500 }
    );
  }
}
