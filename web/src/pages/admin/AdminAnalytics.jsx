import { useEffect, useState } from "react";
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


import api from "../../api/api";

export default function Analytics() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadAnalytics = async () => {
    try {
      setLoading(true);

const user = JSON.parse(localStorage.getItem("adminUser"));
const token = localStorage.getItem("adminToken");

   if (!user || !token) {
  navigate("/admin/login");
  return;
}

if (user.role !== "admin") {
  localStorage.removeItem("adminUser");
  localStorage.removeItem("adminToken");
  navigate("/admin/login");
  return;
}
      const res = await api.get("/admin/analytics");
      setData(res.data);
    } catch (err) {
      console.log("Analytics load failed:", err);

      if (err.response?.status === 403) {
        alert("Admin access only");
        navigate("/home");
        return;
      }

      alert("Analytics failed to load");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;

    const rows = [
      ["Metric", "Value"],
      ["Total Revenue", data.revenue?.totalRevenue || 0],
      ["Today Revenue", data.revenue?.todayRevenue || 0],
      ["Monthly Revenue", data.revenue?.monthlyRevenue || 0],
      ["Top Cities", ""],
      ...(data.topCities || []).map((item) => [item.location, item.total]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "servia-analytics.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading analytics...
        </main>
      </div>
    );
  }

  const revenue = data?.revenue || {};
  const revenueTrend = data?.revenueTrend || [];
  const userGrowth = data?.userGrowth || [];
  const topCities = data?.topCities || [];
  const topProperties = data?.topProperties || [];
  const topHosts = data?.topHosts || [];

  const maxRevenue = Math.max(
    ...revenueTrend.map((item) => Number(item.revenue || 0)),
    1
  );

  const maxUsers = Math.max(
    ...userGrowth.map((item) => Number(item.users || 0)),
    1
  );

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Analytics
            </h1>

            <p className="mt-2 text-gray-500">
              Platform revenue, growth, bookings, hosts, and destination insights.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAnalytics}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl bg-[#8363F5] px-5 py-3 font-semibold text-white hover:bg-[#7152E8]"
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
            color="text-[#8363F5]"
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
              <div className="flex h-72 items-end gap-3">
                {revenueTrend.map((item, index) => {
                  const height =
                    (Number(item.revenue || 0) / maxRevenue) * 100;

                  return (
                    <div
                      key={index}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="w-full rounded-t-xl bg-[#8363F5]"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={formatINR(item.revenue)}
                      />

                      <span className="text-[10px] text-gray-400">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          <ChartCard title="User Growth" icon={<Users />}>
            {userGrowth.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="flex h-72 items-end gap-3">
                {userGrowth.map((item, index) => {
                  const height = (Number(item.users || 0) / maxUsers) * 100;

                  return (
                    <div
                      key={index}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="w-full rounded-t-xl bg-green-500"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${item.users} users`}
                      />

                      <span className="text-[10px] text-gray-400">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
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
                  alt={item.title}
                  className="h-14 w-14 rounded-xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{item.title}</h3>
                  <p className="truncate text-sm text-gray-500">
                    {item.location}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#8363F5]">
                    {formatINR(item.revenue)} · {item.bookings} bookings
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
                <p className="text-sm text-gray-500">{item.email}</p>
                <p className="mt-2 text-sm font-semibold text-[#8363F5]">
                  {formatINR(item.revenue)} · {item.bookings} bookings
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
                key={index}
                className="flex items-center justify-between rounded-2xl border border-gray-100 p-4"
              >
                <div>
                  <h3 className="font-bold">{item.location || "Unknown"}</h3>
                  <p className="text-sm text-gray-500">Destination</p>
                </div>

                <span className="rounded-full bg-[#F4F1FF] px-4 py-2 text-sm font-bold text-[#8363F5]">
                  {item.total}
                </span>
              </div>
            )}
          />
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

function ChartCard({ title, icon, children }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#8363F5]">
          {icon}
        </div>

        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      {children}
    </div>
  );
}

function Leaderboard({ title, icon, items, render }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#8363F5]">
          {icon}
        </div>

        <h2 className="text-xl font-bold">{title}</h2>
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