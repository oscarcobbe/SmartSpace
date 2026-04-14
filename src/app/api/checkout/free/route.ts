import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createBookingEvent } from "@/lib/calendly";
import { logLead } from "@/lib/leads";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  bookingDate?: string;
  bookingSlot?: string;
  bookingLabel?: string;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface FreeCheckoutBody {
  items: CartItem[];
  customer?: CustomerDetails;
  gclid?: string;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const { items, customer }: FreeCheckoutBody = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Find the item with booking info
    const bookedItem = items.find((i) => i.bookingDate && i.bookingSlot);

    if (bookedItem?.bookingDate && bookedItem?.bookingSlot) {
      const customerName = customer?.name || "Free Consultation";
      const customerEmail = customer?.email || "nigel@smart-space.ie";
      const customerPhone = customer?.phone;
      const customerAddress = customer?.address;

      // Create Calendly booking for consultation with real customer details
      const result = await createBookingEvent({
        date: bookedItem.bookingDate,
        timeSlot: bookedItem.bookingSlot,
        customerName,
        email: customerEmail,
        phone: customerPhone,
        productTitle: bookedItem.name,
        orderId: `free-${Date.now()}`,
        kind: "consultation",
        address: customerAddress,
      });

      if (result) {
        console.log("[free-checkout] Calendly booking created:", result.eventId);
      } else {
        console.error("[free-checkout] Calendly booking failed");
        return NextResponse.json(
          { error: "Failed to book your consultation. Please try again or contact us." },
          { status: 500 }
        );
      }

      // Send notification email to Nigel with customer details
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM_EMAIL;
      if (apiKey && from) {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from,
          to: ["nigel@smart-space.ie"],
          replyTo: customerEmail,
          subject: `New Free Consultation Booking — ${customerName}`,
          text: [
            `New free consultation booked on smart-space.ie`,
            "",
            `Name: ${customerName}`,
            `Email: ${customerEmail}`,
            `Phone: ${customerPhone || "—"}`,
            `Address: ${customerAddress || "—"}`,
            `Date: ${bookedItem.bookingLabel || bookedItem.bookingDate}`,
            `Time Slot: ${bookedItem.bookingSlot}`,
          ].join("\n"),
          html: `
            <h2>New Free Consultation Booking</h2>
            <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(customerPhone || "—")}</p>
            <p><strong>Address:</strong> ${escapeHtml(customerAddress || "—")}</p>
            <hr />
            <p><strong>Date:</strong> ${escapeHtml(bookedItem.bookingLabel || bookedItem.bookingDate || "")}</p>
            <p><strong>Time Slot:</strong> ${escapeHtml(bookedItem.bookingSlot || "")}</p>
          `,
        });
      }
    }

    // Log to tracking sheet
    logLead({
      type: "Free Consultation",
      name: customer?.name,
      email: customer?.email,
      phone: customer?.phone,
      address: customer?.address,
      product: bookedItem?.name || "Free Home Consultation",
      amount: 0,
      currency: "EUR",
      bookingDate: bookedItem?.bookingLabel || bookedItem?.bookingDate,
      bookingSlot: bookedItem?.bookingSlot,
      source: "smart-space.ie",
    });

    // Conversion tracking is handled client-side via gtag on the success page
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Free checkout error:", message);
    return NextResponse.json({ error: `Booking failed: ${message}` }, { status: 500 });
  }
}
