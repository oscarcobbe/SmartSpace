"use client";

import { useState } from "react";
import Link from "next/link";
import BookingCalendar from "@/components/BookingCalendar";

type Mode = "reschedule" | "cancel" | null;
type Selection = { date: string; timeSlot: string; dateLabel: string; slotLabel: string } | null;

export default function ManageBooking({ bookingRef, token, kind, initial }: { bookingRef: string; token: string; kind: "consultation" | "installation"; initial: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [selection, setSelection] = useState<Selection>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | { kind: "moved"; label: string } | { kind: "cancelled" }>(null);

  async function send(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/booking/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: bookingRef, t: token, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again, or ring us.");
        return false;
      }
      return true;
    } catch {
      setError("We couldn't reach the site. Please check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (done?.kind === "cancelled") {
    return (
      <div className="bg-white rounded-2xl border border-[#e6e3df] p-6">
        <h2 className="text-xl font-extrabold text-[#1C1A18] mb-2">Your booking is cancelled</h2>
        <p className="text-[#3a352f] mb-4">We&apos;ve emailed you to confirm. If you&apos;d like another time, you can book again whenever suits.</p>
        <Link href={kind === "consultation" ? "/services/free-consultation" : "/services"} className="inline-flex items-center justify-center bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full">
          Book another time
        </Link>
      </div>
    );
  }
  if (done?.kind === "moved") {
    return (
      <div className="bg-white rounded-2xl border border-[#e6e3df] p-6">
        <h2 className="text-xl font-extrabold text-[#1C1A18] mb-2">All set</h2>
        <p className="text-[#3a352f]">Your booking is now {done.label}. We&apos;ve emailed you the new time.</p>
      </div>
    );
  }

  return (
    <div>
      {mode === null && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setMode("reschedule")} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-3 rounded-full">
            Choose a new time
          </button>
          <button onClick={() => setMode("cancel")} className="bg-white border border-[#d6d2cc] text-[#1C1A18] font-semibold text-sm px-6 py-3 rounded-full">
            Cancel this booking
          </button>
        </div>
      )}

      {mode === "reschedule" && (
        <div>
          <BookingCalendar
            heading="Choose a new time"
            confirmLabel="New time"
            kind={kind}
            leadDays={2}
            onSelectionChange={setSelection}
          />
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              disabled={!selection || busy}
              onClick={async () => {
                if (!selection) return;
                if (await send({ action: "reschedule", date: selection.date, timeSlot: selection.timeSlot })) {
                  setDone({ kind: "moved", label: `${selection.dateLabel}, ${selection.slotLabel}` });
                }
              }}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-full"
            >
              {busy ? "Moving your booking…" : "Move my booking to this time"}
            </button>
            <button onClick={() => { setMode(null); setError(""); }} className="text-[#3a352f] font-semibold text-sm px-6 py-3">
              Back
            </button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="bg-white rounded-2xl border border-[#e6e3df] p-6">
          <h2 className="text-lg font-extrabold text-[#1C1A18] mb-2">Cancel this booking?</h2>
          <p className="text-[#3a352f] mb-5">We&apos;ll take it out of the calendar and email you to confirm.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={busy}
              onClick={async () => {
                if (await send({ action: "cancel" })) setDone({ kind: "cancelled" });
              }}
              className="bg-[#1C1A18] disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-full"
            >
              {busy ? "Cancelling…" : "Yes, cancel it"}
            </button>
            <button onClick={() => { setMode(null); setError(""); }} className="bg-white border border-[#d6d2cc] text-[#1C1A18] font-semibold text-sm px-6 py-3 rounded-full">
              Keep my booking
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
