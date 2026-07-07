import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle,
  CreditCard,
  Eye,
  LogIn,
  LogOut,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

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

      await api.put(`/host/bookings/${bookingId}/status`, { status });

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
  const confirmedCount = bookings.filter(
    (item) => item.status === "Confirmed"
  ).length;
  const checkedInCount = bookings.filter(
    (item) => item.status === "Checked-in"
  ).length;
  const closedCount = bookings.filter((item) =>
    ["Checked-out", "Cancelled", "Declined"].includes(item.status)
  ).length;

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Reservations
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Manage guest bookings, check-ins, cancellations and payments.
            </p>
          </div>

          <button
            type="button"
            onClick={loadReservations}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-5">
          <StatCard title="Revenue" value={formatINR(activeRevenue)} />
          <StatCard title="Pending" value={pendingCount} />
          <StatCard title="Confirmed" value={confirmedCount} />
          <StatCard title="Checked-in" value={checkedInCount} />
          <StatCard title="Closed" value={closedCount} />
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 transition focus-within:border-[#3b71e6] focus-within:ring-2 focus-within:ring-[#3b71e6]/10">
              <Search size={17} className="text-gray-400" />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guest, property, location, payment..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
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
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
              Guest reservations
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Showing {filteredBookings.length} reservations.
            </p>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredBookings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredBookings.map((booking) => (
                <ReservationRow
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
        </section>
      </main>
    </div>
  );
}

function ReservationRow({
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
    <article className="px-5 py-4 transition hover:bg-gray-50">
      <div className="grid gap-5 xl:grid-cols-[280px_1fr_auto] xl:items-center">
        <div className="flex gap-4">
          <img
            src={booking.image || FALLBACK_IMAGE}
            alt={booking.title || "Property"}
            className="h-20 w-20 rounded-xl object-cover"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-950">
              {booking.title || "Room booking"}
            </h3>

            <p className="mt-1 truncate text-sm text-gray-500">
              {booking.location || "Location unavailable"}
            </p>

            <p className="mt-1 text-xs text-gray-400">Order #{booking.id}</p>

            <StatusBadge status={status} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <InfoItem
            icon={<Users size={16} />}
            label="Guest"
            value={booking.guest_name || "Guest"}
            subValue={booking.guest_email}
          />

          <InfoItem
            icon={<CalendarDays size={16} />}
            label="Stay"
            value={`${booking.checkin} - ${booking.checkout}`}
            subValue={`${nights} ${nights === 1 ? "night" : "nights"}`}
          />

          <InfoItem
            icon={<Users size={16} />}
            label="Guests"
            value={`${booking.guests || 1} ${
              Number(booking.guests || 1) > 1 ? "guests" : "guest"
            }`}
          />

          <InfoItem
            icon={<CreditCard size={16} />}
            label="Payment"
            value={booking.payment_status || booking.payment_method || "Pending"}
            subValue={booking.payment_method || "cash"}
            capitalize
          />
        </div>

        <div className="xl:text-right">
          <p className="text-base font-semibold text-gray-950">
            {formatINR(booking.total)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 xl:justify-end">
            <SmallButton icon={<Eye size={15} />} label="View" onClick={onView} />

            <SmallButton
              icon={<MessageCircle size={15} />}
              label="Message"
              onClick={onMessage}
            />

            <SmallButton
              icon={<ReceiptText size={15} />}
              label="Receipt"
              onClick={onReceipt}
            />

            {status === "Pending" && (
              <>s
                <ActionButton
                  icon={<CheckCircle size={15} />}
                  label="Accept"
                  onClick={onAccept}
                  disabled={updating}
                  type="success"
                />

                <ActionButton
                  icon={<XCircle size={15} />}
                  label="Decline"
                  onClick={onDecline}
                  disabled={updating}
                  type="danger"
                />
              </>
            )}

            {status === "Confirmed" && (
              <ActionButton
                icon={<LogIn size={15} />}
                label="Check-in"
                onClick={onCheckIn}
                disabled={updating}
                type="brand"
              />
            )}

            {status === "Checked-in" && (
              <ActionButton
                icon={<LogOut size={15} />}
                label="Check-out"
                onClick={onCheckOut}
                disabled={updating}
                type="brand"
              />
            )}

            {!["Cancelled", "Declined", "Checked-out"].includes(status) && (
              <ActionButton
                icon={<XCircle size={15} />}
                label="Cancel"
                onClick={onCancel}
                disabled={updating}
                type="danger"
              />
            )}
          </div>

          {updating && (
            <p className="mt-2 text-xs font-medium text-gray-400">Updating...</p>
          )}
        </div>
      </div>
    </article>
  );
}

function InfoItem({ icon, label, value, subValue, capitalize }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>

      <p
        className={`truncate text-sm font-medium text-gray-950 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>

      {subValue && <p className="mt-1 truncate text-xs text-gray-500">{subValue}</p>}
    </div>
  );
}

function SmallButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
    >
      {icon}
      {label}
    </button>
  );
}

function ActionButton({ icon, label, onClick, disabled, type }) {
  const styles = {
    success: "border-green-200 text-green-700 hover:bg-green-50",
    danger: "border-red-200 text-red-600 hover:bg-red-50",
    brand: "border-[#3b71e6] text-[#3b71e6] hover:bg-[#eef4ff]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        styles[type] || styles.brand
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
      ? "border-red-200 bg-red-50 text-red-600"
      : status === "Declined"
      ? "border-gray-200 bg-gray-50 text-gray-700"
      : status === "Pending"
      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
      : status === "Checked-in"
      ? "border-[#bfdbfe] bg-[#eef4ff] text-[#3b71e6]"
      : status === "Checked-out"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-green-200 bg-green-50 text-green-700";

  return (
    <span
      className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value }) {
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
    <div className="space-y-0">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse border-b border-gray-100 bg-gray-50"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-5 text-center">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-gray-950">
          No reservations found
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          New guest bookings for your rooms will appear here.
        </p>
      </div>
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