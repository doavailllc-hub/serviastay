import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

import CalendarMonth from "./CalendarMonth";
import {
  addDaysISO,
  formatCalendarHeader,
  formatCalendarInput,
  toLocalISO,
} from "../../utils/resortUtils";
import { MS_PER_DAY } from "../../constants/resortConstants";

export default function AirbnbDatePicker({
  checkin,
  checkout,
  setCheckin,
  setCheckout,
  today,
  bookedRanges = [],
}) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState("checkin");
  const [viewDate, setViewDate] = useState(
    new Date(`${checkin || today}T00:00:00`)
  );

  const pickerRef = useRef(null);

  useEffect(() => {
    const closePicker = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeWithEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closePicker);
    document.addEventListener("keydown", closeWithEscape);

    return () => {
      document.removeEventListener("mousedown", closePicker);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  useEffect(() => {
    if (!open || !checkin) return;

    const selectedDate = new Date(`${checkin}T00:00:00`);

    setViewDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    );
  }, [open, checkin]);

  const nights = useMemo(() => {
    if (!checkin || !checkout) return 1;

    const checkinDate = new Date(`${checkin}T00:00:00`);
    const checkoutDate = new Date(`${checkout}T00:00:00`);

    return Math.max(
      1,
      Math.round((checkoutDate - checkinDate) / MS_PER_DAY)
    );
  }, [checkin, checkout]);

  const isDateBooked = (iso) =>
    bookedRanges.some((range) => {
      const start = String(range.checkin || "").slice(0, 10);
      const end = String(range.checkout || "").slice(0, 10);

      return start && end && iso >= start && iso < end;
    });

  const hasBookedDateInRange = (startIso, endIso) => {
    if (!startIso || !endIso) return false;

    const current = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);

    while (current < end) {
      const iso = toLocalISO(current);

      if (isDateBooked(iso)) {
        return true;
      }

      current.setDate(current.getDate() + 1);
    }

    return false;
  };

  const handleDateClick = (date) => {
    const iso = toLocalISO(date);

    if (iso < today || isDateBooked(iso)) return;

    if (selecting === "checkin") {
      const nextCheckout = addDaysISO(iso, 1);
      const existingCheckoutIsValid =
        checkout &&
        checkout > iso &&
        !hasBookedDateInRange(iso, checkout);

      setCheckin(iso);
      setCheckout(existingCheckoutIsValid ? checkout : nextCheckout);
      setSelecting("checkout");

      return;
    }

    if (!checkin || iso <= checkin) {
      setCheckin(iso);
      setCheckout(addDaysISO(iso, 1));
      setSelecting("checkout");

      return;
    }

    if (hasBookedDateInRange(checkin, iso)) {
      toast.error("Selected range includes unavailable dates.");
      return;
    }

    setCheckout(iso);
    setSelecting("checkin");
  };

  const clearDates = () => {
    setCheckin(today);
    setCheckout(addDaysISO(today, 1));
    setSelecting("checkin");

    const currentDate = new Date(`${today}T00:00:00`);

    setViewDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    );
  };

  const previousMonth = () => {
    setViewDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setViewDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  };

  const todayDate = new Date(`${today}T00:00:00`);

  const isCurrentMonth =
    viewDate.getFullYear() === todayDate.getFullYear() &&
    viewDate.getMonth() === todayDate.getMonth();

  const openPicker = (type) => {
    setSelecting(type);
    setOpen(true);
  };

  return (
    <div ref={pickerRef} className="relative">
      <div className="grid grid-cols-2 overflow-hidden border-b border-gray-200">
        <DateButton
          label="Check-in"
          value={formatCalendarInput(checkin)}
          active={open && selecting === "checkin"}
          onClick={() => openPicker("checkin")}
        />

        <DateButton
          label="Checkout"
          value={formatCalendarInput(checkout)}
          active={open && selecting === "checkout"}
          onClick={() => openPicker("checkout")}
          bordered
        />
      </div>

      {open && (
        <div
          className="
            absolute right-0 top-[68px] z-[999]
            w-[calc(100vw-24px)] max-w-[760px]
            overflow-hidden rounded-2xl
            border border-gray-200 bg-white
            shadow-[0_18px_55px_rgba(0,0,0,0.16)]
          "
          role="dialog"
          aria-modal="true"
          aria-label="Select check-in and check-out dates"
        >
          <div className="flex min-h-[72px] items-center justify-between border-b border-gray-200 px-4 sm:px-6">
            <button
              type="button"
              disabled={isCurrentMonth}
              onClick={previousMonth}
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-full text-gray-900 transition
                hover:bg-gray-100
                disabled:cursor-not-allowed disabled:opacity-25
              "
              aria-label="Previous month"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>

            <div className="min-w-0 px-3 text-center">
              <h3 className="truncate text-[15px] font-semibold text-gray-900 sm:text-base">
                Select check-in and check-out dates
              </h3>

              <p className="mt-0.5 hidden text-xs text-gray-500 sm:block">
                {nights} {nights === 1 ? "night" : "nights"} ·{" "}
                {formatCalendarHeader(checkin)} –{" "}
                {formatCalendarHeader(checkout)}
              </p>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-full text-gray-900 transition
                hover:bg-gray-100
              "
              aria-label="Next month"
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 items-start md:grid-cols-2 md:gap-12">
              <div className="min-w-0">
                <CalendarMonth
                  date={viewDate}
                  checkin={checkin}
                  checkout={checkout}
                  today={today}
                  onDateClick={handleDateClick}
                  bookedRanges={bookedRanges}
                />
              </div>

              <div className="hidden min-w-0 md:block">
                <CalendarMonth
                  date={
                    new Date(
                      viewDate.getFullYear(),
                      viewDate.getMonth() + 1,
                      1
                    )
                  }
                  checkin={checkin}
                  checkout={checkout}
                  today={today}
                  onDateClick={handleDateClick}
                  bookedRanges={bookedRanges}
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-[80px] items-center justify-between border-t border-gray-200 px-4 sm:px-6">
            <button
              type="button"
              onClick={clearDates}
              className="
                rounded-lg px-1 py-2
                text-sm font-medium text-[#3b71e6]
                transition hover:text-[#2f5fc2] hover:underline
              "
            >
              Clear dates
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="
                inline-flex h-11 items-center justify-center
                rounded-full bg-[#3b71e6] px-6
                text-sm font-semibold text-white
                transition hover:bg-[#2f5fc2]
                focus:outline-none focus:ring-2
                focus:ring-[#3b71e6]/30 focus:ring-offset-2
              "
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateButton({ label, value, active, onClick, bordered = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        min-w-0 px-4 py-3 text-left transition
        hover:bg-gray-50
        ${bordered ? "border-l border-gray-200" : ""}
        ${active ? "bg-[#eef4ff]" : "bg-white"}
      `}
    >
      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
        {label}
      </span>

      <span className="mt-1 block truncate text-sm font-medium text-gray-950">
        {value}
      </span>
    </button>
  );
}