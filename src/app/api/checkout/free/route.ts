import { NextResponse } from "next/server";
import { createBookingEvent } from "@/lib/calendly";
import { uploadConversion } from "@/lib/conversions";

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

interface FreeCheckoutBody {
  items: CartItem[];
  gclid?: string;
}

export async function POST(request: Request) {
  try {
    const { items, gclid }: FreeCheckoutBody = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Find the item with booking info
    const bookedItem = items.find((i) => i.bookingDate && i.bookingSlot);

    if (bookedItem?.bookingDate && bookedItem?.bookingSlot) {
      // Create Calendly booking
      const result = await createBookingEvent({
        date: bookedItem.bookingDate,
        timeSlot: bookedItem.bookingSlot,
        customerName: "Free Consultation",
        email: "consultation@smart-space.ie",
        productTitle: bookedItem.name,
        orderId: `free-${Date.now()}`,
      });

      if (result) {
        console.log("[free-checkout] Calendly booking created:", result.eventId);
      } else {
        console.error("[free-checkout] Calendly booking failed");
      }
    }

    // Upload conversion if GCLID present
    if (gclid) {
      await uploadConversion({
        gclid,
        conversion_name: "Installer Lead",
        conversion_value: 0,
        conversion_time: new Date().toISOString(),
        currency: "EUR",
      }).catch((err) => console.error("[free-checkout] conversion upload failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Free checkout error:", message);
    return NextResponse.json({ error: `Booking failed: ${message}` }, { status: 500 });
  }
}
