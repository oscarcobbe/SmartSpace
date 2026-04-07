import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/calendly";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, timeSlot } = body;

    if (!date || !timeSlot) {
      return NextResponse.json({ error: "Missing required fields: date, timeSlot" }, { status: 400 });
    }

    // Verify the slot is still available on Calendly
    const available = await getAvailableSlots(date);
    const isAvailable = available.some((s) => s.value === timeSlot);

    if (!isAvailable) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose a different time.", reserved: false },
        { status: 409 }
      );
    }

    return NextResponse.json({
      reserved: true,
      expiresIn: 1200,
      message: "Slot confirmed as available. Complete checkout to confirm your booking.",
    });
  } catch (err) {
    console.error("Reservation error:", err);
    return NextResponse.json({ error: "Failed to check slot" }, { status: 500 });
  }
}

export async function DELETE() {
  // No-op — Calendly manages availability, no Redis reservation to release
  return NextResponse.json({ released: true });
}
