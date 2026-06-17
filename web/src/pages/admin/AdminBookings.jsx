import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw, Search, XCircle, Download } from "lucide-react";
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
        (status === "all" || String(b.status || "pending") === status) &&
        (payment === "all" || String(b.payment_method || "cash") === payment)
      );
    });
  }, [bookings, search, status, payment]);

  const cancelBooking = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    await api.put(`/admin/bookings/${id}/status`, { status: "Cancelled" });
    loadBookings();
  };

  const exportCSV = () => {
    const rows = [
      ["ID", "Property", "Guest", "Host", "Checkin", "Checkout", "Guests", "Total", "Payment", "Status"],
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

    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "servia-bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header title="Bookings Management" subtitle="Track reservations, payments, guests, hosts and cancellations." onRefresh={loadBookings} onExport={exportCSV} />

      <div className="mb-6 grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-4">
        <SearchBox value={search} setValue={setSearch} />

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-xl border px-4">
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select value={payment} onChange={(e) => setPayment(e.target.value)} className="h-12 rounded-xl border px-4">
          <option value="all">All Payment</option>
          <option value="cash">Cash</option>
          <option value="razorpay">Razorpay</option>
          <option value="card">Card</option>
        </select>

        <div className="flex items-center gap-2 rounded-xl bg-[#F4F1FF] px-4 font-bold text-[#8363F5]">
          <CalendarDays size={18} /> {filtered.length} Bookings
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm">
        {loading ? (
          <Empty text="Loading bookings..." />
        ) : filtered.length === 0 ? (
          <Empty text="No bookings found." />
        ) : (
          <div className="divide-y">
            {filtered.map((b) => (
              <div key={b.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-black">{b.property_title || "Property"}</h3>
                  <p className="mt-1 text-sm text-gray-500">Guest: {b.guest_name || "Guest"} · Host: {b.host_name || "Host"}</p>
                  <p className="mt-1 text-sm text-gray-500">{b.checkin} - {b.checkout} · {b.guests} guests</p>
                  <p className="mt-1 text-sm text-gray-500">Payment: {b.payment_method || "cash"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-black text-[#8363F5]">₹{Number(b.total || 0).toLocaleString("en-IN")}</span>
                  <StatusBadge status={b.status || "Pending"} />

                  {b.status !== "Cancelled" && (
                    <button onClick={() => cancelBooking(b.id)} className="flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 font-bold text-red-600 hover:bg-red-50">
                      <XCircle size={16} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ title, subtitle, onRefresh, onExport }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-4xl font-black text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-500">{subtitle}</p>
      </div>

      <div className="flex gap-3">
        <button onClick={onRefresh} className="flex items-center gap-2 rounded-xl border bg-white px-5 py-3 font-bold">
          <RefreshCw size={18} /> Refresh
        </button>

        <button onClick={onExport} className="flex items-center gap-2 rounded-xl bg-[#8363F5] px-5 py-3 font-bold text-white">
          <Download size={18} /> Export
        </button>
      </div>
    </div>
  );
}

function SearchBox({ value, setValue }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4">
      <Search size={18} className="text-gray-400" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search booking..." className="h-12 w-full outline-none" />
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Cancelled"
      ? "bg-red-100 text-red-600"
      : status === "Completed"
      ? "bg-blue-100 text-blue-700"
      : status === "Confirmed"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";

  return <span className={`rounded-full px-3 py-1 text-sm font-bold ${style}`}>{status}</span>;
}

function Empty({ text }) {
  return <div className="p-12 text-center text-gray-500">{text}</div>;
}