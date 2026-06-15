import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  CalendarDays,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Earnings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadEarnings = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/bookings/${user.id}`);
      setBookings(res.data || []);
    } catch (err) {
      console.log("Earnings load failed:", err);

      localStorage.removeItem("user");
      localStorage.removeItem("token");

      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const activeBookings = bookings.filter(
    (item) => item.status !== "Cancelled"
  );

  const totalEarnings = activeBookings.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  const pendingPayout = activeBookings
    .filter((item) => item.status === "Pending")
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  const confirmedEarnings = activeBookings
    .filter((item) => item.status === "Confirmed")
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  const completedBookings = activeBookings.length;

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Earnings
            </h1>

            <p className="mt-2 text-gray-500">
              Track your revenue, payouts, and booking income.
            </p>
          </div>

          <button
            onClick={() => navigate("/host-dashboard")}
            className="rounded-xl bg-[#8363F5] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#7152E8]"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-4">
          <StatCard
            icon={<Wallet />}
            title="Total Earnings"
            value={formatINR(totalEarnings)}
            color="text-[#8363F5]"
          />

          <StatCard
            icon={<TrendingUp />}
            title="Confirmed"
            value={formatINR(confirmedEarnings)}
            color="text-green-600"
          />

          <StatCard
            icon={<Clock />}
            title="Pending Payout"
            value={formatINR(pendingPayout)}
            color="text-yellow-600"
          />

          <StatCard
            icon={<CheckCircle />}
            title="Bookings"
            value={completedBookings}
            color="text-gray-900"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-2xl font-semibold">
                Payout History
              </h2>

              <p className="mt-1 text-gray-500">
                Your confirmed and pending booking earnings.
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                Loading earnings...
              </div>
            ) : activeBookings.length === 0 ? (
              <div className="p-14 text-center">
                <div className="mb-4 text-6xl">💰</div>

                <h3 className="text-2xl font-bold">
                  No earnings yet
                </h3>

                <p className="mt-2 text-gray-500">
                  Your booking earnings will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {activeBookings.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-5 p-6 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex gap-4">
                      <img
                        src={
                          item.image ||
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                        }
                        alt={item.title}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />

                      <div>
                        <h3 className="font-bold text-gray-900">
                          {item.title || "Property booking"}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          📅 {item.checkin} - {item.checkout}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          💳 {item.payment_method || "cash"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <StatusBadge status={item.status || "Confirmed"} />

                      <span className="text-xl font-bold text-[#8363F5]">
                        {formatINR(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#8363F5]">
                <CalendarDays />
              </div>

              <h2 className="text-2xl font-bold">
                Next Payout
              </h2>

              <p className="mt-2 text-gray-500">
                Estimated payout from pending reservations.
              </p>

              <div className="mt-6 rounded-2xl bg-[#FAFAFC] p-5">
                <p className="text-sm text-gray-500">Amount</p>
                <h3 className="mt-1 text-3xl font-bold text-[#8363F5]">
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

            <div className="rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] p-6 text-white shadow-xl">
              <h2 className="text-2xl font-bold">
                Keep earning 🚀
              </h2>

              <p className="mt-3 text-white/90">
                Update your listings with better photos, competitive pricing,
                and quick replies to increase your bookings.
              </p>

              <button
                onClick={() => navigate("/host-listings")}
                className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-[#8363F5]"
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

function StatCard({ icon, title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#8363F5]">
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
  const style =
    status === "Cancelled"
      ? "bg-red-100 text-red-600"
      : status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-semibold ${style}`}
    >
      {status}
    </span>
  );
}