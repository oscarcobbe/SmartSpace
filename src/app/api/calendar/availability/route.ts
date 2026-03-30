import { NextResponse } from "next/server";
import { getAvailableSlots, AVAILABLE_DAYS } from "@/lib/googleCalendar";
import { getReservedSlots } from "@/lib/slotReservation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  // const cartId = searchParams.get("cartId"); // Reserved for future per-cart filtering

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  // Check the date is a valid available day (Mon/Wed/Thu)
  const dateObj = new Date(date + "T12:00:00");
  if (!AVAILABLE_DAYS.includes(dateObj.getDay())) {
    return NextResponse.json({ slots: [] });
  }

  // Check date is in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    return NextResponse.json({ slots: [] });
  }

  // Get slots available from Google Calendar
  const calendarSlots = await getAvailableSlots(date);

  // Get slots reserved in Redis
  const reservedSlots = await getReservedSlots(date);

  // Filter out reserved slots (but allow if it's our own cart's reservation)
  const availableSlots = calendarSlots.filter((s) => {
    if (!reservedSlots.has(s.value)) return true;
    // If the caller provided a cartId, check if the reservation is theirs
    // (they should still see their own reserved slot as available)
    return false; // For now, hide all reserved slots from everyone
  });

  return NextResponse.json({
    date,
    slots: availableSlots.map((s) => ({ label: s.label, value: s.value })),
    reserved: Array.from(reservedSlots), // so the client knows which are reserved vs booked
  });
}
