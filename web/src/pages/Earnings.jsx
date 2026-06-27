import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  CalendarDays,
  Home,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

export default function Earnings() {
  const navigate = useNavigate();

  const [earnings, setEarnings] = useState({
    summary: {},
    monthly: [],
    properties: [],
  });
  const [loading, setLoading] = useState(false);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user?.id || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/host/earnings/${user.id}`);
      setEarnings(res.data || { summary: {}, monthly: [], properties: [] });
    } catch (err) {
      console.log("Earnings load failed:", err);
      toast.error(err.response?.data?.message || "Earnings load failed");
    } finally {
      setLoading(false);
    }
  };

  const summary = earnings.summary || {};
  const monthly = earnings.monthly || [];
  const properties = earnings.properties || [];

  const pendingPayout = Number(summary.confirmedRevenue || 0);
  const totalRevenue = Number(summary.totalRevenue || 0);
  const confirmedRevenue = Number(summary.confirmedRevenue || 0);
  const totalBookings = Number(summary.totalBookings || 0);

  const bestMonth = useMemo(() => {
    if (!monthly.length) return null;
    return [...monthly].sort(
      (a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)
    )[0];
  }, [monthly]);

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Earnings</h1>
            <p className="mt-2 text-gray-500">
              Real-time revenue from your hosted properties.
            </p>
          </div>

          <button
            onClick={() => navigate("/host-dashboard")}
            className="rounded-xl bg-[#3b71e6] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#6f43e4]"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-4">
          <StatCard
            icon={<Wallet />}
            title="Total Revenue"
            value={formatINR(totalRevenue)}
            color="text-[#3b71e6]"
          />

          <StatCard
            icon={<TrendingUp />}
            title="Confirmed Revenue"
            value={formatINR(confirmedRevenue)}
            color="text-green-600"
          />

          <StatCard
            icon={<Clock />}
            title="Next Payout"
            value={formatINR(pendingPayout)}
            color="text-yellow-600"
          />

          <StatCard
            icon={<CheckCircle />}
            title="Total Bookings"
            value={totalBookings}
            color="text-gray-900"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b p-6">
                <h2 className="text-2xl font-semibold">
                  Property Earnings
                </h2>
                <p className="mt-1 text-gray-500">
                  Revenue grouped by each property.
                </p>
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-500">
                  Loading earnings...
                </div>
              ) : properties.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y">
                  {properties.map((item) => (
                    <PropertyRow
                      key={item.id}
                      item={item}
                      formatINR={formatINR}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b p-6">
                <h2 className="text-2xl font-semibold">
                  Monthly Revenue
                </h2>
                <p className="mt-1 text-gray-500">
                  Last 12 months performance.
                </p>
              </div>

              {monthly.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No monthly revenue yet.
                </div>
              ) : (
                <div className="divide-y">
                  {monthly.map((item) => (
                    <div
                      key={item.month}
                      className="flex items-center justify-between p-5"
                    >
                      <div>
                        <p className="font-bold text-gray-900">
                          {item.month}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.bookings} bookings
                        </p>
                      </div>

                      <p className="text-lg font-bold text-[#3b71e6]">
                        {formatINR(item.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#3b71e6]">
                <CalendarDays />
              </div>

              <h2 className="text-2xl font-bold">Next Payout</h2>
              <p className="mt-2 text-gray-500">
                Estimated payout from confirmed reservations.
              </p>

              <div className="mt-6 rounded-2xl bg-[#FAFAFC] p-5">
                <p className="text-sm text-gray-500">Amount</p>
                <h3 className="mt-1 text-3xl font-bold text-[#3b71e6]">
                  {formatINR(pendingPayout)}
                </h3>
              </div>

              <div className="mt-4 rounded-2xl bg-[#FAFAFC] p-5">
                <p className="text-sm text-gray-500">Expected date</p>
                <h3 className="mt-1 font-bold text-gray-900">
                  After guest check-in
                </h3>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#3b71e6]">
                <BarChart3 />
              </div>

              <h2 className="text-2xl font-bold">Best Month</h2>

              {bestMonth ? (
                <>
                  <p className="mt-2 text-gray-500">{bestMonth.month}</p>
                  <h3 className="mt-4 text-3xl font-bold text-[#3b71e6]">
                    {formatINR(bestMonth.revenue)}
                  </h3>
                </>
              ) : (
                <p className="mt-2 text-gray-500">
                  Revenue insights will appear after bookings.
                </p>
              )}
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-[#3b71e6] to-[#6f43e4] p-6 text-white shadow-xl">
              <h2 className="text-2xl font-bold">Keep earning 🚀</h2>

              <p className="mt-3 text-white/90">
                Update your listings with better photos, competitive pricing,
                and quick replies to increase your bookings.
              </p>

              <button
                onClick={() => navigate("/host-listings")}
                className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-[#3b71e6]"
              >
                Manage Listings
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PropertyRow({ item, formatINR }) {
  return (
    <div className="flex flex-col gap-5 p-6 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-4">
        <img
          src={item.image || FALLBACK_IMAGE}
          alt={item.title}
          className="h-20 w-20 rounded-2xl object-cover"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />

        <div>
          <h3 className="font-bold text-gray-900">
            {item.title || "Property"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            <Home size={14} className="mr-1 inline" />
            {item.bookings || 0} bookings
          </p>
        </div>
      </div>

      <span className="text-xl font-bold text-[#3b71e6]">
        {formatINR(item.revenue)}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-14 text-center">
      <div className="mb-4 text-6xl">💰</div>
      <h3 className="text-2xl font-bold">No earnings yet</h3>
      <p className="mt-2 text-gray-500">
        Your booking earnings will appear here.
      </p>
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