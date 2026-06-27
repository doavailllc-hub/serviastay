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
  LogIn,
  LogOut,
  MessageCircle,
  ReceiptText,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "3b71e6";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

export default function HostReservations() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
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

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user?.id || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/host/reservations/${user.id}`);
      setBookings(res.data || []);
    } catch (err) {
      console.log("Reservations load failed:", err);
      toast.error("Reservations failed to load");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, status) => {
    const ok = window.confirm(`Mark this reservation as ${status}?`);
    if (!ok) return;

    try {
      setUpdatingId(bookingId);

      await api.put(`/host/bookings/${bookingId}/status`, {
        status,
      });

      toast.success(`Reservation marked as ${status}`);
      await loadReservations();
    } catch (err) {
      console.log("Status update failed:", err);
      toast.error(err.response?.data?.message || "Failed to update booking");
    } finally {
      setUpdatingId(null);
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
        } ${item.payment_method || ""} ${item.payment_status || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    return data;
  }, [bookings, statusFilter, query]);

  const activeRevenue = bookings
    .filter((item) => !["Cancelled", "Declined"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  const pendingCount = bookings.filter((item) => item.status === "Pending").length;
  const confirmedCount = bookings.filter((item) => item.status === "Confirmed").length;
  const checkedInCount = bookings.filter((item) => item.status === "Checked-in").length;
  const checkedOutCount = bookings.filter((item) => item.status === "Checked-out").length;
  const cancelledCount = bookings.filter((item) =>
    ["Cancelled", "Declined"].includes(item.status)
  ).length;

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
              Manage guest bookings, check-ins, cancellations and payments.
            </p>
          </div>

          <button
            type="button"
            onClick={loadReservations}
            className="flex items-center gap-2 rounded-xl bg-[3b71e6] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#6f43e4]"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-5">
          <StatCard title="Revenue" value={formatINR(activeRevenue)} color="text-[3b71e6]" />
          <StatCard title="Pending" value={pendingCount} color="text-yellow-600" />
          <StatCard title="Confirmed" value={confirmedCount} color="text-green-600" />
          <StatCard title="Checked-in" value={checkedInCount} color="text-[3b71e6]" />
          <StatCard title="Closed" value={checkedOutCount + cancelledCount} color="text-blue-600" />
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
              <option>Checked-in</option>
              <option>Checked-out</option>
              <option>Cancelled</option>
              <option>Declined</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-2xl font-semibold">Guest Reservations</h2>
            <p className="mt-1 text-gray-500">
              Showing {filteredBookings.length} reservations.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading reservations...
            </div>
          ) : filteredBookings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y">
              {filteredBookings.map((booking) => (
                <ReservationCard
                  key={booking.id}
                  booking={booking}
                  formatINR={formatINR}
                  updating={updatingId === booking.id}
                  onView={() => navigate(`/reserve/${booking.property_id}`)}
                  onMessage={() =>
                    navigate("/messages", {
                      state: {
                        openUserId: booking.user_id,
                        propertyId: booking.property_id,
                      },
                    })
                  }
                  onReceipt={() => navigate(`/receipt/${booking.id}`)}
                  onAccept={() => updateStatus(booking.id, "Confirmed")}
                  onDecline={() => updateStatus(booking.id, "Declined")}
                  onCheckIn={() => updateStatus(booking.id, "Checked-in")}
                  onCheckOut={() => updateStatus(booking.id, "Checked-out")}
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
  updating,
  onView,
  onMessage,
  onReceipt,
  onAccept,
  onDecline,
  onCheckIn,
  onCheckOut,
  onCancel,
}) {
  const status = booking.status || "Pending";
  const nights = getNights(booking.checkin, booking.checkout);

  return (
    <div className="p-6 transition hover:bg-gray-50">
      <div className="grid gap-6 xl:grid-cols-[320px_1fr_auto] xl:items-center">
        <div className="flex gap-4">
          <img
            src={booking.image || FALLBACK_IMAGE}
            alt={booking.title || "Property"}
            className="h-28 w-28 rounded-2xl object-cover"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          <div>
            <h3 className="font-bold text-gray-900">
              {booking.title || "Room Booking"}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {booking.location || "Location unavailable"}
            </p>

            <p className="mt-1 text-sm text-gray-500">Order #{booking.id}</p>

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
            label="Stay"
            value={`${booking.checkin} - ${booking.checkout}`}
            subValue={`${nights} ${nights === 1 ? "night" : "nights"}`}
          />

          <InfoItem
            icon={<Users size={18} />}
            label="Guests"
            value={`${booking.guests || 1} ${
              Number(booking.guests || 1) > 1 ? "guests" : "guest"
            }`}
          />

          <InfoItem
            icon={<CreditCard size={18} />}
            label="Payment"
            value={booking.payment_status || booking.payment_method || "Pending"}
            subValue={booking.payment_method || "cash"}
            capitalize
          />
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <p className="text-xl font-bold text-[3b71e6]">
            {formatINR(booking.total)}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <SmallButton icon={<Eye size={16} />} label="View" onClick={onView} />

            <SmallButton
              icon={<MessageCircle size={16} />}
              label="Message"
              onClick={onMessage}
            />

            <SmallButton
              icon={<ReceiptText size={16} />}
              label="Receipt"
              onClick={onReceipt}
            />

            {status === "Pending" && (
              <>
                <ActionButton
                  icon={<CheckCircle size={16} />}
                  label="Accept"
                  onClick={onAccept}
                  disabled={updating}
                  type="success"
                />
                <ActionButton
                  icon={<XCircle size={16} />}
                  label="Decline"
                  onClick={onDecline}
                  disabled={updating}
                  type="danger"
                />
              </>
            )}

            {status === "Confirmed" && (
              <ActionButton
                icon={<LogIn size={16} />}
                label="Check-in"
                onClick={onCheckIn}
                disabled={updating}
                type="purple"
              />
            )}

            {status === "Checked-in" && (
              <ActionButton
                icon={<LogOut size={16} />}
                label="Check-out"
                onClick={onCheckOut}
                disabled={updating}
                type="blue"
              />
            )}

            {!["Cancelled", "Declined", "Checked-out"].includes(status) && (
              <ActionButton
                icon={<XCircle size={16} />}
                label="Cancel"
                onClick={onCancel}
                disabled={updating}
                type="danger"
              />
            )}
          </div>

          {updating && (
            <p className="text-xs font-semibold text-gray-400">Updating...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, subValue, capitalize }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-4">
      <div className="mb-2 flex items-center gap-2 text-[3b71e6]">
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

function SmallButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
    >
      {icon}
      {label}
    </button>
  );
}

function ActionButton({ icon, label, onClick, disabled, type }) {
  const styles = {
    success: "border-green-300 text-green-700 hover:bg-green-50",
    danger: "border-red-300 text-red-600 hover:bg-red-50",
    purple: "border-[#d8ccff] text-[3b71e6] hover:bg-[#f7f4ff]",
    blue: "border-blue-300 text-blue-700 hover:bg-blue-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
        styles[type] || styles.purple
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Cancelled"
      ? "bg-red-100 text-red-600"
      : status === "Declined"
      ? "bg-gray-200 text-gray-700"
      : status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : status === "Checked-in"
      ? "bg-[#f4f0ff] text-[3b71e6]"
      : status === "Checked-out"
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

function EmptyState() {
  return (
    <div className="p-14 text-center">
      <div className="mb-4 text-6xl">📋</div>
      <h3 className="text-2xl font-bold">No reservations found</h3>
      <p className="mt-2 text-gray-500">
        New guest bookings for your rooms will appear here.
      </p>
    </div>
  );
}

function getNights(checkin, checkout) {
  if (!checkin || !checkout) return 1;

  const start = new Date(`${String(checkin).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(checkout).slice(0, 10)}T00:00:00`);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));

  return diff > 0 ? diff : 1;
}