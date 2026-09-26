"use client";

/**
 * Two orderings of the diary, because two different questions get asked of it.
 *
 * "Upcoming" is where Nigel has to be, soonest first. "Just booked" is who
 * came in most recently, whenever their job happens to be, which is the one
 * you want when somebody rings up about an order they placed this morning.
 *
 * The toggle is client side and the data for both is rendered by the server,
 * so switching costs nothing and neither list refetches.
 */
import { useState } from "react";
import { CalendarClock, UserRound } from "lucide-react";

export interface Row {
  key: string;
  name: string;
  standIn: boolean;
  product: string;
  when: string;
  slot: string;
  amount: string;
}

function List({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <CalendarClock className="mx-auto h-5 w-5 text-slate-300" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-slate-700">{empty}</p>
        <p className="mt-1 text-xs text-slate-500">Bookings appear here the moment they are made.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={r.key} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-slate-900">{r.name}</span>
              {r.standIn && (
                /* Say why it looks like this. "Unnamed" told Nigel nothing and
                   read like a bug; this says the order had no name on it and
                   that what he is looking at came from somewhere else. */
                <span
                  title="No name on the order. Shown from the email or address instead."
                  className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-50 px-1 py-px text-[10px] font-medium text-amber-700"
                >
                  <UserRound className="h-2.5 w-2.5" aria-hidden="true" />
                  no name
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-slate-500">{r.product}</span>
          </span>
          <span className="ml-auto shrink-0 text-right">
            <span className="block text-xs tabular-nums text-slate-700">{r.when}</span>
            {r.slot && <span className="block text-xs text-slate-500">{r.slot}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DiaryToggle({ upcoming, justBooked }: { upcoming: Row[]; justBooked: Row[] }) {
  const [tab, setTab] = useState<"upcoming" | "booked">("upcoming");

  const btn = (id: "upcoming" | "booked", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`min-h-[44px] rounded-md px-3 text-xs font-medium sm:min-h-[30px] sm:px-2.5 ${
        tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {btn("upcoming", "Upcoming")}
        {btn("booked", "Just booked")}
      </div>
      {tab === "upcoming" ? (
        <List rows={upcoming} empty="Nothing booked ahead." />
      ) : (
        <List rows={justBooked} empty="No bookings yet." />
      )}
    </div>
  );
}
