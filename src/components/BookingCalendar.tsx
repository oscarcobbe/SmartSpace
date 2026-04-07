"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, Timer } from "lucide-react";
import { useCart } from "@/context/CartContext";

const AVAILABLE_DAYS = [1, 3, 4]; // Mon, Wed, Thu
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TimeSlot {
  label: string;
  value: string;
}

interface BookingCalendarProps {
  onSelectionChange?: (selection: { date: string; timeSlot: string; dateLabel: string; slotLabel: string } | null) => void;
  compact?: boolean;
}

function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 7; i <= 49; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    if (AVAILABLE_DAYS.includes(date.getDay())) {
      dates.push(date);
    }
  }
  return dates;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function BookingCalendar({ onSelectionChange, compact }: BookingCalendarProps) {
  const { cart } = useCart();
  const [availableDates] = useState(getAvailableDates);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reservationError, setReservationError] = useState<string>("");
  const [reservationExpiry, setReservationExpiry] = useState<number>(0);
  const [page, setPage] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const datesPerPage = compact ? 6 : 9;
  const totalPages = Math.ceil(availableDates.length / datesPerPage);
  const visibleDates = availableDates.slice(page * datesPerPage, (page + 1) * datesPerPage);

  // Countdown timer for reservation
  useEffect(() => {
    if (reservationExpiry <= 0) return;
    timerRef.current = setInterval(() => {
      setReservationExpiry((prev) => {
        if (prev <= 1) {
          // Reservation expired
          setSelectedSlot("");
          setReservationError("Your reservation has expired. Please select a new time.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reservationExpiry > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setReservationError("");
    try {
      const res = await fetch(`/api/calendar/availability?date=${date}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const reserveSelectedSlot = useCallback(async (date: string, slot: string) => {
    const cartId = cart?.id || "anonymous";
    setReserving(true);
    setReservationError("");

    try {
      const res = await fetch("/api/calendar/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, timeSlot: slot, cartId }),
      });
      const data = await res.json();

      if (!data.reserved) {
        setReservationError(data.error || "This slot is no longer available.");
        setSelectedSlot("");
        // Refresh slots to show updated availability
        fetchSlots(date);
        return false;
      }

      setReservationExpiry(data.expiresIn || 1200);
      return true;
    } catch {
      setReservationError("Failed to reserve slot. Please try again.");
      return false;
    } finally {
      setReserving(false);
    }
  }, [cart?.id, fetchSlots]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
      setSelectedSlot("");
      setReservationExpiry(0);
      setReservationError("");
    }
  }, [selectedDate, fetchSlots]);

  // When slot is selected, try to reserve it
  const handleSlotSelect = async (slotValue: string) => {
    setSelectedSlot(slotValue);
    const success = await reserveSelectedSlot(selectedDate, slotValue);
    if (!success) return;
  };

  useEffect(() => {
    if (selectedDate && selectedSlot && reservationExpiry > 0) {
      const dateObj = availableDates.find((d) => formatDateISO(d) === selectedDate);
      const slotObj = slots.find((s) => s.value === selectedSlot);
      if (dateObj && slotObj) {
        onSelectionChange?.({
          date: selectedDate,
          timeSlot: selectedSlot,
          dateLabel: `${DAY_NAMES[dateObj.getDay()]} ${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]}`,
          slotLabel: slotObj.label,
        });
      }
    } else {
      onSelectionChange?.(null);
    }
  }, [selectedDate, selectedSlot, reservationExpiry, availableDates, slots, onSelectionChange]);

  const minutesLeft = Math.ceil(reservationExpiry / 60);

  return (
    <div className="border border-gray-200 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-brand-500" />
        <h3 className="text-sm font-bold text-gray-900">Choose an Installation Date</h3>
      </div>

      {/* Error message */}
      {reservationError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{reservationError}</p>
        </div>
      )}

      {/* Date grid */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-xs font-medium text-gray-500">
            {visibleDates.length > 0 &&
              `${MONTH_NAMES[visibleDates[0].getMonth()]} ${visibleDates[0].getDate()} – ${MONTH_NAMES[visibleDates[visibleDates.length - 1].getMonth()]} ${visibleDates[visibleDates.length - 1].getDate()}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-3"} gap-2`}>
          {visibleDates.map((date) => {
            const iso = formatDateISO(date);
            const isSelected = selectedDate === iso;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`text-[10px] font-semibold uppercase tracking-wider ${isSelected ? "text-brand-500" : "text-gray-400"}`}>
                  {DAY_NAMES[date.getDay()]}
                </div>
                <div className={`text-sm font-bold ${isSelected ? "text-brand-500" : "text-gray-900"}`}>
                  {date.getDate()} {MONTH_NAMES[date.getMonth()]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-bold text-gray-900">Select a Time</span>
          </div>

          {loadingSlots ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No slots available on this date</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.value;
                return (
                  <button
                    key={slot.value}
                    onClick={() => handleSlotSelect(slot.value)}
                    disabled={reserving}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    } disabled:opacity-50`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? "text-brand-500" : "text-gray-700"}`}>
                      {reserving && selectedSlot === slot.value ? "Reserving..." : slot.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reservation confirmation with countdown */}
      {selectedDate && selectedSlot && reservationExpiry > 0 && (
        <div className="mt-4 p-3 bg-brand-50 rounded-xl border border-brand-100">
          <div className="flex items-start gap-2">
            <Timer className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-brand-600">
                Installation: {availableDates.find((d) => formatDateISO(d) === selectedDate) &&
                  `${DAY_NAMES[availableDates.find((d) => formatDateISO(d) === selectedDate)!.getDay()]} ${availableDates.find((d) => formatDateISO(d) === selectedDate)!.getDate()} ${MONTH_NAMES[availableDates.find((d) => formatDateISO(d) === selectedDate)!.getMonth()]}`}{" "}
                at {slots.find((s) => s.value === selectedSlot)?.label}
              </p>
              <p className="text-[10px] text-brand-500 mt-1">
                Reserved for {minutesLeft} min — complete checkout to confirm
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
