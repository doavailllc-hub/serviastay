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

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Host Calendar</h1>
            <p className="mt-2 text-gray-500">
              Block unavailable dates and manage booking availability.
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
            className="flex items-center gap-2 rounded-xl bg-[#7e4ff5] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#6f43e4]"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Stat title="Available" value={stats.available} color="text-[#7e4ff5]" />
          <Stat title="Booked" value={stats.booked} color="text-green-600" />
          <Stat title="Blocked" value={stats.blocked} color="text-red-500" />
          <Stat title="Month Days" value={stats.total} color="text-gray-900" />
        </div>

        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_260px] md:items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                Selected Property
              </p>

              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 outline-none focus:border-[#7e4ff5] focus:ring-2 focus:ring-[#7e4ff5]/20"
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
            </div>

            <div className="rounded-2xl bg-[#FAFAFC] p-4">
              <p className="text-sm text-gray-500">Base price</p>
              <h3 className="mt-1 text-2xl font-bold text-[#7e4ff5]">
                {formatINR(selectedProperty?.price)}
              </h3>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b p-6 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <CalendarDays className="text-[#7e4ff5]" />
                {viewDate.toLocaleString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>

              <p className="mt-1 text-gray-500">
                Click available dates to block/unblock.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, -1))}
                className="rounded-xl border border-gray-300 p-3 hover:bg-gray-50"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={() => setViewDate(new Date())}
                className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="rounded-xl border border-gray-300 p-3 hover:bg-gray-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading calendar...
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="mb-3 grid grid-cols-7 text-center text-xs font-bold uppercase text-gray-400">
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
                      className={`min-h-[96px] rounded-2xl border p-3 text-left transition ${
                        inactive
                          ? "bg-gray-50 text-gray-300"
                          : booked
                          ? "border-green-200 bg-green-50 text-green-700"
                          : blocked
                          ? "border-red-200 bg-red-50 text-red-600"
                          : past
                          ? "bg-gray-50 text-gray-300"
                          : "border-gray-200 bg-white hover:border-[#7e4ff5] hover:bg-[#f7f4ff]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold">{day.date.getDate()}</span>

                        {booked ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold">
                            Booked
                          </span>
                        ) : blocked ? (
                          <Lock size={15} />
                        ) : (
                          <Unlock size={15} className="text-gray-400" />
                        )}
                      </div>

                      <p className="mt-5 text-xs font-semibold">
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

        <div className="mt-8 flex flex-wrap gap-6 text-sm">
          <Legend color="bg-white border border-gray-300" text="Available" />
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

function Stat({ title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className={`mt-2 text-4xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-4 w-4 rounded-full ${color}`} />
      <span>{text}</span>
    </div>
  );
}