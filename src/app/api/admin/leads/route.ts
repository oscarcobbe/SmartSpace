import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Lead {
  date: string;
  type: "Paid Order" | "Installation" | "Consultation" | "Upcoming";
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
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  // Simple auth — must match ADMIN_KEY env var
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || key !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads: Lead[] = [];

  // 1. Fetch recent Stripe checkout sessions (paid orders)
  try {
    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions?limit=100&status=complete",
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
            inviteePhone = inv.text_reminder_number || "—";
            const qas: { question: string; answer: string }[] = inv.questions_and_answers || [];
            notes = qas.map((q) => q.answer).join("; ");
            // Extract address from Q&A answers (format: "Address: ..." or just the answer itself)
            const addrAnswer = qas.find((q) => /address|eircode|location/i.test(q.question))?.answer;
            if (addrAnswer) {
              inviteeAddress = addrAnswer.replace(/^Address:\s*/i, "");
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

  return NextResponse.json(
    { leads, count: leads.length, generated: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
