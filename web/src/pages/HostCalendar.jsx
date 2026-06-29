import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Lock,
  RefreshCw,
  Unlock,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

function toLocalISO(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export default function HostCalendar() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [calendarRows, setCalendarRows] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [savingDate, setSavingDate] = useState("");

  const selectedProperty = properties.find(
    (item) => Number(item.id) === Number(selectedPropertyId)
  );

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      loadCalendar(selectedPropertyId);
      loadBookedDates(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadProperties = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user?.id || !token) return;

      const res = await api.get(`/host/properties/${user.id}`);
      const list = res.data || [];

      setProperties(list);

      if (list.length) {
        setSelectedPropertyId(String(list[0].id));
      }
    } catch (err) {
      console.log("Host properties load failed:", err);
      toast.error("Host properties failed to load");
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async (propertyId) => {
    try {
      const res = await api.get(`/host/calendar/${propertyId}`);
      setCalendarRows(res.data || []);
    } catch (err) {
      console.log("Calendar load failed:", err);
      toast.error("Calendar failed to load");
    }
  };

  const loadBookedDates = async (propertyId) => {
    try {
      const res = await api.get(`/properties/${propertyId}/booked-dates`);
      setBookedRanges(res.data || []);
    } catch (err) {
      console.log("Booked dates load failed:", err);
    }
  };

  const calendarMap = useMemo(() => {
    const map = new Map();

    calendarRows.forEach((row) => {
      map.set(String(row.calendar_date).slice(0, 10), row);
    });

    return map;
  }, [calendarRows]);

  const isBookedDate = (iso) => {
    return bookedRanges.some((range) => {
      if (range.type === "Blocked") return false;

      const start = String(range.checkin).slice(0, 10);
      const end = String(range.checkout).slice(0, 10);

      return iso >= start && iso < end;
    });
  };

  const isBlockedDate = (iso) => {
    const row = calendarMap.get(iso);
    return row?.status === "Blocked";
  };

  const updateDateStatus = async (iso, nextStatus) => {
    if (!selectedPropertyId || isBookedDate(iso)) return;

    try {
      setSavingDate(iso);

      await api.post("/host/calendar", {
        property_id: selectedPropertyId,
        calendar_date: iso,
        status: nextStatus,
        custom_price: null,
        note: "",
      });

      toast.success(
        nextStatus === "Blocked" ? "Date blocked" : "Date available"
      );

      await loadCalendar(selectedPropertyId);
      await loadBookedDates(selectedPropertyId);
    } catch (err) {
      console.log("Calendar update failed:", err);
      toast.error(err.response?.data?.message || "Calendar update failed");
    } finally {
      setSavingDate("");
    }
  };

  const days = getCalendarDays(viewDate);

  const stats = useMemo(() => {
    const monthPrefix = `${viewDate.getFullYear()}-${String(
      viewDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const monthDays = days.filter((item) => item.iso.startsWith(monthPrefix));

    const booked = monthDays.filter((item) => isBookedDate(item.iso)).length;
    const blocked = monthDays.filter((item) => isBlockedDate(item.iso)).length;
    const available = monthDays.length - booked - blocked;

    return { available, booked, blocked, total: monthDays.length };
  }, [days, bookedRanges, calendarMap, viewDate]);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Calendar
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Manage availability by blocking or opening dates for your listing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedPropertyId) {
                loadCalendar(selectedPropertyId);
                loadBookedDates(selectedPropertyId);
              }
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <Stat title="Available" value={stats.available} />
          <Stat title="Booked" value={stats.booked} />
          <Stat title="Blocked" value={stats.blocked} />
          <Stat title="Month days" value={stats.total} />
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                Selected property
              </span>

              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
              >
                {properties.length === 0 ? (
                  <option value="">No properties found</option>
                ) : (
                  properties.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Base price</p>
              <h3 className="mt-1 text-xl font-semibold text-gray-950">
                {formatINR(selectedProperty?.price)}
              </h3>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-950">
                <CalendarDays size={20} className="text-[#3b71e6]" />
                {viewDate.toLocaleString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Click an available date to block or unblock it.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, -1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 transition hover:bg-gray-50"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => setViewDate(new Date())}
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium transition hover:bg-gray-50"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 transition hover:bg-gray-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : (
            <div className="p-4 md:p-5">
              <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium uppercase tracking-wide text-gray-400">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const booked = isBookedDate(day.iso);
                  const blocked = isBlockedDate(day.iso);
                  const past = day.iso < toLocalISO();
                  const inactive = day.month !== viewDate.getMonth();
                  const saving = savingDate === day.iso;

                  const nextStatus = blocked ? "Available" : "Blocked";

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      disabled={booked || past || inactive || saving}
                      onClick={() => updateDateStatus(day.iso, nextStatus)}
                      className={`min-h-[82px] rounded-2xl border p-3 text-left transition ${
                        inactive
                          ? "border-gray-100 bg-gray-50 text-gray-300"
                          : booked
                          ? "border-green-200 bg-green-50 text-green-700"
                          : blocked
                          ? "border-red-200 bg-red-50 text-red-600"
                          : past
                          ? "border-gray-100 bg-gray-50 text-gray-300"
                          : "border-gray-200 bg-white hover:border-[#3b71e6] hover:bg-[#eef4ff]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {day.date.getDate()}
                        </span>

                        {booked ? (
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium">
                            Booked
                          </span>
                        ) : blocked ? (
                          <Lock size={14} />
                        ) : (
                          <Unlock size={14} className="text-gray-400" />
                        )}
                      </div>

                      <p className="mt-4 text-xs font-medium">
                        {booked
                          ? "Guest booking"
                          : blocked
                          ? "Blocked"
                          : past
                          ? "Past"
                          : "Available"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-5 text-sm text-gray-600">
          <Legend color="border border-gray-300 bg-white" text="Available" />
          <Legend color="bg-green-500" text="Booked" />
          <Legend color="bg-red-500" text="Blocked by host" />
        </div>
      </main>
    </div>
  );
}

function getCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      iso: toLocalISO(date),
      month: date.getMonth(),
    };
  });
}

function Stat({ title, value }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>

      <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
        {value}
      </h2>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-7 gap-2 p-5">
      {Array.from({ length: 35 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <span>{text}</span>
    </div>
  );
}