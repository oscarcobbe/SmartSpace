import { NextResponse } from "next/server";
import { createBookingEvent } from "@/lib/calendly";
import { uploadConversion, lookupGclidByEmail } from "@/lib/conversions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const order = body;

    const customerName =
      `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() ||
      "Customer";
    const email: string = order.customer?.email || order.email || "";
    const phone: string = order.customer?.phone || "";
    const orderId: string = order.name || order.id?.toString();
    const totalPrice: number = parseFloat(order.total_price || "0");
    const currency: string = order.currency || "EUR";

    // --- Conversion tracking ---
    // Try to get GCLID from cart attributes (set by CartDrawer before checkout)
    const noteAttributes: Array<{ name: string; value: string }> =
      order.note_attributes || [];
    let gclid: string =
      noteAttributes.find((a) => a.name === "gclid")?.value ?? "";

    // Fallback: look up by customer email in Zapier Tables
    if (!gclid && email) {
      gclid = (await lookupGclidByEmail(email)) ?? "";
    }

    if (gclid) {
      await uploadConversion({
        gclid,
        email,
        conversion_name: "Installer Purchase",
        conversion_value: totalPrice,
        conversion_time: new Date().toISOString(),
        transaction_id: orderId,
        currency,
      });
      console.log(
        `[shopify] conversion uploaded – order=${orderId} gclid=${gclid} value=${totalPrice}`
      );
    } else {
      console.log(
        `[shopify] no gclid found for order=${orderId} email=${email}`
      );
    }

    // --- Calendly booking ---
    for (const item of order.line_items || []) {
      const properties: Array<{ name: string; value: string }> =
        item.properties || [];
      const bookingDate = properties.find(
        (p) => p.name === "_booking_date"
      )?.value;
      const bookingSlot = properties.find(
        (p) => p.name === "_booking_slot"
      )?.value;

      if (bookingDate && bookingSlot) {
        console.log("📅 Payment confirmed — creating Calendly booking:", {
          orderId,
          customerName,
          email,
          product: item.title,
          date: bookingDate,
          slot: bookingSlot,
        });
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
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
