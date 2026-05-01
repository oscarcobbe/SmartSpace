import { NextResponse } from "next/server";
import { getAvailableSlots, AVAILABLE_DAYS } from "@/lib/calendly";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const kind = (searchParams.get("kind") ?? "installation") as "consultation" | "installation";

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  // Check the date is a valid available day (Mon-Fri)
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

  // Get available slots from Calendly
  const availableSlots = await getAvailableSlots(date, kind);

  return NextResponse.json(
    { date, slots: availableSlots.map((s) => ({ label: s.label, value: s.value })) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
