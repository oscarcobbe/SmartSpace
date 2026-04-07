import { NextResponse } from "next/server";
import { reserveSlot, releaseSlot } from "@/lib/slotReservation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, timeSlot, cartId, customerEmail, productTitle } = body;

    if (!date || !timeSlot || !cartId) {
      return NextResponse.json({ error: "Missing required fields: date, timeSlot, cartId" }, { status: 400 });
    }

    const result = await reserveSlot(date, timeSlot, cartId, customerEmail, productTitle);

    if (!result.reserved) {
      return NextResponse.json(
        { error: "This time slot is already reserved by another customer. Please choose a different time.", reserved: false },
        { status: 409 }
      );
    }

    return NextResponse.json({
      reserved: true,
      expiresIn: result.expiresIn,
      message: `Slot reserved for ${Math.round(result.expiresIn / 60)} minutes. Complete checkout to confirm.`,
    });
  } catch (err) {
    console.error("Reservation error:", err);
    return NextResponse.json({ error: "Failed to reserve slot" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { date, timeSlot, cartId } = body;

    if (!date || !timeSlot || !cartId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await releaseSlot(date, timeSlot, cartId);
    return NextResponse.json({ released: true });
  } catch (err) {
    console.error("Release error:", err);
    return NextResponse.json({ error: "Failed to release slot" }, { status: 500 });
  }
}
