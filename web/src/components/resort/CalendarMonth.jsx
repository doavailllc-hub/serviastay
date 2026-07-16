import { toLocalISO } from "../../utils/resortUtils";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarMonth({
  date,
  checkin,
  checkout,
  today,
  onDateClick,
  bookedRanges = [],
}) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthName = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const blanks = Array.from({ length: startDay });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDateBooked = (iso) => {
    return bookedRanges.some((range) => {
      const start = String(range.checkin).slice(0, 10);
      const end = String(range.checkout).slice(0, 10);

      return iso >= start && iso < end;
    });
  };

  return (
    <div className="mx-auto w-[322px]">
      {/* Month */}
      <h4 className="mb-6 text-center text-lg font-semibold tracking-tight text-gray-900">
        {monthName}
      </h4>

      {/* Weekdays */}
      <div className="mb-3 grid grid-cols-7 justify-items-center">
        {WEEK_DAYS.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="flex h-10 w-10 items-center justify-center text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 justify-items-center gap-y-2">
        {blanks.map((_, index) => (
          <div
            key={`blank-${index}`}
            className="h-10 w-10"
          />
        ))}

        {days.map((day) => {
          const currentDate = new Date(year, month, day);
          const iso = toLocalISO(currentDate);

          const booked = isDateBooked(iso);
          const disabled = iso < today || booked;

          const isStart = iso === checkin;
          const isEnd = iso === checkout;
          const inRange =
            checkin &&
            checkout &&
            iso > checkin &&
            iso < checkout;

          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onDateClick(currentDate)}
              title={booked ? "Unavailable" : ""}
              className={`
                relative flex h-10 w-10 items-center justify-center
                rounded-full text-sm font-medium
                transition-all duration-150
                ${
                  disabled
                    ? "cursor-not-allowed text-gray-300"
                    : "hover:scale-105 hover:bg-gray-100"
                }
                ${inRange && !booked ? "bg-[#eef4ff]" : ""}
              `}
            >
              <span
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  ${
                    isStart || isEnd
                      ? "bg-[#3b71e6] text-white shadow-md"
                      : ""
                  }
                  ${
                    isToday && !isStart && !isEnd
                      ? "border-2 border-[#3b71e6]"
                      : ""
                  }
                  ${booked ? "line-through" : ""}
                `}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}