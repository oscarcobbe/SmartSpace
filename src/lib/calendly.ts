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
    const availableStartTimes = (data.collection || [])
      .filter((t: { status: string }) => t.status === "available")
      .map((t: { start_time: string }) => {
        // Convert UTC start_time to Dublin local hour:minute
        const d = new Date(t.start_time);
        const dublin = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Dublin" }));
        return `${String(dublin.getHours()).padStart(2, "0")}:${String(dublin.getMinutes()).padStart(2, "0")}`;
      });

    // Match Calendly available times to our fixed slots
    return TIME_SLOTS.filter((slot) => {
      const slotStart = `${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}`;
      return availableStartTimes.includes(slotStart);
    });
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

    // Build Dublin local time and convert to ISO for Calendly
    const localStart = `${params.date}T${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}:00`;
    const startTimeIso = new Date(localStart).toISOString();

    const nameParts = params.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const res = await fetch("https://api.calendly.com/scheduled_events/invitees", {
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
          last_name: lastName,
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
