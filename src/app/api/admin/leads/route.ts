import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 10 requests per minute per IP.
// Swap for @upstash/ratelimit for multi-instance deployments.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rateBuckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return true;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

interface Lead {
  date: string;
  type: "Paid Order" | "Installation" | "Consultation" | "Contact Enquiry" | "Upcoming";
  name: string;
  email: string;
  phone: string;
  address: string;
  product: string;
  amount: string;
  bookingDate: string;
  bookingSlot: string;
  status: string;
  orderId: string;
}

export async function GET(request: Request) {
  // IP-based rate limiting to blunt brute-force guessing of ADMIN_KEY
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimitOk(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }

  // Prefer Authorization: Bearer <key>. Fall back to ?key= for one release,
  // but log it so we know when it's safe to remove the fallback.
  const authHeader = request.headers.get("authorization") ?? "";
  const headerKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get("key") ?? "";
  if (queryKey && !headerKey) {
    console.warn("[admin] deprecated ?key= query auth used; switch client to Authorization header");
  }
  const submittedKey = headerKey || queryKey;

  if (!submittedKey || !safeEqual(submittedKey, adminKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads: Lead[] = [];

  // 1. Fetch recent Stripe checkout sessions (paid orders)
  try {
    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions?limit=100&status=complete&expand[]=data.custom_fields",
      {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        cache: "no-store",
      }
    );
    const stripeData = await stripeRes.json();

    for (const session of stripeData.data || []) {
      const created = new Date(session.created * 1000);
      // Build address from Stripe billing address or custom installation address field
      const addr = session.customer_details?.address;
      const addrParts = [addr?.line1, addr?.line2, addr?.city, addr?.postal_code].filter(Boolean);
      const installAddr = session.custom_fields?.find((f: { key: string; text?: { value: string } }) => f.key === "installation_address")?.text?.value;
      const address = installAddr || addrParts.join(", ") || "—";

      leads.push({
        date: created.toLocaleString("en-GB", { timeZone: "Europe/Dublin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
        type: "Paid Order",
        name: session.customer_details?.name || "—",
        email: session.customer_details?.email || "—",
        phone: session.customer_details?.phone || "—",
        address,
        product: session.metadata?.product_name || "Order",
        amount: `€${(session.amount_total / 100).toFixed(2)}`,
        bookingDate: session.metadata?.booking_label || session.metadata?.booking_date || "—",
        bookingSlot: session.metadata?.booking_slot || "—",
        status: session.payment_status === "paid" ? "Paid" : session.payment_status,
        orderId: session.id,
      });
    }
  } catch (err) {
    console.error("[admin] Stripe fetch error:", err);
  }

  // 2. Fetch upcoming Calendly events
  const calendlyToken = process.env.CALENDLY_PERSONAL_TOKEN;
  if (calendlyToken) {
    try {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const calRes = await fetch(
        `https://api.calendly.com/scheduled_events?user=https://api.calendly.com/users/88f48d46-ddd1-4222-8aa6-5bd8c93a9c00&min_start_time=${now}&max_start_time=${future}&status=active&sort=start_time:asc`,
        {
          headers: { Authorization: `Bearer ${calendlyToken}`, "Content-Type": "application/json" },
          cache: "no-store",
        }
      );
      const calData = await calRes.json();

      for (const event of calData.collection || []) {
        // Get invitee details
        let inviteeName = "—";
        let inviteeEmail = "—";
        let inviteePhone = "—";
        let inviteeAddress = "—";
        let notes = "";

        try {
          const invRes = await fetch(`${event.uri}/invitees`, {
            headers: { Authorization: `Bearer ${calendlyToken}` },
            cache: "no-store",
          });
          const invData = await invRes.json();
          const inv = (invData.collection || [])[0];
          if (inv) {
            inviteeName = inv.name || "—";
            inviteeEmail = inv.email || "—";
            // Phone from text_reminder_number or parsed from Q&A
            const qaList: { answer: string }[] = inv.questions_and_answers || [];
            const phoneFromQA = qaList.map((q) => q.answer).join(" ").match(/Phone:\s*([^|]+)/i)?.[1]?.trim();
            inviteePhone = inv.text_reminder_number || phoneFromQA || "—";
            const qas: { question: string; answer: string }[] = inv.questions_and_answers || [];
            notes = qas.map((q) => q.answer).join("; ");
            // Extract address from Q&A — may be in question text OR embedded in answer as "Address: ..."
            for (const qa of qas) {
              if (/address|eircode|location/i.test(qa.question)) {
                inviteeAddress = qa.answer.replace(/^Address:\s*/i, "");
                break;
              }
              const addrMatch = qa.answer.match(/Address:\s*([^|]+)/i);
              if (addrMatch) {
                inviteeAddress = addrMatch[1].trim();
                break;
              }
            }
          }
        } catch { /* ignore */ }

        const start = new Date(event.start_time);
        const startStr = start.toLocaleString("en-GB", { timeZone: "Europe/Dublin", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

        const isConsultation = event.name?.toLowerCase().includes("consultation");

        leads.push({
          date: startStr,
          type: isConsultation ? "Consultation" : "Installation",
          name: inviteeName,
          email: inviteeEmail,
          phone: inviteePhone,
          address: inviteeAddress,
          product: event.name || "—",
          amount: isConsultation ? "Complimentary" : "—",
          bookingDate: startStr,
          bookingSlot: `${start.toLocaleString("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false })} – ${new Date(event.end_time).toLocaleString("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false })}`,
          status: "Upcoming",
          orderId: notes || "—",
        });
      }
    } catch (err) {
      console.error("[admin] Calendly fetch error:", err);
    }
  }

  // 3. Fetch contact form submissions from the Google Sheet via Apps Script GET.
  //    Requires GOOGLE_SHEET_WEBHOOK_URL + GOOGLE_SHEET_READ_TOKEN env vars,
  //    AND the matching READ_TOKEN constant in google-apps-script.js.
  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const readToken = process.env.GOOGLE_SHEET_READ_TOKEN;
  if (sheetUrl && readToken) {
    try {
      const url = `${sheetUrl}?token=${encodeURIComponent(readToken)}&type=${encodeURIComponent("Contact Enquiry")}&limit=200`;
      const sheetRes = await fetch(url, { cache: "no-store", redirect: "follow" });
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        for (const row of sheetData.rows || []) {
          const r = row as Record<string, string | number>;
          // Apps Script returns the Date column already formatted in Dublin
          // time (dd/MM/yyyy HH:mm) — pass through as-is.
          leads.push({
            date: String(r.date || "—"),
            type: "Contact Enquiry",
            name: String(r.name || "—"),
            email: String(r.email || "—"),
            phone: String(r.phone || "—"),
            address: String(r.address || "—"),
            product: String(r.product || "Contact form"),
            amount: r.amount ? `€${r.amount}` : "—",
            bookingDate: "—",
            bookingSlot: "—",
            status: String(r.status || "New"),
            orderId: String(r.notes || "—"),
          });
        }
      } else {
        console.error("[admin] Sheet doGet error:", sheetRes.status, await sheetRes.text());
      }
    } catch (err) {
      console.error("[admin] Sheet fetch error:", err);
    }
  }

  return NextResponse.json(
    { leads, count: leads.length, generated: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
