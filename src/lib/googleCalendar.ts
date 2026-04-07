// Google Calendar API integration
// Requires env vars: GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Time slots available for booking
export const TIME_SLOTS = [
  { label: "10:30 – 12:30", value: "10:30-12:30", startHour: 10, startMin: 30, endHour: 12, endMin: 30 },
  { label: "12:30 – 14:30", value: "12:30-14:30", startHour: 12, startMin: 30, endHour: 14, endMin: 30 },
  { label: "14:30 – 16:30", value: "14:30-16:30", startHour: 14, startMin: 30, endHour: 16, endMin: 30 },
];

// Available days: Monday (1), Wednesday (3), Thursday (4)
export const AVAILABLE_DAYS = [1, 3, 4];

function isConfigured(): boolean {
  return !!(CALENDAR_ID && SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY);
}

async function getAccessToken(): Promise<string> {
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error("Google Calendar credentials not configured");
  }

  // Create JWT for service account
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  const token = await auth.getAccessToken();
  if (!token.token) throw new Error("Failed to get access token");
  return token.token;
}

/**
 * Get available time slots for a given date by checking Google Calendar free/busy
 * Returns which of our TIME_SLOTS are still available
 */
export async function getAvailableSlots(dateStr: string): Promise<typeof TIME_SLOTS> {
  // If Google Calendar is not configured, return all slots as available
  if (!isConfigured()) {
    return TIME_SLOTS;
  }

  try {
    const token = await getAccessToken();
    const timeMin = `${dateStr}T08:00:00+00:00`;
    const timeMax = `${dateStr}T18:00:00+00:00`;

    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: CALENDAR_ID }],
      }),
    });

    const data = await res.json();
    const busyPeriods = data.calendars?.[CALENDAR_ID!]?.busy || [];

    // Filter out slots that overlap with busy periods
    return TIME_SLOTS.filter((slot) => {
      const slotStart = new Date(`${dateStr}T${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}:00`);
      const slotEnd = new Date(`${dateStr}T${String(slot.endHour).padStart(2, "0")}:${String(slot.endMin).padStart(2, "0")}:00`);

      return !busyPeriods.some((busy: { start: string; end: string }) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
    });
  } catch (err) {
    console.error("Google Calendar API error:", err);
    // Fallback: return all slots if API fails
    return TIME_SLOTS;
  }
}

/**
 * Create a booking event on Google Calendar after payment is confirmed
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
    console.log("📅 Google Calendar not configured. Booking logged:", params);
    return null;
  }

  try {
    const token = await getAccessToken();
    const slot = TIME_SLOTS.find((s) => s.value === params.timeSlot);
    if (!slot) throw new Error(`Invalid time slot: ${params.timeSlot}`);

    const startTime = `${params.date}T${String(slot.startHour).padStart(2, "0")}:${String(slot.startMin).padStart(2, "0")}:00`;
    const endTime = `${params.date}T${String(slot.endHour).padStart(2, "0")}:${String(slot.endMin).padStart(2, "0")}:00`;

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID!)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Smart Space Installation – ${params.customerName}`,
          description: [
            `Customer: ${params.customerName}`,
            `Email: ${params.email}`,
            params.phone ? `Phone: ${params.phone}` : null,
            `Product: ${params.productTitle}`,
            params.orderId ? `Order: ${params.orderId}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          start: { dateTime: startTime, timeZone: "Europe/Dublin" },
          end: { dateTime: endTime, timeZone: "Europe/Dublin" },
          attendees: [{ email: params.email }],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 1440 },
              { method: "popup", minutes: 60 },
            ],
          },
        }),
      }
    );

    const event = await res.json();
    console.log("📅 Google Calendar event created:", event.id);
    return { eventId: event.id };
  } catch (err) {
    console.error("Failed to create Google Calendar event:", err);
    return null;
  }
}
