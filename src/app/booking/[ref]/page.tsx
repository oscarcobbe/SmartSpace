/**
 * Where the Reschedule and Cancel links in a booking confirmation land: the
 * page Calendly hosted, now on this site. Only a link with the right token
 * opens a booking (src/lib/booking/engine.ts); anything else gets the same
 * plain "nothing here" so a guessed reference says nothing.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { bookingByRef, tokenMatches } from "@/lib/booking/engine";
import { dateLabel, timeLabel } from "@/lib/booking/notify";
import { BUSINESS_PHONE_DISPLAY, BUSINESS_PHONE_E164 } from "@/lib/business-constants";
import ManageBooking from "./ManageBooking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking | Smart Space", robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[70vh] bg-[#faf8f5] px-4 pt-36 pb-20">
      <div className="max-w-xl mx-auto">{children}</div>
    </main>
  );
}

function Nothing({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold text-[#1C1A18] mb-3">{title}</h1>
      <p className="text-[#3a352f] mb-6">{body}</p>
      <p className="text-[#3a352f]">
        Ring us on <a className="font-semibold text-brand-600" href={`tel:${BUSINESS_PHONE_E164}`}>{BUSINESS_PHONE_DISPLAY}</a> or{" "}
        <Link className="font-semibold text-brand-600" href="/services">book a new time</Link>.
      </p>
    </Shell>
  );
}

export default async function BookingPage({ params, searchParams }: { params: { ref: string }; searchParams: { t?: string; do?: string } }) {
  const ref = params.ref;
  const t = typeof searchParams.t === "string" ? searchParams.t : "";
  let ok = false;
  try {
    ok = tokenMatches(ref, t);
  } catch {
    ok = false;
  }
  if (!ok) return <Nothing title="We can't find that booking" body="The link may be incomplete. Use the Reschedule or Cancel link in your confirmation email." />;

  let booking;
  try {
    booking = await bookingByRef(ref);
  } catch {
    return <Nothing title="We couldn't load your booking" body="The calendar didn't answer just now. Please try again in a minute." />;
  }
  if (!booking || booking.site !== "ss") return <Nothing title="This booking has been cancelled" body="There's nothing booked under this link any more." />;

  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-600 mb-2">Your booking</p>
      <h1 className="text-3xl font-extrabold text-[#1C1A18] tracking-tight mb-6">{booking.title}</h1>
      <div className="bg-white rounded-2xl border border-[#e6e3df] p-5 mb-8">
        <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-[15px]">
          <dt className="text-[#7a7975]">Date</dt>
          <dd className="font-semibold text-[#1C1A18]">{dateLabel(booking.start)}</dd>
          <dt className="text-[#7a7975]">Time</dt>
          <dd className="font-semibold text-[#1C1A18]">{timeLabel(booking.start, booking.end)}</dd>
          <dt className="text-[#7a7975]">Where</dt>
          <dd className="font-semibold text-[#1C1A18]">{booking.address ? `Your home, ${booking.address}` : "Your home"}</dd>
        </dl>
      </div>
      <ManageBooking bookingRef={ref} token={t} kind={booking.kind} initial={searchParams.do === "cancel" ? "cancel" : searchParams.do === "reschedule" ? "reschedule" : null} />
    </Shell>
  );
}
