import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Users,
  CreditCard,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Clock,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function HostReservations() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadReservations();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadReservations = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/host/reservations/${user.id}`);
      setBookings(res.data || []);
    } catch (err) {
      console.log("Reservations load failed:", err);
      alert("Reservations failed to load");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, status) => {
    const confirmAction = window.confirm(
      `Are you sure you want to mark this reservation as ${status}?`
    );

    if (!confirmAction) return;

    try {
      await api.put(`/bookings/${bookingId}/status`, {
        status,
      });

      loadReservations();
    } catch (err) {
      console.log("Status update failed:", err);
      alert("Failed to update booking status");
    }
  };

  const filteredBookings = useMemo(() => {
    let data = [...bookings];

    if (statusFilter !== "All") {
      data = data.filter((item) => item.status === statusFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();

      data = data.filter((item) =>
        `${item.title || ""} ${item.location || ""} ${item.guest_name || ""} ${
          item.guest_email || ""
        } ${item.payment_method || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    return data;
  }, [bookings, statusFilter, query]);

  const totalRevenue = bookings
    .filter((item) => item.status !== "Cancelled")
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  const pendingCount = bookings.filter((item) => item.status === "Pending")
    .length;

  const confirmedCount = bookings.filter((item) => item.status === "Confirmed")
    .length;

  const completedCount = bookings.filter((item) => item.status === "Completed")
    .length;

  const cancelledCount = bookings.filter((item) => item.status === "Cancelled")
    .length;

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Host Reservations
            </h1>

            <p className="mt-2 text-gray-500">
              Manage all guest orders for your hosted rooms and listings.
            </p>
          </div>

          <button
            onClick={loadReservations}
            className="flex items-center gap-2 rounded-xl bg-[#8363F5] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#7152E8]"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-5">
          <StatCard
            title="Revenue"
            value={formatINR(totalRevenue)}
            color="text-[#8363F5]"
          />

          <StatCard
            title="Confirmed"
            value={confirmedCount}
            color="text-green-600"
          />

          <StatCard
            title="Pending"
            value={pendingCount}
            color="text-yellow-600"
          />

          <StatCard
            title="Completed"
            value={completedCount}
            color="text-blue-600"
          />

          <StatCard
            title="Cancelled"
            value={cancelledCount}
            color="text-red-500"
          />
        </div>

        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="flex h-12 items-center gap-3 rounded-xl border border-gray-300 bg-white px-4">
              <Search size={18} className="text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guest, property, location, payment..."
                className="flex-1 bg-white text-sm outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Confirmed</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-2xl font-semibold">Guest Orders</h2>

            <p className="mt-1 text-gray-500">
              Showing {filteredBookings.length} reservations.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading reservations...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mb-4 text-6xl">📋</div>

              <h3 className="text-2xl font-bold">No reservations found</h3>

              <p className="mt-2 text-gray-500">
                New guest bookings for your rooms will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredBookings.map((booking) => (
                <ReservationCard
                  key={booking.id}
                  booking={booking}
                  formatINR={formatINR}
                  onView={() => navigate(`/reserve/${booking.property_id}`)}
                  onConfirm={() => updateStatus(booking.id, "Confirmed")}
                  onComplete={() => updateStatus(booking.id, "Completed")}
                  onCancel={() => updateStatus(booking.id, "Cancelled")}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ReservationCard({
  booking,
  formatINR,
  onView,
  onConfirm,
  onComplete,
  onCancel,
}) {
  const status = booking.status || "Pending";

  return (
    <div className="p-6 transition hover:bg-gray-50">
      <div className="grid gap-6 xl:grid-cols-[310px_1fr_auto] xl:items-center">
        <div className="flex gap-4">
          <img
            src={
              booking.image ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
            }
            alt={booking.title}
            className="h-28 w-28 rounded-2xl object-cover"
          />

          <div>
            <h3 className="font-bold text-gray-900">
              {booking.title || "Room Booking"}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {booking.location || "Location unavailable"}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Order #{booking.id}
            </p>

            <StatusBadge status={status} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <InfoItem
            icon={<Users size={18} />}
            label="Guest"
            value={booking.guest_name || "Guest"}
            subValue={booking.guest_email}
          />

          <InfoItem
            icon={<CalendarDays size={18} />}
            label="Dates"
            value={`${booking.checkin} - ${booking.checkout}`}
          />

          <InfoItem
            icon={<Users size={18} />}
            label="Guests"
            value={`${booking.guests || 1} ${
              booking.guests > 1 ? "guests" : "guest"
            }`}
          />

          <InfoItem
            icon={<CreditCard size={18} />}
            label="Payment"
            value={booking.payment_method || "cash"}
            capitalize
          />
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <p className="text-xl font-bold text-[#8363F5]">
            {formatINR(booking.total)}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={onView}
              className="flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              <Eye size={16} />
              View
            </button>

            {status === "Pending" && (
              <button
                onClick={onConfirm}
                className="flex items-center gap-1 rounded-xl border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
              >
                <CheckCircle size={16} />
                Confirm
              </button>
            )}

            {status === "Confirmed" && (
              <button
                onClick={onComplete}
                className="flex items-center gap-1 rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                <Clock size={16} />
                Complete
              </button>
            )}

            {status !== "Cancelled" && status !== "Completed" && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <XCircle size={16} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, subValue, capitalize }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-4">
      <div className="mb-2 flex items-center gap-2 text-[#8363F5]">
        {icon}
        <span className="text-xs font-bold uppercase text-gray-500">
          {label}
        </span>
      </div>

      <p
        className={`text-sm font-semibold text-gray-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>

      {subValue && (
        <p className="mt-1 truncate text-xs text-gray-500">{subValue}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Cancelled"
      ? "bg-red-100 text-red-600"
      : status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : status === "Completed"
      ? "bg-blue-100 text-blue-700"
      : "bg-green-100 text-green-700";

  return (
    <span
      className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>

      <h2 className={`mt-2 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}