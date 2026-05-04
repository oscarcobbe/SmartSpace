import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { PRODUCT_CATALOGUE } from "@/data/productCatalogue";

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

/**
 * Reverse-engineer the variant a past customer chose from the amount they
 * paid + the product they bought. Each Shopify variant is a unique
 * combination of options (number of devices / doorbell wiring / cameras
 * needing wiring) and has its own price, so the paid amount usually
 * narrows to a single variant — sometimes two when prices coincide.
 *
 * Used only for orders that predate the metadata.configuration capture
 * (anything from before 2026-05-04). Returns an empty array if no match.
 */
function recoverVariantFromPrice(productName: string, paidEuros: number): QA[] {
  if (!productName || !Number.isFinite(paidEuros) || paidEuros < 5) return [];
  const cents = Math.round(paidEuros * 100);

  // Match Stripe metadata.product_name back to a Shopify product entry
  const norm = productName.toLowerCase().trim();
  const product =
    PRODUCT_CATALOGUE.find((p) => p.handle === norm) ??
    PRODUCT_CATALOGUE.find((p) => p.title.toLowerCase() === norm) ??
    PRODUCT_CATALOGUE.find((p) => p.title.toLowerCase().includes(norm) || norm.includes(p.title.toLowerCase()));
  if (!product) return [];

  const candidates = (product.variants?.edges || [])
    .map((e) => e.node)
    .filter((v) => Math.round(parseFloat(v.price.amount) * 100) === cents);

  if (candidates.length === 0) return [];

  // Friendly relabel — keep dashboard tidy. Mirrors the FRIENDLY_LABELS
  // map used on the product pages so post-fix and pre-fix orders read
  // identically.
  const FRIENDLY: Record<string, string> = {
    "How Many Devices To Be Installed": "Number of devices",
    "How Many Ring or Similar Products Are To Be Installed": "Number of devices",
    "Video Doorbell - Existing Working Wired Doorbell": "Existing doorbell wiring",
    "Video Doorbell To Be Installed": "Existing doorbell wiring",
    "External Cameras - How Many Need New Power Cabling": "Cameras needing new wiring",
    "External Video Camera(s) To Be Installed": "Cameras needing new wiring",
    "Choose A Power Option": "Power option",
  };
  const friendlyName = (raw: string) => {
    const cleaned = raw.replace(/\s*\?\s*$/, "").trim();
    return FRIENDLY[cleaned] ?? cleaned;
  };

  // Fields that have a SINGLE consistent value across all candidates can be
  // shown plainly. Fields where candidates disagree get listed as
  // "either / or" so the dashboard reflects honest uncertainty.
  const optionNames = candidates[0].selectedOptions.map((o) => o.name);
  const out: QA[] = [];
  for (const optName of optionNames) {
    const distinctValues = Array.from(
      new Set(candidates.map((v) => v.selectedOptions.find((o) => o.name === optName)?.value).filter(Boolean))
    );
    if (distinctValues.length === 1) {
      out.push({ question: friendlyName(optName), answer: String(distinctValues[0]) });
    } else {
      out.push({
        question: friendlyName(optName),
        answer: distinctValues.join(" OR ") + " (price-derived; confirm with customer)",
      });
    }
  }
  return out;
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

interface QA {
  question: string;
  answer: string;
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
  /**
   * Question/answer pairs the customer provided at conversion time.
   * Sources:
   *   - Paid orders: Stripe metadata.configuration (set in /api/checkout from
   *     the product page's Shopify variant selectors), plus the
   *     installation_address custom field if filled.
   *   - Calendly events: invitee questions_and_answers from Calendly API.
   *   - Contact enquiries: subject + free-form message from the contact form.
   */
  details?: QA[];
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

      // Build details: Stripe custom-fields + parsed metadata.configuration
      // (the JSON-encoded answers from the product page's variant selectors).
      const details: QA[] = [];
      const cfgRaw = session.metadata?.configuration as string | undefined;
      if (cfgRaw) {
        try {
          const parsed = JSON.parse(cfgRaw) as Array<{ question: string; answer: string }> | Record<string, string>;
          if (Array.isArray(parsed)) {
            for (const p of parsed) {
              if (p?.question && p.answer != null) details.push({ question: String(p.question), answer: String(p.answer) });
            }
          } else if (parsed && typeof parsed === "object") {
            for (const [q, a] of Object.entries(parsed)) {
              if (a != null && String(a).trim() !== "") details.push({ question: q, answer: String(a) });
            }
          }
        } catch {
          // metadata isn't JSON — surface the raw string so we don't lose info
          details.push({ question: "Configuration", answer: cfgRaw });
        }
      } else {
        // Fallback for orders that predate metadata.configuration capture
        // (anything from before 2026-05-04): reverse-engineer the variant
        // from the amount paid + the product. Most installation-only and
        // accessory variants have unique prices so this recovers the
        // customer's choices exactly. When two variants share a price
        // both candidates are surfaced with an "OR" suffix.
        const recovered = recoverVariantFromPrice(
          (session.metadata?.product_name as string) || "",
          (session.amount_total ?? 0) / 100
        );
        details.push(...recovered);
      }
      // Surface installation_address separately if it differs from the billing
      // address — useful when the install site isn't where the bill goes.
      if (installAddr && installAddr.trim() && installAddr !== addrParts.join(", ")) {
        details.push({ question: "Installation address", answer: installAddr });
      }

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
        details: details.length ? details : undefined,
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
        const calendlyDetails: QA[] = [];

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
            // Surface every Q&A pair into details. Calendly often packs
            // multiple sub-fields into a single answer (e.g. "Product: X |
            // Address: Y | Phone: Z | [free-form note]"). Split on " | " and
            // promote every "Label: value" sub-field to its own dashboard
            // row; sub-fields that aren't in label-form fall through as a
            // generic "Note" so we never lose information.
            for (const qa of qas) {
              const q = (qa.question || "").trim();
              const a = (qa.answer || "").trim();
              if (!a) continue;
              const subFields = a.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
              const labeled = subFields.filter((s) => /^[\w\s]{2,30}:\s*\S/.test(s));
              if (subFields.length > 1 && labeled.length >= 1) {
                for (const sub of subFields) {
                  const m = sub.match(/^([\w\s]{2,30}):\s*(.+)$/);
                  if (m) {
                    calendlyDetails.push({ question: m[1].trim(), answer: m[2].trim() });
                  } else {
                    // Free-form trailing notes — keep them but mark generically
                    calendlyDetails.push({ question: "Note", answer: sub });
                  }
                }
              } else {
                calendlyDetails.push({ question: q || "Note", answer: a });
              }
            }
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
          details: calendlyDetails.length ? calendlyDetails : undefined,
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
          // Sheet's "notes" column is typically "<Subject>: <Message>" from
          // /api/contact (e.g. "Installation Enquiry: I have an old ..."). Split
          // it back out so the dashboard shows topic + message as separate rows.
          const rawNotes = String(r.notes || "").trim();
          const contactDetails: QA[] = [];
          if (rawNotes) {
            const m = rawNotes.match(/^([^:]{2,40}):\s*([\s\S]+)$/);
            if (m) {
              contactDetails.push({ question: "Topic", answer: m[1].trim() });
              contactDetails.push({ question: "Message", answer: m[2].trim() });
            } else {
              contactDetails.push({ question: "Message", answer: rawNotes });
            }
          }
          // Surface UTM / source attribution if present
          if (r.utmSource) contactDetails.push({ question: "Source", answer: String(r.utmSource) });
          if (r.utmCampaign) contactDetails.push({ question: "Campaign", answer: String(r.utmCampaign) });
          if (r.gclid) contactDetails.push({ question: "Google Ads click", answer: "Yes" });

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
            details: contactDetails.length ? contactDetails : undefined,
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
