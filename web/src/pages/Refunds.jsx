import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Clock,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Refunds() {
  const navigate = useNavigate();

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    loadRefunds();
  }, []);

  const getUser = () =>
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadRefunds = async () => {
    try {
      setLoading(true);

      const user = getUser();
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/refunds/${user.id}`);
      setRefunds(res.data || []);
    } catch (err) {
      console.log("Refunds load failed:", err);
      alert("Refunds failed to load");
    } finally {
      setLoading(false);
    }
  };

  const filteredRefunds = useMemo(() => {
    let data = [...refunds];

    if (status !== "All") {
      data = data.filter((item) => item.status === status);
    }

    if (query.trim()) {
      const q = query.toLowerCase();

      data = data.filter((item) =>
        `${item.title || ""} ${item.location || ""} ${item.reason || ""} ${
          item.status || ""
        }`
          .toLowerCase()
          .includes(q)
      );
    }

    return data;
  }, [refunds, query, status]);

  const stats = useMemo(() => {
    const pending = refunds.filter((item) => item.status === "Pending");
    const approved = refunds.filter((item) => item.status === "Approved");
    const refunded = refunds.filter((item) => item.status === "Refunded");

    return {
      total: refunds.length,
      pending: pending.length,
      approved: approved.length,
      refundedAmount: refunded.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    };
  }, [refunds]);

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Refunds
            </h1>

            <p className="mt-2 text-gray-500">
              Track cancellation refunds, refund requests, and processing status.
            </p>
          </div>

          <button
            onClick={loadRefunds}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard
            icon={<Wallet />}
            title="Total Requests"
            value={stats.total}
            color="text-[#3b71e6]"
          />

          <StatCard
            icon={<Clock />}
            title="Pending"
            value={stats.pending}
            color="text-yellow-600"
          />

          <StatCard
            icon={<AlertCircle />}
            title="Approved"
            value={stats.approved}
            color="text-blue-600"
          />

          <StatCard
            icon={<Banknote />}
            title="Refunded Amount"
            value={formatINR(stats.refundedAmount)}
            color="text-green-600"
          />
        </div>

        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="flex h-12 items-center gap-3 rounded-xl border border-gray-300 bg-white px-4">
              <Search size={18} className="text-gray-400" />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search property, location, reason..."
                className="flex-1 bg-white text-sm outline-none"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Refunded</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Refund History
            </h2>

            <p className="mt-1 text-gray-500">
              Showing {filteredRefunds.length} refund records.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading refunds...
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mb-4 text-6xl">💸</div>

              <h3 className="text-2xl font-bold text-gray-900">
                No refunds found
              </h3>

              <p className="mt-2 text-gray-500">
                Refund requests will appear here after cancellations.
              </p>

              <button
                onClick={() => navigate("/trips")}
                className="mt-6 rounded-xl bg-[#3b71e6] px-6 py-3 font-semibold text-white hover:bg-[#7152E8]"
              >
                View Trips
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRefunds.map((refund) => (
                <RefundCard
                  key={refund.id}
                  refund={refund}
                  formatINR={formatINR}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function RefundCard({ refund, formatINR, navigate }) {
  return (
    <div className="p-6 transition hover:bg-gray-50">
      <div className="grid gap-6 lg:grid-cols-[110px_1fr_auto] lg:items-center">
        <img
          src={
            refund.image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80"
          }
          alt={refund.title}
          className="h-24 w-24 rounded-2xl object-cover"
        />

        <div>
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {refund.title || "Booking refund"}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {refund.location || "Location unavailable"}
              </p>
            </div>

            <StatusBadge status={refund.status} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <InfoPill
              icon={<CalendarDays size={16} />}
              label="Booking"
              value={`#${refund.booking_id}`}
            />

            <InfoPill
              icon={<CalendarDays size={16} />}
              label="Dates"
              value={`${refund.checkin || "-"} - ${refund.checkout || "-"}`}
            />

            <InfoPill
              icon={<Clock size={16} />}
              label="Requested"
              value={
                refund.created_at
                  ? new Date(refund.created_at).toLocaleDateString()
                  : "-"
              }
            />
          </div>

          {refund.reason && (
            <p className="mt-4 rounded-2xl bg-[#FAFAFC] p-4 text-sm text-gray-600">
              <strong>Reason:</strong> {refund.reason}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <p className="text-2xl font-bold text-[#3b71e6]">
            {formatINR(refund.amount)}
          </p>

          <button
            onClick={() => navigate(`/trip/${refund.booking_id}`)}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold hover:bg-gray-100"
          >
            View Trip
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#3b71e6]">
        {icon}
      </div>

      <p className="text-sm text-gray-500">{title}</p>

      <h2 className={`mt-2 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}

function InfoPill({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-4">
      <div className="mb-1 flex items-center gap-2 text-[#3b71e6]">
        {icon}
        <span className="text-xs font-bold uppercase text-gray-500">
          {label}
        </span>
      </div>

      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = status || "Pending";

  const style =
    value === "Refunded"
      ? "bg-green-100 text-green-700"
      : value === "Approved"
      ? "bg-blue-100 text-blue-700"
      : value === "Rejected"
      ? "bg-red-100 text-red-600"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${style}`}>
      {value}
    </span>
  );
}