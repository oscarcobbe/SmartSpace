import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message, date, timeSlot } = body;

    if (!name || !email || !date || !timeSlot) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Log the booking (ready for email service integration)
    console.log("📅 New consultation booking:", {
      name,
      email,
      phone,
      subject,
      message,
      date,
      timeSlot,
      bookedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to process booking" },
      { status: 500 }
    );
  }
}
