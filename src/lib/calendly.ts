// Calendly API integration
// Requires env vars: CALENDLY_PERSONAL_TOKEN, CALENDLY_EVENT_TYPE_URI

const CALENDLY_TOKEN = process.env.CALENDLY_PERSONAL_TOKEN;
const EVENT_TYPE_URI = process.env.CALENDLY_EVENT_TYPE_URI;

// Time slots available for booking (Dublin time → UTC offset is +0 in winter, +1 in summer)
export const TIME_SLOTS = [
  { label: "10:00 – 12:00", value: "10:00-12:00", startHour: 10, startMin: 0, endHour: 12, endMin: 0 },
  { label: "12:30 – 14:30", value: "12:30-14:30", startHour: 12, startMin: 30, endHour: 14, endMin: 30 },
  { label: "15:00 – 17:00", value: "15:00-17:00", startHour: 15, startMin: 0, endHour: 17, endMin: 0 },
];

// Available days: Tuesday (2), Wednesday (3), Thursday (4)
export const AVAILABLE_DAYS = [2, 3, 4];

function isConfigured(): boolean {
  return !!(CALENDLY_TOKEN && EVENT_TYPE_URI);
}

/**
 * Get available time slots for a given date by checking Calendly availability.
 * Maps Calendly's available start times back to our fixed TIME_SLOTS.
 */
export async function getAvailableSlots(dateStr: string): Promise<typeof TIME_SLOTS> {
  if (!isConfigured()) {
    return TIME_SLOTS;
  }

  try {
    const startTime = `${dateStr}T00:00:00Z`;
    const endTime = `${dateStr}T23:59:59Z`;

    const res = await fetch(
      `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(EVENT_TYPE_URI!)}&start_time=${startTime}&end_time=${endTime}`,
      {
        headers: {
          Authorization: `Bearer ${CALENDLY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      console.error("Calendly API error:", res.status, await res.text());
      return TIME_SLOTS;
    }

    const data = await res.json();
    const collection = (data.collection || []).filter((t: { status: string }) => t.status === "available");

    console.log(`📅 Calendly available times for ${dateStr}:`, collection.map((t: { start_time: string }) => t.start_time));

    // Map Calendly UTC start times to our slot values
    // Calendly returns UTC times; our slots are in Dublin time (Europe/Dublin)
    // Instead of toLocaleString (unreliable in Node), manually compute Dublin offset
    const availableSlotValues = new Set<string>();

    for (const t of collection) {
      const utcDate = new Date((t as { start_time: string }).start_time);
      // Get Dublin offset: create a formatter that outputs hour/minute in Dublin tz
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Dublin",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(utcDate);

      const hour = parts.find(p => p.type === "hour")?.value || "00";
      const minute = parts.find(p => p.type === "minute")?.value || "00";
      const localTime = `${hour}:${minute}`;

      // Find which slot this start time matches
      for (const slot of TIME_SLOTS) {
        const slotStart = `${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}`;
        if (localTime === slotStart) {
          availableSlotValues.add(slot.value);
        }
      }
    }

    console.log(`📅 Matched slots for ${dateStr}:`, Array.from(availableSlotValues));

    return TIME_SLOTS.filter((slot) => availableSlotValues.has(slot.value));
  } catch (err) {
    console.error("Calendly API error:", err);
    return TIME_SLOTS;
  }
}

/**
 * Create a booking on Calendly after payment is confirmed.
 * Uses the Scheduling API to book the invitee directly.
 */
export async function createBookingEvent(params: {
  date: string;
  timeSlot: string;
  customerName: string;
  email: string;
  phone?: string;
  productTitle: string;
  orderId?: string;
}): Promise<{ eventId: string } | null> {
  if (!isConfigured()) {
    console.log("📅 Calendly not configured. Booking logged:", params);
    return null;
  }

  try {
    const slot = TIME_SLOTS.find((s) => s.value === params.timeSlot);
    if (!slot) throw new Error(`Invalid time slot: ${params.timeSlot}`);

    // Build Dublin local time with correct timezone offset for Calendly.
    // Ireland uses IST (UTC+1) in summer and GMT (UTC+0) in winter.
    // Vercel runs in UTC, so naive `new Date("...T10:00:00")` would be wrong in summer.
    const hh = String(slot.startHour).padStart(2, "0");
    const mm = String(slot.startMin).padStart(2, "0");
    const dublinDateStr = `${params.date}T${hh}:${mm}:00`;
    // Determine Dublin's UTC offset for this date
    const probe = new Date(`${params.date}T12:00:00Z`);
    const dublinParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Dublin",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(probe);
    const dublinHour = parseInt(dublinParts.find((p) => p.type === "hour")?.value ?? "12");
    const offsetHours = dublinHour - 12; // +1 in summer, 0 in winter
    const isoOffset = `${offsetHours >= 0 ? "+" : "-"}${String(Math.abs(offsetHours)).padStart(2, "0")}:00`;
    const startTimeIso = new Date(`${dublinDateStr}${isoOffset}`).toISOString();

    const nameParts = params.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const res = await fetch("https://api.calendly.com/invitees", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CALENDLY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE_URI,
        start_time: startTimeIso,
        invitee: {
          email: params.email,
          first_name: firstName,
          last_name: lastName || undefined,
          timezone: "Europe/Dublin",
          text_reminder_number: params.phone || undefined,
        },
        location: {
          kind: "physical",
          location: "Customer's home",
        },
        questions_and_answers: [
          {
            question: "Please share anything that will help prepare for our meeting.",
            answer: `Product: ${params.productTitle}${params.orderId ? ` | Order: ${params.orderId}` : ""}`,
            position: 0,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Calendly booking error:", res.status, errText);
      return null;
    }

    const event = await res.json();
    const eventId = event.resource?.uri || event.uri || "created";
    console.log("📅 Calendly booking created:", eventId);
    return { eventId };
  } catch (err) {
    console.error("Failed to create Calendly booking:", err);
    return null;
  }
}
