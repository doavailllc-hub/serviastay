import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Search,
  XCircle,
  Download,
  IndianRupee,
  User,
  Home,
  CreditCard,
  Users,
} from "lucide-react";
import api from "../../api/api";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/bookings");
      setBookings(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Bookings load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const text = `${b.property_title || ""} ${b.guest_name || ""} ${b.host_name || ""}`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (status === "all" || String(b.status || "Pending") === status) &&
        (payment === "all" || String(b.payment_method || "cash") === payment)
      );
    });
  }, [bookings, search, status, payment]);

  const cancelBooking = async (id) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await api.put(`/admin/bookings/${id}/status`, { status: "Cancelled" });
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Booking cancellation failed");
    }
  };

  const exportCSV = () => {
    const rows = [
      [
        "ID",
        "Property",
        "Guest",
        "Host",
        "Checkin",
        "Checkout",
        "Guests",
        "Total",
        "Payment",
        "Status",
      ],
      ...filtered.map((b) => [
        b.id,
        b.property_title,
        b.guest_name,
        b.host_name,
        b.checkin,
        b.checkout,
        b.guests,
        b.total,
        b.payment_method,
        b.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "servia-bookings.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-4 sm:p-6 lg:p-8">
      <PageHeader onRefresh={loadBookings} onExport={exportCSV} />

      <Stats bookings={bookings} filteredCount={filtered.length} />

      <Filters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        payment={payment}
        setPayment={setPayment}
      />

      <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-black text-gray-900">All Bookings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track reservations, payment methods, guests, hosts and cancellations.
          </p>
        </div>

        {loading ? (
          <Empty text="Loading bookings..." />
        ) : filtered.length === 0 ? (
          <Empty text="No bookings found." />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                onCancel={() => cancelBooking(booking.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PageHeader({ onRefresh, onExport }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EEE9FF] px-4 py-2 text-sm font-bold text-[#8363F5]">
          <CalendarDays size={16} />
          Reservation Center
        </div>

        <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          Bookings Management
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
          Track bookings, payments, guests, hosts, cancellations and export reports.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onRefresh}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
        >
          <RefreshCw size={18} />
          Refresh
        </button>

        <button
          onClick={onExport}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#8363F5] px-6 font-bold text-white shadow-lg shadow-[#8363F5]/25 transition hover:bg-[#7152e8] active:scale-[0.98]"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>
    </div>
  );
}

function Stats({ bookings, filteredCount }) {
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const confirmed = bookings.filter((b) => String(b.status || "") === "Confirmed").length;
  const cancelled = bookings.filter((b) => String(b.status || "") === "Cancelled").length;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Bookings" value={bookings.length} />
      <StatCard label="Showing Results" value={filteredCount} />
      <StatCard label="Confirmed" value={confirmed} />
      <StatCard label="Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <h3 className="mt-2 text-2xl font-black text-gray-950">{value}</h3>
    </div>
  );
}

function Filters({ search, setSearch, status, setStatus, payment, setPayment }) {
  return (
    <div className="mb-6 grid gap-4 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm lg:grid-cols-4">
      <div className="lg:col-span-2">
        <SearchBox value={search} setValue={setSearch} />
      </div>

      <SelectBox value={status} onChange={setStatus}>
        <option value="all">All Status</option>
        <option value="Pending">Pending</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
      </SelectBox>

      <SelectBox value={payment} onChange={setPayment}>
        <option value="all">All Payment</option>
        <option value="cash">Cash</option>
        <option value="razorpay">Razorpay</option>
        <option value="card">Card</option>
      </SelectBox>
    </div>
  );
}

function SearchBox({ value, setValue }) {
  return (
    <div className="flex h-13 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-[#8363F5] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#8363F5]/10">
      <Search size={18} className="text-gray-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by property, guest or host..."
        className="h-full w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

function SelectBox({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-13 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#8363F5] focus:bg-white focus:ring-4 focus:ring-[#8363F5]/10"
    >
      {children}
    </select>
  );
}

function BookingRow({ booking: b, onCancel }) {
  const isCancelled = String(b.status || "Pending") === "Cancelled";

  return (
    <div className="p-5 transition hover:bg-gray-50/70">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-gray-950">
              {b.property_title || "Property"}
            </h3>
            <StatusBadge status={b.status || "Pending"} />
          </div>

          <div className="grid gap-2 text-sm text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem icon={<User size={15} />} label={`Guest: ${b.guest_name || "Guest"}`} />
            <InfoItem icon={<Home size={15} />} label={`Host: ${b.host_name || "Host"}`} />
            <InfoItem
              icon={<CalendarDays size={15} />}
              label={`${b.checkin || "-"} - ${b.checkout || "-"}`}
            />
            <InfoItem icon={<Users size={15} />} label={`${b.guests || 0} guests`} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-1 rounded-xl bg-[#EEE9FF] px-3 py-2 text-sm font-black text-[#8363F5]">
              <IndianRupee size={16} />
              {Number(b.total || 0).toLocaleString("en-IN")}
            </p>

            <p className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold capitalize text-gray-600">
              <CreditCard size={15} />
              {b.payment_method || "cash"}
            </p>
          </div>
        </div>

        {!isCancelled && (
          <button
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-black text-red-600 transition hover:bg-red-50 active:scale-[0.97]"
          >
            <XCircle size={16} />
            Cancel Booking
          </button>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label }) {
  return (
    <p className="flex min-w-0 items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 font-medium">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="truncate">{label}</span>
    </p>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Cancelled: "bg-red-100 text-red-600 ring-red-200",
    Completed: "bg-blue-100 text-blue-700 ring-blue-200",
    Confirmed: "bg-green-100 text-green-700 ring-green-200",
    Pending: "bg-yellow-100 text-yellow-700 ring-yellow-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        styles[status] || styles.Pending
      }`}
    >
      {status}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center p-12 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEE9FF] text-[#8363F5]">
          <CalendarDays size={24} />
        </div>
        <p className="font-bold text-gray-500">{text}</p>
      </div>
    </div>
  );
}