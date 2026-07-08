import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Keyboard } from "lucide-react";

import CalendarMonth from "./CalendarMonth";
import {
  addDaysISO,
  formatCalendarHeader,
  formatCalendarInput,
  formatShortInput,
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
    function closePicker(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${checkout}T00:00:00`) -
        new Date(`${checkin}T00:00:00`)) /
        MS_PER_DAY
    )
  );

  const isDateBooked = (iso) => {
    return bookedRanges.some((range) => {
      const start = String(range.checkin).slice(0, 10);
      const end = String(range.checkout).slice(0, 10);
      return iso >= start && iso < end;
    });
  };

  const hasBookedDateInRange = (startIso, endIso) => {
    let current = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);

    while (current < end) {
      const iso = toLocalISO(current);
      if (isDateBooked(iso)) return true;
      current.setDate(current.getDate() + 1);
    }

    return false;
  };

  const handleDateClick = (date) => {
    const iso = toLocalISO(date);

    if (iso < today || isDateBooked(iso)) return;

    if (selecting === "checkin") {
      const nextCheckout = addDaysISO(iso, 1);

      setCheckin(iso);
      setCheckout(
        !checkout || checkout <= iso || hasBookedDateInRange(iso, checkout)
          ? nextCheckout
          : checkout
      );

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
    setOpen(false);
    setSelecting("checkin");
  };

  const clearDates = () => {
    setCheckin(today);
    setCheckout(addDaysISO(today, 1));
    setSelecting("checkin");
  };

  const todayDate = new Date(`${today}T00:00:00`);
  const isCurrentMonth =
    viewDate.getFullYear() === todayDate.getFullYear() &&
    viewDate.getMonth() === todayDate.getMonth();

  return (
    <div ref={pickerRef} className="relative">
      <div className="grid grid-cols-2 border-b border-gray-200">
        <DateButton
          label="Check-in"
          value={formatCalendarInput(checkin)}
          active={selecting === "checkin" && open}
          onClick={() => {
            setOpen(true);
            setSelecting("checkin");
          }}
        />

        <DateButton
          label="Checkout"
          value={formatCalendarInput(checkout)}
          active={selecting === "checkout" && open}
          onClick={() => {
            setOpen(true);
            setSelecting("checkout");
          }}
          bordered
        />
      </div>

      {open && (
        <div className="absolute right-0 top-[66px] z-[999] w-[calc(100vw-32px)] max-w-[700px] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-semibold">
                {nights} {nights === 1 ? "night" : "nights"}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {formatCalendarHeader(checkin)} -{" "}
                {formatCalendarHeader(checkout)}
              </p>
            </div>

            <div className="flex gap-2">
              <CalendarTopBox
                label="Check-in"
                value={formatShortInput(checkin)}
                active={selecting === "checkin"}
                onClick={() => setSelecting("checkin")}
              />

              <CalendarTopBox
                label="Checkout"
                value={formatShortInput(checkout)}
                active={selecting === "checkout"}
                onClick={() => setSelecting("checkout")}
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              disabled={isCurrentMonth}
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                )
              }
              className="rounded-full p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous month"
            >
              <ChevronLeft size={19} />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                )
              }
              className="rounded-full p-2 transition hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight size={19} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <CalendarMonth
              date={viewDate}
              checkin={checkin}
              checkout={checkout}
              today={today}
              onDateClick={handleDateClick}
              bookedRanges={bookedRanges}
            />

            <div className="hidden md:block">
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

          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="Keyboard date input"
            >
              <Keyboard size={19} />
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearDates}
                className="text-sm font-medium text-[#3b71e6] hover:underline"
              >
                Clear dates
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DateButton({ label, value, active, onClick, bordered }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-left transition hover:bg-gray-50 ${
        bordered ? "border-l border-gray-200" : ""
      } ${active ? "bg-[#eef4ff]" : ""}`}
    >
      <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <span className="mt-1 block text-sm font-medium text-gray-950">
        {value}
      </span>
    </button>
  );
}

function CalendarTopBox({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-32 rounded-xl border px-3 py-2.5 text-left transition md:w-36 ${
        active ? "border-[#3b71e6] bg-[#eef4ff]" : "border-gray-200"
      }`}
    >
      <span className="block text-[11px] font-medium uppercase text-gray-500">
        {label}
      </span>

      <span className="mt-1 block text-sm">{value}</span>
    </button>
  );
}