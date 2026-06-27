import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function PaymentHistory() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadPayments = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/payments/${user.id}`);
      setPayments(res.data || []);
    } catch (err) {
      console.log("Payments load failed:", err);
      alert("Payments failed to load");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    let data = [...payments];

    if (status !== "All") {
      data = data.filter(
        (item) => String(item.status || "").toLowerCase() === status.toLowerCase()
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();

      data = data.filter((item) =>
        `${item.title || ""} ${item.location || ""} ${
          item.transaction_id || ""
        } ${item.razorpay_payment_id || ""} ${item.payment_method || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (sort === "Oldest") {
      data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === "Highest Amount") {
      data.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    } else if (sort === "Lowest Amount") {
      data.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
    } else {
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return data;
  }, [payments, status, sort, query]);

  const paidPayments = payments.filter((item) => item.status === "Paid");
  const pendingPayments = payments.filter(
    (item) => item.status === "Created" || item.status === "Pending"
  );
  const failedPayments = payments.filter((item) => item.status === "Failed");

  const totalPaid = paidPayments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const exportCSV = () => {
    const rows = [
      ["Property", "Location", "Amount", "Method", "Status", "Transaction", "Date"],
      ...filteredPayments.map((item) => [
        item.title || "",
        item.location || "",
        item.amount || "",
        item.payment_method || item.status || "",
        item.status || "",
        item.razorpay_payment_id || item.transaction_id || item.razorpay_order_id || "",
        item.created_at || "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "servia-payment-history.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading payment history...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Payment History
            </h1>

            <p className="mt-2 text-gray-500">
              View your payments, receipts, transaction status, and booking charges.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadPayments}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl bg-[3b71e6] px-5 py-3 font-semibold text-white hover:bg-[#7152E8]"
            >
              <Download size={18} />
              Export CSV
            </button>

            <button
              onClick={printReport}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard
            icon={<Wallet />}
            title="Total Paid"
            value={formatINR(totalPaid)}
            color="text-[3b71e6]"
          />

          <StatCard
            icon={<CheckCircle />}
            title="Paid Payments"
            value={paidPayments.length}
            color="text-green-600"
          />

          <StatCard
            icon={<Clock />}
            title="Pending"
            value={pendingPayments.length}
            color="text-yellow-600"
          />

          <StatCard
            icon={<XCircle />}
            title="Failed"
            value={failedPayments.length}
            color="text-red-500"
          />
        </div>

        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
            <div className="flex h-12 items-center gap-3 rounded-xl border border-gray-300 px-4">
              <Search size={18} className="text-gray-400" />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search property, location, method, transaction..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex h-12 items-center gap-3 rounded-xl border border-gray-300 px-4">
              <Filter size={18} className="text-gray-400" />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
              >
                <option>All</option>
                <option>Paid</option>
                <option>Created</option>
                <option>Pending</option>
                <option>Failed</option>
                <option>Refunded</option>
              </select>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-12 rounded-xl border border-gray-300 px-4 text-sm outline-none"
            >
              <option>Newest</option>
              <option>Oldest</option>
              <option>Highest Amount</option>
              <option>Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-2xl font-semibold">
              Transactions
            </h2>

            <p className="mt-1 text-gray-500">
              Showing {filteredPayments.length} payment records.
            </p>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mb-4 text-6xl">💳</div>

              <h3 className="text-2xl font-bold">No payments found</h3>

              <p className="mt-2 text-gray-500">
                Your payment transactions will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  formatINR={formatINR}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PaymentCard({ payment, formatINR }) {
  const method =
    payment.payment_method ||
    (payment.razorpay_payment_id ? "Razorpay" : "Payment");

  const transactionId =
    payment.razorpay_payment_id ||
    payment.transaction_id ||
    payment.razorpay_order_id ||
    "Not available";

  return (
    <div className="flex flex-col gap-5 p-6 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-4">
        <img
          src={
            payment.image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80"
          }
          alt={payment.title}
          className="h-24 w-24 rounded-2xl object-cover"
        />

        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {payment.title || "Property payment"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {payment.location || "Location unavailable"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Method: <span className="capitalize">{method}</span>
          </p>

          <p className="mt-1 max-w-xl truncate text-xs text-gray-400">
            Transaction: {transactionId}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {payment.created_at
              ? new Date(payment.created_at).toLocaleString()
              : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:items-end">
        <p className="text-2xl font-bold text-[3b71e6]">
          {formatINR(payment.amount)}
        </p>

        <StatusBadge status={payment.status} />
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[3b71e6]">
        {icon}
      </div>

      <p className="text-sm text-gray-500">{title}</p>

      <h2 className={`mt-2 text-3xl font-bold ${color}`}>
        {value}
      </h2>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = status || "Created";

  const style =
    value === "Paid"
      ? "bg-green-100 text-green-700"
      : value === "Failed"
      ? "bg-red-100 text-red-600"
      : value === "Refunded"
      ? "bg-blue-100 text-blue-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`rounded-full px-4 py-2 text-sm font-semibold ${style}`}>
      {value}
    </span>
  );
}