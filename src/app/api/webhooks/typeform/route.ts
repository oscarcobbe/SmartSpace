import { NextResponse } from "next/server";

// Typeform is used by SmartCareLiving, not smart-space.ie.
// Leads for smart-space.ie come from contact form submissions and phone calls.
// This route is kept as a no-op to avoid 404s if Typeform still points here.

export async function POST() {
  return NextResponse.json({ ok: true });
}
