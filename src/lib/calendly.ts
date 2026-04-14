// Calendly API integration
// Requires env vars: CALENDLY_PERSONAL_TOKEN, CALENDLY_CONSULTATION_EVENT_TYPE_URI, CALENDLY_INSTALLATION_EVENT_TYPE_URI

const CALENDLY_TOKEN = process.env.CALENDLY_PERSONAL_TOKEN;
const CONSULTATION_EVENT_TYPE_URI = process.env.CALENDLY_CONSULTATION_EVENT_TYPE_URI;
// Fall back to old env var name so existing Vercel deployments keep working
const INSTALLATION_EVENT_TYPE_URI = process.env.CALENDLY_INSTALLATION_EVENT_TYPE_URI || process.env.CALENDLY_EVENT_TYPE_URI;

// Time slots available for booking (Dublin time)
export const TIME_SLOTS = [
  { label: "10:00 – 12:00", value: "10:00-12:00", startHour: 10, startMin: 0, endHour: 12, endMin: 0 },
  { label: "12:30 – 14:30", value: "12:30-14:30", startHour: 12, startMin: 30, endHour: 14, endMin: 30 },
  { label: "15:00 – 17:00", value: "15:00-17:00", startHour: 15, startMin: 0, endHour: 17, endMin: 0 },
];

// Available days: Tuesday (2), Wednesday (3), Thursday (4)
export const AVAILABLE_DAYS = [2, 3, 4];

type EventKind = "consultation" | "installation";

function getEventTypeUri(kind: EventKind): string | undefined {
  return kind === "consultation" ? CONSULTATION_EVENT_TYPE_URI : INSTALLATION_EVENT_TYPE_URI;
}


/**
 * Get available time slots for a given date by checking Calendly availability.
 * Maps Calendly's available start times back to our fixed TIME_SLOTS.
 */
export async function getAvailableSlots(dateStr: string, kind: EventKind = "installation"): Promise<typeof TIME_SLOTS> {
  const eventTypeUri = getEventTypeUri(kind);

  if (!CALENDLY_TOKEN || !eventTypeUri) {
    console.error(`[calendly] Not configured for ${kind}. CALENDLY_PERSONAL_TOKEN=${CALENDLY_TOKEN ? "set" : "MISSING"}, event_type_uri=${eventTypeUri ? "set" : "MISSING"}`);
    return [];
  }

  try {
    const startTime = `${dateStr}T00:00:00Z`;
    const endTime = `${dateStr}T23:59:59Z`;

    const res = await fetch(
      `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${startTime}&end_time=${endTime}`,
      {
        headers: {
          Authorization: `Bearer ${CALENDLY_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("[calendly] API error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const collection = (data.collection || []).filter((t: { status: string }) => t.status === "available");

    // Map Calendly UTC start times to our slot values using Dublin timezone
    const availableSlotValues = new Set<string>();

    for (const t of collection) {
      const utcDate = new Date((t as { start_time: string }).start_time);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Dublin",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(utcDate);

      const hour = parts.find(p => p.type === "hour")?.value || "00";
      const minute = parts.find(p => p.type === "minute")?.value || "00";
      const localTime = `${hour}:${minute}`;

      for (const slot of TIME_SLOTS) {
        const slotStart = `${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}`;
        if (localTime === slotStart) {
          availableSlotValues.add(slot.value);
        }
      }
    }

    return TIME_SLOTS.filter((slot) => availableSlotValues.has(slot.value));
  } catch (err) {
    console.error("[calendly] API error:", err);
    return [];
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
  address?: string;
  productTitle: string;
  orderId?: string;
  kind?: EventKind;
}): Promise<{ eventId: string } | null> {
  const kind = params.kind ?? "installation";
  const eventTypeUri = getEventTypeUri(kind);

  if (!CALENDLY_TOKEN || !eventTypeUri) {
    console.error(`[calendly] Cannot create booking — not configured for ${kind}`);
    return null;
  }

  try {
    const slot = TIME_SLOTS.find((s) => s.value === params.timeSlot);
    if (!slot) throw new Error(`Invalid time slot: ${params.timeSlot}`);

    // Look up the exact Calendly available start time for this slot
    const availableRes = await fetch(
      `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${params.date}T00:00:00Z&end_time=${params.date}T23:59:59Z`,
      { headers: { Authorization: `Bearer ${CALENDLY_TOKEN}`, "Content-Type": "application/json" }, cache: "no-store" }
    );
    const availableData = await availableRes.json();
    const availableTimes: { start_time: string; status: string }[] = (availableData.collection || []).filter(
      (t: { status: string }) => t.status === "available"
    );

    // Match our Dublin-time slot to a Calendly available time
    let startTimeIso: string | null = null;
    for (const t of availableTimes) {
      const utcDate = new Date(t.start_time);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Dublin",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(utcDate);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
      if (hour === slot.startHour && minute === slot.startMin) {
        startTimeIso = t.start_time;
        break;
      }
    }

    if (!startTimeIso) {
      console.error(`[calendly] No available time matching ${slot.startHour}:${slot.startMin} on ${params.date}`);
      return null;
    }

    console.log(`[calendly] Booking: kind=${kind} slot=${params.timeSlot} → startTime=${startTimeIso}`);

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
        event_type: eventTypeUri,
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
            answer: [
              `Product: ${params.productTitle}`,
              params.orderId ? `Order: ${params.orderId}` : "",
              params.address ? `Address: ${params.address}` : "",
              params.phone ? `Phone: ${params.phone}` : "",
            ].filter(Boolean).join(" | "),
            position: 0,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[calendly] Booking error:", res.status, errText);
      return null;
    }

    const event = await res.json();
    const eventId = event.resource?.uri || event.uri || "created";
    console.log("[calendly] Booking created:", eventId);
    return { eventId };
  } catch (err) {
    console.error("[calendly] Failed to create booking:", err);
    return null;
  }
}
