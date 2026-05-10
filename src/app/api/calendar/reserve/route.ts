import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/calendly";


// POST routes are inherently dynamic but explicit is better — without
// this, Next.js may try static optimization on a future major.
export const dynamic = "force-dynamic";

/**
 * NOTE: This endpoint does NOT actually hold a slot. It re-checks
 * Calendly availability and returns `available: true/false`. The
 * earlier `{reserved: true, expiresIn: 1200}` response shape was
 * misleading — the corresponding `DELETE` is a no-op. Real reservation
 * happens at checkout completion (Stripe → Calendly invitee create).
 *
 * The response keeps `reserved`/`expiresIn` keys for backward
 * compatibility with BookingCalendar.tsx, but the comment above
 * accurately describes the actual semantics: this is an availability
 * RE-CHECK, not a hold. A 1200s "reservation" runs purely on the
 * client as a UI countdown — two customers checking the same slot at
 * the same second both pass; whoever finishes Stripe checkout first
 * wins; the other gets a Calendly 409 which is alerted to Nigel via
 * the Stripe webhook's email + SMS.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, timeSlot, kind = "installation" } = body;

    if (!date || !timeSlot) {
      return NextResponse.json({ error: "Missing required fields: date, timeSlot" }, { status: 400 });
    }

    // Re-verify the slot is still available on Calendly (the user might
    // have selected this 30 minutes ago).
    const available = await getAvailableSlots(date, kind);
    const isAvailable = available.some((s) => s.value === timeSlot);

    if (!isAvailable) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose a different time.", reserved: false },
        { status: 409 }
      );
    }

    return NextResponse.json({
      reserved: true, // kept for client compat; actual semantics: "available right now"
      expiresIn: 1200, // UI countdown only
      message: "Slot is currently available. Complete checkout to confirm your booking.",
    });
  } catch (err) {
    console.error("Reservation error:", err);
    return NextResponse.json({ error: "Failed to check slot" }, { status: 500 });
  }
}

export async function DELETE() {
  // Intentional no-op (no Redis state to release).
  return NextResponse.json({ released: true });
}
