import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  Eye,
  LogIn,
  LogOut,
  MessageCircle,
  MoreVertical,
  ReceiptText,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

export default function HostReservations() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
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
      setOpenMenuId(null);

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

  const stats = useMemo(() => {
    const activeRevenue = bookings
      .filter((item) => !["Cancelled", "Declined"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.total || 0), 0);

    return {
      revenue: activeRevenue,
      bookings: bookings.length,
      pending: bookings.filter((item) => item.status === "Pending").length,
      confirmed: bookings.filter((item) => item.status === "Confirmed").length,
    };
  }, [bookings]);

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

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Revenue" value={formatINR(stats.revenue)} />
          <StatCard title="Bookings" value={stats.bookings} />
          <StatCard title="Pending" value={stats.pending} />
          <StatCard title="Confirmed" value={stats.confirmed} />
        </section>

        <section className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-[1fr_200px]">
          <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 transition focus-within:border-[#3b71e6] focus-within:ring-2 focus-within:ring-[#3b71e6]/10">
            <Search size={17} className="text-gray-400" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guest, property, location..."
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
            <>
              <DesktopTable
                bookings={filteredBookings}
                formatINR={formatINR}
                updatingId={updatingId}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                navigate={navigate}
                updateStatus={updateStatus}
              />

              <MobileCards
                bookings={filteredBookings}
                formatINR={formatINR}
                updatingId={updatingId}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                navigate={navigate}
                updateStatus={updateStatus}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function DesktopTable({
  bookings,
  formatINR,
  updatingId,
  openMenuId,
  setOpenMenuId,
  navigate,
  updateStatus,
}) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[980px] text-left">
        <thead className="border-b border-gray-200 text-sm text-gray-500">
          <tr>
            <th className="px-5 py-4 font-medium">Property</th>
            <th className="px-5 py-4 font-medium">Guest</th>
            <th className="px-5 py-4 font-medium">Dates</th>
            <th className="px-5 py-4 font-medium">Payment</th>
            <th className="px-5 py-4 font-medium">Amount</th>
            <th className="px-5 py-4 font-medium">Status</th>
            <th className="px-5 py-4 text-right font-medium">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {bookings.map((booking) => (
            <ReservationTableRow
              key={booking.id}
              booking={booking}
              formatINR={formatINR}
              updating={updatingId === booking.id}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              navigate={navigate}
              updateStatus={updateStatus}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReservationTableRow({
  booking,
  formatINR,
  updating,
  openMenuId,
  setOpenMenuId,
  navigate,
  updateStatus,
}) {
  const status = booking.status || "Pending";
  const nights = getNights(booking.checkin, booking.checkout);
  const menuOpen = openMenuId === booking.id;

  return (
    <tr className="transition hover:bg-gray-50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src={booking.image || FALLBACK_IMAGE}
            alt={booking.title || "Property"}
            className="h-14 w-14 rounded-xl object-cover"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          <div className="min-w-0">
            <p className="max-w-[220px] truncate text-sm font-semibold text-gray-950">
              {booking.title || "Room booking"}
            </p>

            <p className="max-w-[220px] truncate text-sm text-gray-500">
              {booking.location || "Location unavailable"}
            </p>

            <p className="mt-1 text-xs text-gray-400">#{booking.id}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-medium text-gray-950">
          {booking.guest_name || "Guest"}
        </p>

        <p className="max-w-[190px] truncate text-sm text-gray-500">
          {booking.guest_email || "-"}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-medium text-gray-950">
          {formatShortDate(booking.checkin)} – {formatShortDate(booking.checkout)}
        </p>

        <p className="text-sm text-gray-500">
          {nights} {nights === 1 ? "night" : "nights"} ·{" "}
          {booking.guests || 1} guest{Number(booking.guests || 1) > 1 ? "s" : ""}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-medium capitalize text-gray-950">
          {booking.payment_status || "Pending"}
        </p>

        <p className="text-sm capitalize text-gray-500">
          {booking.payment_method || "cash"}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-gray-950">
          {formatINR(booking.total)}
        </p>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={status} />
      </td>

      <td className="relative px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/reserve/${booking.property_id}`)}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
          >
            <Eye size={15} />
            View
          </button>

          <button
            type="button"
            onClick={() => setOpenMenuId(menuOpen ? null : booking.id)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition hover:bg-white"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {menuOpen && (
          <ActionMenu
            booking={booking}
            status={status}
            updating={updating}
            navigate={navigate}
            updateStatus={updateStatus}
          />
        )}
      </td>
    </tr>
  );
}

function MobileCards({
  bookings,
  formatINR,
  updatingId,
  openMenuId,
  setOpenMenuId,
  navigate,
  updateStatus,
}) {
  return (
    <div className="divide-y divide-gray-100 lg:hidden">
      {bookings.map((booking) => {
        const status = booking.status || "Pending";
        const menuOpen = openMenuId === booking.id;

        return (
          <article key={booking.id} className="relative p-5">
            <div className="flex gap-4">
              <img
                src={booking.image || FALLBACK_IMAGE}
                alt={booking.title || "Property"}
                className="h-20 w-20 rounded-xl object-cover"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-950">
                      {booking.title || "Room booking"}
                    </h3>

                    <p className="truncate text-sm text-gray-500">
                      {booking.location || "Location unavailable"}
                    </p>
                  </div>

                  <StatusBadge status={status} />
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  {booking.guest_name || "Guest"} ·{" "}
                  {formatShortDate(booking.checkin)} –{" "}
                  {formatShortDate(booking.checkout)}
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-950">
                  {formatINR(booking.total)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigate(`/reserve/${booking.property_id}`)}
                className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
              >
                View
              </button>

              <button
                onClick={() => setOpenMenuId(menuOpen ? null : booking.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700"
              >
                <MoreVertical size={16} />
              </button>
            </div>

            {menuOpen && (
              <ActionMenu
                booking={booking}
                status={status}
                updating={updatingId === booking.id}
                navigate={navigate}
                updateStatus={updateStatus}
                mobile
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

function ActionMenu({ booking, status, updating, navigate, updateStatus, mobile }) {
  const items = [
    {
      label: "Message guest",
      icon: <MessageCircle size={16} />,
      onClick: () =>
        navigate("/messages", {
          state: {
            openUserId: booking.user_id,
            propertyId: booking.property_id,
          },
        }),
    },
    {
      label: "Receipt",
      icon: <ReceiptText size={16} />,
      onClick: () => navigate(`/receipt/${booking.id}`),
    },
  ];

  if (status === "Pending") {
    items.push(
      {
        label: "Accept",
        icon: <CheckCircle size={16} />,
        onClick: () => updateStatus(booking.id, "Confirmed"),
      },
      {
        label: "Decline",
        icon: <XCircle size={16} />,
        danger: true,
        onClick: () => updateStatus(booking.id, "Declined"),
      }
    );
  }

  if (status === "Confirmed") {
    items.push({
      label: "Check in",
      icon: <LogIn size={16} />,
      onClick: () => updateStatus(booking.id, "Checked-in"),
    });
  }

  if (status === "Checked-in") {
    items.push({
      label: "Check out",
      icon: <LogOut size={16} />,
      onClick: () => updateStatus(booking.id, "Checked-out"),
    });
  }

  if (!["Cancelled", "Declined", "Checked-out"].includes(status)) {
    items.push({
      label: "Cancel booking",
      icon: <XCircle size={16} />,
      danger: true,
      onClick: () => updateStatus(booking.id, "Cancelled"),
    });
  }

  return (
    <div
      className={`z-30 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg ${
        mobile
          ? "absolute right-5 top-[132px] w-56"
          : "absolute right-5 top-14 w-56"
      }`}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={updating}
          onClick={item.onClick}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50 ${
            item.danger ? "text-red-600" : "text-gray-700"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
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

function StatusBadge({ status }) {
  const style =
    status === "Cancelled"
      ? "border-red-200 bg-red-50 text-red-600"
      : status === "Declined"
      ? "border-gray-200 bg-gray-50 text-gray-700"
      : status === "Pending"
      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
      : status === "Checked-in"
      ? "border-blue-200 bg-[#eef4ff] text-[#3b71e6]"
      : status === "Checked-out"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-green-200 bg-green-50 text-green-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>
      {status || "Pending"}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-20 animate-pulse bg-gray-50" />
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

function formatShortDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return value;
  }
}

function getNights(checkin, checkout) {
  if (!checkin || !checkout) return 1;

  const start = new Date(`${String(checkin).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(checkout).slice(0, 10)}T00:00:00`);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));

  return diff > 0 ? diff : 1;
}