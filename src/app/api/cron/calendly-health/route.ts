import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAvailableSlots, AVAILABLE_DAYS } from "@/lib/calendly";

export const dynamic = "force-dynamic";

/**
 * Daily Calendly availability sanity check.
 *
 * Why this exists: a revoked or expired CALENDLY_PERSONAL_TOKEN causes
 * /api/calendar/availability to silently return [] for every date — the
 * booking page just shows "no slots available" forever and customers
 * bounce. There's no client-side or server-side error surfaced. This
 * cron checks the next 7 weekdays and emails Nigel if every single one
 * comes back empty (the unambiguous signal of token failure or Calendly
 * outage).
 *
 * Triggered by Vercel cron (registered in /vercel.json) once daily.
 * Auth is the same `CRON_SECRET` Bearer header used by the other cron
 * routes; anything else gets 401.
 */

function nextWeekdays(count: number): Date[] {
  const out: Date[] = [];
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  while (out.length < count) {
    cur.setDate(cur.getDate() + 1);
    if (AVAILABLE_DAYS.includes(cur.getDay())) {
      out.push(new Date(cur));
    }
  }
  return out;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkDates = nextWeekdays(7);
  const results: { date: string; slots: number }[] = [];

  // Check both event types — the booking page can fail if either token
  // path is broken even if the other is fine.
  for (const d of checkDates) {
    try {
      // Default to consultation flow — that's what /booking exposes.
      const slots = await getAvailableSlots(fmtDate(d), "consultation");
      results.push({ date: fmtDate(d), slots: slots.length });
    } catch (err) {
      console.error("[cron/calendly-health] getAvailableSlots threw:", err);
      results.push({ date: fmtDate(d), slots: -1 });
    }
  }

  const totalSlots = results.reduce((sum, r) => sum + Math.max(r.slots, 0), 0);
  const errored = results.filter((r) => r.slots === -1).length;
  const empty = results.filter((r) => r.slots === 0).length;

  // Healthy = at least one date in the next 7 has slots. Fail = either
  // every date is empty (token revoked, no event types, or Nigel manually
  // blocked everything in Calendly), or every date errored (network /
  // API failure).
  const isHealthy = totalSlots > 0 && errored < checkDates.length;

  if (isHealthy) {
    return NextResponse.json({
      ok: true,
      totalSlots,
      results,
      checked: checkDates.length,
    });
  }

  // Send Nigel an alert
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL ?? "nigel@smart-space.ie";
  if (resendKey && resendFrom) {
    try {
      const resend = new Resend(resendKey);
      const reason =
        errored === checkDates.length
          ? "Every Calendly availability check ERRORED. Most likely cause: the CALENDLY_PERSONAL_TOKEN env var has been revoked, the Calendly account password was changed, or 2FA was reset."
          : `All ${empty} of the next ${checkDates.length} weekdays show ZERO available slots. Most likely causes: every slot is genuinely booked (unusual), or all Calendly event types have been disabled / the working hours block the Available Days, or the CALENDLY_*_EVENT_TYPE_URI env vars point to deleted event types.`;
      await resend.emails.send({
        from: resendFrom,
        to: [to],
        subject: "[Smart Space] ⚠️ Booking calendar may be broken",
        text: [
          "The daily Calendly health check failed.",
          "",
          reason,
          "",
          "Detail (next 7 weekdays):",
          ...results.map((r) => `  ${r.date}: ${r.slots === -1 ? "ERROR" : r.slots + " slots"}`),
          "",
          "What to do:",
          "1. Open https://calendly.com/event_types and confirm the consultation + installation event types still exist and are active.",
          "2. Open Calendly account settings → Integrations → API and reissue the personal access token if needed.",
          "3. Update CALENDLY_PERSONAL_TOKEN in Vercel env vars and redeploy.",
          "4. Manually check the live booking page at https://smart-space.ie/booking — if slots are visible there, the cron alarm is a false positive (logs at https://vercel.com/oscar-5316s-projects/smart-space).",
        ].join("\n"),
        html: `
          <h2 style="color:#b91c1c">⚠️ Booking calendar may be broken</h2>
          <p>The daily Calendly health check failed.</p>
          <p><strong>Reason:</strong> ${reason.replace(/</g, "&lt;").replace(/&/g, "&amp;")}</p>
          <h3>Next 7 weekdays</h3>
          <ul>${results.map((r) => `<li>${r.date}: ${r.slots === -1 ? "<strong>ERROR</strong>" : r.slots + " slots"}</li>`).join("")}</ul>
          <h3>What to do</h3>
          <ol>
            <li>Confirm Calendly event types still exist + are active.</li>
            <li>Reissue the personal access token in Calendly if needed.</li>
            <li>Update <code>CALENDLY_PERSONAL_TOKEN</code> in Vercel env vars and redeploy.</li>
            <li>Sanity-check the live booking page at <a href="https://smart-space.ie/booking">smart-space.ie/booking</a>.</li>
          </ol>
        `,
      });
    } catch (err) {
      console.error("[cron/calendly-health] alert email failed:", err);
    }
  }

  return NextResponse.json({
    ok: false,
    totalSlots,
    errored,
    empty,
    results,
    checked: checkDates.length,
    emailed: !!(resendKey && resendFrom),
  });
}
