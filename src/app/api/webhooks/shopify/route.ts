import { NextResponse } from "next/server";
import { createBookingEvent } from "@/lib/calendly";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extract order details
    const order = body;
    const customerName = `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() || "Customer";
    const email = order.customer?.email || order.email || "";
    const phone = order.customer?.phone || "";
    const orderId = order.name || order.id?.toString();

    // Check line items for booking attributes
    for (const item of order.line_items || []) {
      const properties = item.properties || [];
      const bookingDate = properties.find((p: { name: string }) => p.name === "_booking_date")?.value;
      const bookingSlot = properties.find((p: { name: string }) => p.name === "_booking_slot")?.value;

      if (bookingDate && bookingSlot) {
        console.log("📅 Payment confirmed — creating Calendly booking:", {
          orderId,
          customerName,
          email,
          product: item.title,
          date: bookingDate,
          slot: bookingSlot,
        });

        // Create the booking in Calendly
        await createBookingEvent({
          date: bookingDate,
          timeSlot: bookingSlot,
          customerName,
          email,
          phone,
          productTitle: item.title,
          orderId,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
