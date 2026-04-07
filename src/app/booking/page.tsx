"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, CheckCircle, ArrowLeft, User, Mail } from "lucide-react";

interface ContactData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const TIME_SLOTS = [
  { label: "10:30 – 12:30", value: "10:30-12:30" },
  { label: "12:30 – 14:30", value: "12:30-14:30" },
  { label: "14:30 – 16:30", value: "14:30-16:30" },
];

// Available days: Monday (1), Wednesday (3), Thursday (4)
const AVAILABLE_DAYS = [1, 3, 4];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 28; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    if (AVAILABLE_DAYS.includes(date.getDay())) {
      dates.push(date);
    }
  }
  return dates;
}

function formatDateShort(date: Date): string {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function BookingPage() {
  const router = useRouter();
  const [contact, setContact] = useState<ContactData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const availableDates = getAvailableDates();

  useEffect(() => {
    const stored = sessionStorage.getItem("bookingContact");
    if (!stored) {
      router.push("/contact");
      return;
    }
    setContact(JSON.parse(stored));
  }, [router]);

  const handleConfirm = async () => {
    if (!contact || !selectedDate || !selectedSlot) return;
    setSubmitting(true);

    try {
      await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contact,
          date: selectedDate,
          timeSlot: selectedSlot,
        }),
      });
      sessionStorage.removeItem("bookingContact");
      setConfirmed(true);
    } catch (err) {
      console.error("Booking failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!contact) {
    return (
      <div className="pt-40 flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="bg-green-50 rounded-2xl p-10">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-5" />
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-2">
              Thanks, <span className="font-semibold">{contact.name}</span>. Your installation is confirmed for:
            </p>
            <div className="bg-white rounded-xl p-4 my-4 border border-green-200">
              <div className="flex items-center justify-center gap-2 text-lg font-bold text-gray-900">
                <Calendar className="w-5 h-5 text-brand-500" />
                {availableDates.find((d) => formatDateISO(d) === selectedDate)
                  ? formatDateShort(availableDates.find((d) => formatDateISO(d) === selectedDate)!)
                  : selectedDate}
              </div>
              <div className="flex items-center justify-center gap-2 text-brand-500 font-semibold mt-1">
                <Clock className="w-4 h-4" />
                {TIME_SLOTS.find((s) => s.value === selectedSlot)?.label}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              We&apos;ll send a confirmation to <span className="font-medium">{contact.email}</span>.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Edit details
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Choose a Time
          </h1>
          <p className="text-gray-500">
            Select a convenient date and time for your installation.
          </p>
        </div>

        {/* Contact summary */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-brand-500" />
            <span className="font-medium">{contact.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-brand-500" />
            <span>{contact.email}</span>
          </div>
        </div>

        {/* Date selection */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <Calendar className="w-5 h-5 inline-block mr-2 text-brand-500" />
            Select a Date
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableDates.map((date) => {
              const iso = formatDateISO(date);
              const isSelected = selectedDate === iso;
              return (
                <button
                  key={iso}
                  onClick={() => { setSelectedDate(iso); setSelectedSlot(""); }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isSelected ? "text-brand-500" : "text-gray-400"}`}>
                    {DAY_NAMES[date.getDay()]}
                  </div>
                  <div className={`text-lg font-bold ${isSelected ? "text-brand-500" : "text-gray-900"}`}>
                    {date.getDate()} {MONTH_NAMES[date.getMonth()]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slot selection */}
        {selectedDate && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              <Clock className="w-5 h-5 inline-block mr-2 text-brand-500" />
              Select a Time Slot
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.value;
                return (
                  <button
                    key={slot.value}
                    onClick={() => setSelectedSlot(slot.value)}
                    className={`p-5 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <Clock className={`w-5 h-5 mx-auto mb-2 ${isSelected ? "text-brand-500" : "text-gray-400"}`} />
                    <div className={`text-base font-bold ${isSelected ? "text-brand-500" : "text-gray-900"}`}>
                      {slot.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm button */}
        {selectedDate && selectedSlot && (
          <div className="sticky bottom-6 z-10">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                <span className="font-bold text-gray-900">
                  {formatDateShort(availableDates.find((d) => formatDateISO(d) === selectedDate)!)}
                </span>
                {" at "}
                <span className="font-bold text-brand-500">
                  {TIME_SLOTS.find((s) => s.value === selectedSlot)?.label}
                </span>
              </div>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-4 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-60"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
