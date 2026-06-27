import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Download,
  Home,
  MapPin,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import api from "../api/api";

export default function Analytics() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login", { replace: true });
  };

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);

      const adminUser = JSON.parse(
        localStorage.getItem("adminUser") || "null"
      );
      const adminToken = localStorage.getItem("adminToken");

      if (!adminUser || !adminToken) {
        navigate("/admin/login", { replace: true });
        return;
      }

      if (adminUser.role !== "admin") {
        logoutAdmin();
        return;
      }

      const res = await api.get("/admin/analytics");
      setData(res.data || {});
    } catch (err) {
      console.log("Analytics load failed:", err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        logoutAdmin();
        return;
      }

      setData({
        revenue: {
          totalRevenue: 0,
          todayRevenue: 0,
          monthlyRevenue: 0,
        },
        revenueTrend: [],
        userGrowth: [],
        topCities: [],
        topProperties: [],
        topHosts: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const revenue = data?.revenue || {};
  const revenueTrend = data?.revenueTrend || [];
  const userGrowth = data?.userGrowth || [];
  const topCities = data?.topCities || [];
  const topProperties = data?.topProperties || [];
  const topHosts = data?.topHosts || [];

  const maxRevenue = useMemo(() => {
    return Math.max(
      ...revenueTrend.map((item) => Number(item.revenue || 0)),
      1
    );
  }, [revenueTrend]);

  const maxUsers = useMemo(() => {
    return Math.max(...userGrowth.map((item) => Number(item.users || 0)), 1);
  }, [userGrowth]);

  const exportCSV = () => {
    if (!data) return;

    const rows = [
      ["Metric", "Value"],
      ["Total Revenue", revenue.totalRevenue || 0],
      ["Today Revenue", revenue.todayRevenue || 0],
      ["Monthly Revenue", revenue.monthlyRevenue || 0],
      [],
      ["Top Cities", "Total"],
      ...(topCities || []).map((item) => [item.location, item.total]),
      [],
      ["Top Properties", "Revenue", "Bookings"],
      ...(topProperties || []).map((item) => [
        item.title,
        item.revenue || 0,
        item.bookings || 0,
      ]),
      [],
      ["Top Hosts", "Revenue", "Bookings"],
      ...(topHosts || []).map((item) => [
        item.fullname || item.email || "Host",
        item.revenue || 0,
        item.bookings || 0,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `servia-analytics-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-3xl bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#E9E4FF] border-t-[3b71e6]" />
          <p className="font-semibold text-gray-700">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[3b71e6]">
            Admin Analytics
          </p>

          <h1 className="mt-2 text-4xl font-black text-gray-900">
            Platform Analytics
          </h1>

          <p className="mt-2 max-w-2xl text-gray-500">
            Monitor revenue, growth, bookings, hosts, top-performing
            properties, and destination insights.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadAnalytics}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl bg-[3b71e6] px-5 py-3 font-semibold text-white hover:bg-[#7152E8]"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <StatCard
          icon={<Wallet />}
          title="Total Revenue"
          value={formatINR(revenue.totalRevenue)}
          color="text-[3b71e6]"
        />

        <StatCard
          icon={<TrendingUp />}
          title="Today Revenue"
          value={formatINR(revenue.todayRevenue)}
          color="text-green-600"
        />

        <StatCard
          icon={<CalendarDays />}
          title="This Month"
          value={formatINR(revenue.monthlyRevenue)}
          color="text-yellow-600"
        />
      </div>

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <ChartCard title="Revenue Trend" icon={<BarChart3 />}>
          {revenueTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <BarChart
              data={revenueTrend}
              maxValue={maxRevenue}
              valueKey="revenue"
              labelKey="date"
              valueFormatter={formatINR}
              barClass="bg-[3b71e6]"
            />
          )}
        </ChartCard>

        <ChartCard title="User Growth" icon={<Users />}>
          {userGrowth.length === 0 ? (
            <EmptyChart />
          ) : (
            <BarChart
              data={userGrowth}
              maxValue={maxUsers}
              valueKey="users"
              labelKey="date"
              valueFormatter={(value) => `${value} users`}
              barClass="bg-green-500"
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Leaderboard
          title="Top Properties"
          icon={<Home />}
          items={topProperties}
          render={(item, index) => (
            <div
              key={item.id || index}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4"
            >
              <img
                src={
                  item.image ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80"
                }
                alt={item.title || "Property"}
                className="h-14 w-14 rounded-xl object-cover"
              />

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold">
                  {item.title || "Property"}
                </h3>

                <p className="truncate text-sm text-gray-500">
                  {item.location || "Unknown location"}
                </p>

                <p className="mt-1 text-sm font-semibold text-[3b71e6]">
                  {formatINR(item.revenue)} · {item.bookings || 0} bookings
                </p>
              </div>
            </div>
          )}
        />

        <Leaderboard
          title="Top Hosts"
          icon={<Users />}
          items={topHosts}
          render={(item, index) => (
            <div
              key={item.id || index}
              className="rounded-2xl border border-gray-100 p-4"
            >
              <h3 className="font-bold">{item.fullname || "Host"}</h3>

              <p className="truncate text-sm text-gray-500">
                {item.email || "-"}
              </p>

              <p className="mt-2 text-sm font-semibold text-[3b71e6]">
                {formatINR(item.revenue)} · {item.bookings || 0} bookings
              </p>
            </div>
          )}
        />

        <Leaderboard
          title="Top Cities"
          icon={<MapPin />}
          items={topCities}
          render={(item, index) => (
            <div
              key={`${item.location}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-gray-100 p-4"
            >
              <div>
                <h3 className="font-bold">{item.location || "Unknown"}</h3>
                <p className="text-sm text-gray-500">Destination</p>
              </div>

              <span className="rounded-full bg-[#F4F1FF] px-4 py-2 text-sm font-bold text-[3b71e6]">
                {item.total || 0}
              </span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[3b71e6]">
        {icon}
      </div>

      <p className="text-sm font-medium text-gray-500">{title}</p>

      <h2 className={`mt-2 text-3xl font-black ${color}`}>{value}</h2>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[3b71e6]">
          {icon}
        </div>

        <h2 className="text-2xl font-black">{title}</h2>
      </div>

      {children}
    </div>
  );
}

function BarChart({
  data,
  maxValue,
  valueKey,
  labelKey,
  valueFormatter,
  barClass,
}) {
  return (
    <div className="flex h-72 items-end gap-3">
      {data.map((item, index) => {
        const value = Number(item[valueKey] || 0);
        const height = (value / maxValue) * 100;

        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={`w-full rounded-t-xl ${barClass}`}
              style={{ height: `${Math.max(height, 5)}%` }}
              title={valueFormatter(value)}
            />

            <span className="text-[10px] text-gray-400">
              {formatDate(item[labelKey])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Leaderboard({ title, icon, items, render }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[3b71e6]">
          {icon}
        </div>

        <h2 className="text-xl font-black">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">No data yet.</p>
      ) : (
        <div className="space-y-4">{items.map(render)}</div>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl bg-[#FAFAFC] text-gray-500">
      No chart data yet.
    </div>
  );
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}