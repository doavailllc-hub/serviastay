import { toLocalISO } from "../../utils/resortUtils";

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
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const isDateBooked = (iso) => {
    return bookedRanges.some((range) => {
      const start = String(range.checkin).slice(0, 10);
      const end = String(range.checkout).slice(0, 10);
      return iso >= start && iso < end;
    });
  };

  return (
    <div>
      <h4 className="mb-4 text-center font-semibold text-gray-950">
        {monthName}
      </h4>

      <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`${day}-${index}`}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {blanks.map((_, index) => (
          <div key={`blank-${index}`} className="h-10" />
        ))}

        {days.map((day) => {
          const currentDate = new Date(year, month, day);
          const iso = toLocalISO(currentDate);

          const booked = isDateBooked(iso);
          const disabled = iso < today || booked;
          const isStart = iso === checkin;
          const isEnd = iso === checkout;
          const inRange = iso > checkin && iso < checkout;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onDateClick(currentDate)}
              title={booked ? "Unavailable" : ""}
              className={`relative h-10 text-sm font-medium transition ${
                disabled
                  ? "cursor-not-allowed text-gray-300"
                  : "hover:bg-gray-100"
              } ${inRange && !booked ? "bg-[#eef4ff]" : ""}`}
            >
              <span
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${
                  isStart || isEnd ? "bg-[#3b71e6] text-white" : ""
                } ${
                  isToday && !isStart && !isEnd
                    ? "border border-[#3b71e6]"
                    : ""
                } ${booked ? "line-through" : ""}`}
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