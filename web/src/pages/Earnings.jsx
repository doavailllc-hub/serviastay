import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Home,
  IndianRupee,
  TrendingUp,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

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

  useEffect(() => {
    loadEarnings();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

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

  const totalRevenue = Number(summary.totalRevenue || 0);
  const confirmedRevenue = Number(summary.confirmedRevenue || 0);
  const pendingPayout = Number(summary.confirmedRevenue || 0);
  const totalBookings = Number(summary.totalBookings || 0);

  const bestMonth = useMemo(() => {
    if (!monthly.length) return null;

    return [...monthly].sort(
      (a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)
    )[0];
  }, [monthly]);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Earnings
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Track revenue, bookings and property performance from your hosted
              stays.
            </p>
          </div>

          <button
            onClick={() => navigate("/host-dashboard")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-[#3b71e6]"
          >
            Back to dashboard
          </button>
        </header>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard
                icon={<Wallet size={18} />}
                title="Total revenue"
                value={formatINR(totalRevenue)}
                subtitle="All booking revenue"
              />

              <StatCard
                icon={<TrendingUp size={18} />}
                title="Confirmed revenue"
                value={formatINR(confirmedRevenue)}
                subtitle="Confirmed reservations"
              />

              <StatCard
                icon={<CalendarDays size={18} />}
                title="Next payout"
                value={formatINR(pendingPayout)}
                subtitle="After guest check-in"
              />

              <StatCard
                icon={<IndianRupee size={18} />}
                title="Total bookings"
                value={totalBookings}
                subtitle="Guest reservations"
              />
            </section>

            <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
              <div className="space-y-8">
                <Panel
                  title="Property earnings"
                  description="Revenue grouped by each hosted property."
                >
                  {properties.length === 0 ? (
                    <EmptyState text="No property earnings yet." />
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {properties.map((item) => (
                        <PropertyRow
                          key={item.id}
                          item={item}
                          formatINR={formatINR}
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Monthly revenue"
                  description="Revenue performance by month."
                >
                  {monthly.length === 0 ? (
                    <EmptyState text="No monthly revenue yet." />
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {monthly.map((item) => (
                        <MonthlyRow
                          key={item.month}
                          item={item}
                          formatINR={formatINR}
                        />
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              <aside className="space-y-5">
                <SummaryCard
                  icon={<CalendarDays size={19} />}
                  title="Next payout"
                  label="Amount"
                  value={formatINR(pendingPayout)}
                  description="Estimated from confirmed reservations."
                />

                <SummaryCard
                  icon={<BarChart3 size={19} />}
                  title="Best month"
                  label={bestMonth?.month || "No data yet"}
                  value={bestMonth ? formatINR(bestMonth.revenue) : "—"}
                  description="Your highest revenue month."
                />

                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <h2 className="text-base font-semibold text-gray-950">
                    Earning tip
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Keep listings updated with clear photos, fair pricing and
                    quick replies to improve booking quality.
                  </p>

                  <button
                    onClick={() => navigate("/host-listings")}
                    className="mt-4 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
                  >
                    Manage listings
                  </button>
                </section>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
        </div>

        <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
        {icon}
      </div>

      <p className="text-sm text-gray-500">{title}</p>

      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
        {value}
      </h2>

      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </article>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-xl font-semibold tracking-tight text-gray-950">
          {title}
        </h2>

        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      {children}
    </section>
  );
}

function PropertyRow({ item, formatINR }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img
          src={item.image || FALLBACK_IMAGE}
          alt={item.title || "Property"}
          className="h-16 w-16 rounded-xl object-cover"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />

        <div>
          <h3 className="text-sm font-semibold text-gray-950">
            {item.title || "Property"}
          </h3>

          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <Home size={14} />
            {item.bookings || 0} bookings
          </p>
        </div>
      </div>

      <p className="text-sm font-semibold text-gray-950">
        {formatINR(item.revenue)}
      </p>
    </div>
  );
}

function MonthlyRow({ item, formatINR }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-gray-50">
      <div>
        <p className="text-sm font-semibold text-gray-950">{item.month}</p>

        <p className="mt-1 text-sm text-gray-500">
          {item.bookings || 0} bookings
        </p>
      </div>

      <p className="text-sm font-semibold text-[#3b71e6]">
        {formatINR(item.revenue)}
      </p>
    </div>
  );
}

function SummaryCard({ icon, title, label, value, description }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
        {icon}
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-gray-950">
        {title}
      </h2>

      <p className="mt-3 text-sm text-gray-500">{label}</p>

      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
        {value}
      </p>

      <p className="mt-3 text-sm leading-6 text-gray-500">{description}</p>
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center px-5 text-center">
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}