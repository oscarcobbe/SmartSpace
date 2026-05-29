import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { PRODUCT_CATALOGUE } from "@/data/productCatalogue";
import { formatEuro } from "@/lib/format";

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
  // Per-source error tracking — surfaced to the dashboard so admins know
  // when a section is incomplete (e.g. Stripe API down, Calendly token
  // expired, Apps Script quota exhausted). Without this, partial failures
  // are silent and the admin makes decisions on incomplete data.
  const sourceErrors: { source: string; message: string }[] = [];

  // 1. Fetch recent Stripe checkout sessions (paid orders)
  try {
    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions?limit=100&status=complete&expand[]=data.custom_fields",
      {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        cache: "no-store",
        // 10s ceiling — Stripe list usually <1s, but a hung call would
        // otherwise pin the whole admin page render.
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!stripeRes.ok) {
      const errBody = await stripeRes.text().catch(() => "");
      throw new Error(`Stripe API ${stripeRes.status}: ${errBody.slice(0, 200)}`);
    }
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
        amount: formatEuro(session.amount_total / 100),
        bookingDate: session.metadata?.booking_label || session.metadata?.booking_date || "—",
        bookingSlot: session.metadata?.booking_slot || "—",
        status: session.payment_status === "paid" ? "Paid" : session.payment_status,
        orderId: session.id,
        details: details.length ? details : undefined,
      });
    }
  } catch (err) {
    console.error("[admin] Stripe fetch error:", err);
    sourceErrors.push({
      source: "Stripe (Paid Orders)",
      message: err instanceof Error ? err.message : "Unknown error fetching Stripe sessions",
    });
  }

  // 2. Fetch upcoming Calendly events
  const calendlyToken = process.env.CALENDLY_PERSONAL_TOKEN;
  if (!calendlyToken) {
    sourceErrors.push({
      source: "Calendly (Installations + Consultations)",
      message: "CALENDLY_PERSONAL_TOKEN env var not set — bookings won't load until token is added in Vercel.",
    });
  } else {
    try {
      // Pull Calendly events in a window of [30 days ago, 90 days ahead].
      // The previous min_start_time=now silently dropped every booking from
      // the dashboard the instant its start time passed — past customers
      // disappeared while Nigel still needed visibility (follow-ups,
      // reviews, no-show reconciliation, "wait what was that job last
      // week"). 30-day past window covers the typical review-chase and
      // invoice-reconciliation cadence without bloating the response.
      // The Sheet writes from logLead() persist independently, so this
      // is purely a dashboard-visibility fix — no data was lost.
      const pastWindow = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const calRes = await fetch(
        `https://api.calendly.com/scheduled_events?user=https://api.calendly.com/users/88f48d46-ddd1-4222-8aa6-5bd8c93a9c00&min_start_time=${pastWindow}&max_start_time=${future}&status=active&sort=start_time:asc`,
        {
          headers: { Authorization: `Bearer ${calendlyToken}`, "Content-Type": "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!calRes.ok) {
        const errBody = await calRes.text().catch(() => "");
        throw new Error(`Calendly API ${calRes.status}: ${errBody.slice(0, 200)}`);
      }
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
            // 8s per-invitee ceiling — the outer loop fans out one of
            // these per Calendly event so a single hung call could
            // otherwise serialise into a 90s admin-page render.
            signal: AbortSignal.timeout(8000),
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
                    const label = m[1].trim();
                    const value = m[2].trim();
                    // Skip the "Order: cs_xxx..." sub-field — that's the
                    // internal Stripe session id passed through from
                    // createBookingEvent in lib/calendly.ts. Admin doesn't
                    // need to see it on the dashboard.
                    if (/^order$/i.test(label)) continue;
                    // Split "Product: Plus Video Doorbell — New Cabling &
                    // Power Source Required" into separate Product + Cabling
                    // rows. The em-dash join is added in /api/checkout to fit
                    // the variant title into a single Stripe metadata field,
                    // but it reads as a confusing run-on for admins.
                    if (/^product$/i.test(label) && / — /.test(value)) {
                      const [productName, variant] = value.split(/ — /, 2);
                      calendlyDetails.push({ question: "Product", answer: productName.trim() });
                      if (variant) calendlyDetails.push({ question: "Cabling", answer: variant.trim() });
                      continue;
                    }
                    calendlyDetails.push({ question: label, answer: value });
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
        } catch (err) {
          // Non-fatal per-event — one missing invitee shouldn't blank the
          // whole dashboard. Log so a recurring failure (e.g. Calendly
          // rate-limit) is visible in Vercel logs rather than silent.
          console.warn(
            `[admin] Calendly invitee fetch failed for event ${event.uri}:`,
            err instanceof Error ? err.message : err
          );
        }

        const start = new Date(event.start_time);
        const startStr = start.toLocaleString("en-GB", { timeZone: "Europe/Dublin", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

        const isConsultation = event.name?.toLowerCase().includes("consultation");

        // Date-aware status. The 30-day past window means we now surface
        // already-completed appointments — labelling them "Upcoming" would
        // be a lie and would also pollute the page.tsx Upcoming-tab filter
        // (`l.status === "Upcoming"`). Anything whose start_time has
        // passed gets "Completed"; future events stay "Upcoming".
        const isPast = start.getTime() < Date.now();
        const calendlyStatus = isPast ? "Completed" : "Upcoming";

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
          status: calendlyStatus,
          orderId: notes || "—",
          details: calendlyDetails.length ? calendlyDetails : undefined,
        });
      }
    } catch (err) {
      console.error("[admin] Calendly fetch error:", err);
      sourceErrors.push({
        source: "Calendly (Installations + Consultations)",
        message: err instanceof Error ? err.message : "Unknown error fetching Calendly events",
      });
    }
  }

  // 3. Fetch contact form submissions from the Google Sheet via Apps Script GET.
  //    Requires GOOGLE_SHEET_WEBHOOK_URL + GOOGLE_SHEET_READ_TOKEN env vars,
  //    AND the matching READ_TOKEN constant in google-apps-script.js.
  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const readToken = process.env.GOOGLE_SHEET_READ_TOKEN;
  if (!sheetUrl || !readToken) {
    sourceErrors.push({
      source: "Google Sheet (Contact Enquiries)",
      message: !sheetUrl
        ? "GOOGLE_SHEET_WEBHOOK_URL env var not set."
        : "GOOGLE_SHEET_READ_TOKEN env var not set — Apps Script doGet() will reject the read.",
    });
  } else {
    try {
      // Fetch ALL types from the Sheet so the dashboard can surface manual
      // entries (phone orders Nigel takes by phone and writes directly into
      // the Sheet, recovery rows, etc.) — not just contact form enquiries.
      // Stripe-paid orders (orderId starts cs_*) are skipped here because
      // they're already loaded from the Stripe API above; including them
      // would double-count revenue.
      const url = `${sheetUrl}?token=${encodeURIComponent(readToken)}&type=All&limit=500`;
      // Apps Script doGet can cold-start at 8-12s. Previous 10s ceiling
      // clipped any cold-start hit and left the admin dashboard empty
      // (same class of failure as the 18 May write and the 21 May
      // health-check abort). New pattern matches health-check and
      // logLead: 15s first attempt, then if AbortError, wait 1.5s for
      // the warm-up and retry at 12s. Vercel Pro tier gives us 60s
      // total function budget so the worst case (~28.5s) still fits.
      let sheetRes = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      }).catch((err: unknown) => {
        // Return a Response-like sentinel so the retry path below
        // can decide whether to re-attempt. AbortSignal.timeout()
        // rejects with a TimeoutError DOMException; we treat both
        // AbortError and TimeoutError as cold-start aborts.
        const name = err instanceof Error ? err.name : "Error";
        return { __abort: true, errorName: name, error: err } as unknown as Response;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((sheetRes as any).__abort) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorName = (sheetRes as any).errorName as string;
        if (errorName === "AbortError" || errorName === "TimeoutError") {
          console.warn(
            "[admin] sheet read first attempt aborted (likely Apps Script cold start) — retrying after 1.5s"
          );
          await new Promise((r) => setTimeout(r, 1500));
          sheetRes = await fetch(url, {
            cache: "no-store",
            redirect: "follow",
            signal: AbortSignal.timeout(12000),
          });
        } else {
          // Non-abort throw — rethrow so the outer try/catch records it
          // as a source error and the dashboard surfaces the actual cause.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (sheetRes as any).error;
        }
      }
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        if (sheetData.error) {
          throw new Error(`Apps Script returned: ${sheetData.error}`);
        }

        // Build a Set of Stripe-fetched orderIds so we can skip Sheet rows
        // that are already in the leads array via the Stripe API path.
        const stripeOrderIds = new Set(
          leads.filter((l) => l.type === "Paid Order" && l.orderId).map((l) => l.orderId)
        );

        // Dedupe manual Paid Order rows by name+amount+bookingDate. Manual
        // writes can produce multiple rows with different timestamp-based
        // orderIds (e.g. "manual-helen-miley-1778173923",
        // "manual-helen-miley-1778174010") for the same booking. We keep
        // the first row seen and drop the rest.
        const seenManualPaid = new Set<string>();

        for (const row of sheetData.rows || []) {
          const r = row as Record<string, string | number>;
          const rowType = String(r.type || "");
          const orderId = String(r.orderId || "");

          if (rowType === "Paid Order") {
            // Skip if Stripe API already gave us this order
            if (orderId && /^cs_(live|test)_/.test(orderId) && stripeOrderIds.has(orderId)) continue;
            // If it's a Stripe-style ID that ISN'T in the Stripe set, the
            // Stripe fetch likely errored — let the Sheet row stand in.

            // Dedupe manual entries by composite key
            const dedupeKey = `${String(r.name || "").trim().toLowerCase()}|${r.amount}|${r.bookingDate}`;
            if (seenManualPaid.has(dedupeKey)) continue;
            seenManualPaid.add(dedupeKey);

            const manualDetails: QA[] = [];
            if (r.notes) manualDetails.push({ question: "Notes", answer: String(r.notes) });

            leads.push({
              date: String(r.date || "—"),
              type: "Paid Order",
              name: String(r.name || "—"),
              email: String(r.email || "—"),
              phone: String(r.phone || "—"),
              address: String(r.address || "—"),
              product: String(r.product || "—"),
              amount: r.amount ? formatEuro(Number(r.amount)) : "—",
              bookingDate: String(r.bookingDate || "—"),
              bookingSlot: String(r.bookingSlot || "—"),
              status: String(r.status || "New"),
              orderId: orderId || "—",
              details: manualDetails.length ? manualDetails : undefined,
            });
            continue;
          }

          if (rowType !== "Contact Enquiry") continue;

          // Apps Script returns the Date column already formatted in Dublin
          // time (dd/MM/yyyy HH:mm) — pass through as-is.
          // Sheet's "notes" column is typically "<Subject>: <Message>" from
          // /api/contact (e.g. "Installation Enquiry: I have an old ..."). Split
          // it back out so the dashboard shows topic + message as separate rows.
          const rawNotes = String(r.notes || "").trim();
          const contactDetails: QA[] = [];
          let parsedTopic: string | undefined;
          let parsedMessage: string | undefined;
          if (rawNotes) {
            const m = rawNotes.match(/^([^:]{2,40}):\s*([\s\S]+)$/);
            if (m) {
              parsedTopic = m[1].trim();
              parsedMessage = m[2].trim();
              contactDetails.push({ question: "Topic", answer: parsedTopic });
              contactDetails.push({ question: "Message", answer: parsedMessage });
            } else {
              parsedMessage = rawNotes;
              contactDetails.push({ question: "Message", answer: rawNotes });
            }
          }
          // Surface UTM / source attribution if present
          if (r.utmSource) contactDetails.push({ question: "Source", answer: String(r.utmSource) });
          if (r.utmCampaign) contactDetails.push({ question: "Campaign", answer: String(r.utmCampaign) });
          if (r.gclid) contactDetails.push({ question: "Google Ads click", answer: "Yes" });

          // Show the parsed Topic in the Product column instead of the
          // useless generic "Contact form" — Nigel now sees the subject
          // line at-a-glance without having to expand the row. Also append
          // a short snippet of the message body so the table row carries
          // enough context to triage without a click.
          const messageSnippet = parsedMessage
            ? parsedMessage.length > 70
              ? `${parsedMessage.slice(0, 70).trim()}…`
              : parsedMessage
            : "";
          const productLabel = parsedTopic
            ? messageSnippet
              ? `${parsedTopic} — ${messageSnippet}`
              : parsedTopic
            : "Contact form";

          // Sheet-side status is rarely populated for contact rows. Default
          // to "Awaiting reply" rather than "New" so the badge actually
          // communicates the next action — Nigel still owes them a reply.
          // If Nigel ever updates the Sheet row's Status column to
          // "Replied" or "Closed", that wins. (Updating from the dashboard
          // UI is a separate piece of work, not in scope here.)
          const sheetStatus = String(r.status || "").trim();
          const statusLabel = sheetStatus || "Awaiting reply";

          leads.push({
            date: String(r.date || "—"),
            type: "Contact Enquiry",
            name: String(r.name || "—"),
            email: String(r.email || "—"),
            phone: String(r.phone || "—"),
            address: String(r.address || "—"),
            product: productLabel,
            amount: r.amount ? formatEuro(Number(r.amount)) : "—",
            bookingDate: "—",
            bookingSlot: "—",
            status: statusLabel,
            orderId: String(r.notes || "—"),
            details: contactDetails.length ? contactDetails : undefined,
          });
        }
      } else {
        const errBody = await sheetRes.text().catch(() => "");
        console.error("[admin] Sheet doGet error:", sheetRes.status, errBody);
        throw new Error(`Apps Script HTTP ${sheetRes.status}: ${errBody.slice(0, 200)}`);
      }
    } catch (err) {
      console.error("[admin] Sheet fetch error:", err);
      sourceErrors.push({
        source: "Google Sheet (Contact Enquiries)",
        message: err instanceof Error ? err.message : "Unknown error fetching contact submissions",
      });
    }
  }

  // 4. Fetch Stripe balance for the "upcoming payout" card.
  //    Sum of balance.available + balance.pending in EUR — funds Stripe
  //    is holding that haven't yet swept to the bank. Fails soft: an
  //    error pushes a sourceError row but doesn't break leads.
  //
  //    NOTE: the second revenue card on the dashboard ("Upcoming work
  //    value") is computed client-side from the leads array — it sums
  //    amounts for every lead with status="Upcoming" regardless of
  //    whether Stripe has been paid yet. So we don't fetch payouts
  //    here anymore.
  let stripeUpcomingPayout = 0;
  try {
    const balanceRes = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!balanceRes.ok) {
      const errBody = await balanceRes.text().catch(() => "");
      throw new Error(`Stripe balance ${balanceRes.status}: ${errBody.slice(0, 200)}`);
    }
    const balance = await balanceRes.json();
    const sumEur = (arr: { amount: number; currency: string }[] | undefined) =>
      (arr || [])
        .filter((b) => b.currency === "eur")
        .reduce((s, b) => s + b.amount / 100, 0);
    // Both `available` and `pending` are funds Stripe is holding for us
    // that haven't reached the bank yet — treat them as one "upcoming"
    // bucket from Nigel's perspective.
    stripeUpcomingPayout = sumEur(balance.available) + sumEur(balance.pending);
  } catch (err) {
    console.error("[admin] Stripe balance fetch error:", err);
    sourceErrors.push({
      source: "Stripe Balance (Upcoming Payout)",
      message: err instanceof Error ? err.message : "Unknown error fetching balance",
    });
  }

  // Cross-reference: a Calendly Installation row carries amount "—" because
  // Calendly doesn't know the price — the customer paid Stripe, not Calendly.
  // The matching Stripe Paid Order has the real amount. Copy it across so
  // the expanded-card "Payment" field autofills with what they actually paid,
  // rather than the placeholder em-dash. Match by email (lowercased, since
  // Stripe sometimes lowercases the input). If multiple Stripe orders exist
  // for the same email, take the highest amount (defensive — a customer who
  // bought twice has two valid amounts; the bigger one is the install we care
  // about). The same logic was previously only run client-side for the
  // "Upcoming" list, leaving the expanded detail view showing "—".
  const paidByEmail = new Map<string, { eur: number; formatted: string }>();
  for (const l of leads) {
    if (l.type !== "Paid Order") continue;
    const emailKey = (l.email || "").trim().toLowerCase();
    if (!emailKey || emailKey === "—") continue;
    const eur = parseFloat(String(l.amount).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(eur) || eur <= 0) continue;
    const prev = paidByEmail.get(emailKey);
    if (!prev || eur > prev.eur) paidByEmail.set(emailKey, { eur, formatted: l.amount });
  }
  for (const l of leads) {
    if (l.type !== "Installation") continue;
    if (l.amount !== "—") continue;
    const emailKey = (l.email || "").trim().toLowerCase();
    const match = paidByEmail.get(emailKey);
    if (match) {
      // Only copy the amount across — do NOT overwrite l.status.
      // The "Upcoming" view in page.tsx filters by `status === "Upcoming"`,
      // so flipping to "Paid" hides the booking from that view (which is
      // wrong: it's still an upcoming installation that happens to have a
      // known payment amount). Keep status as-is, autofill the amount only.
      l.amount = match.formatted;
    }
  }

  return NextResponse.json(
    {
      leads,
      count: leads.length,
      generated: new Date().toISOString(),
      stripeUpcomingPayout,
      sourceErrors: sourceErrors.length ? sourceErrors : undefined,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
