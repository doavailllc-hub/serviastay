import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  Home,
  IndianRupee,
  Loader2,
  Map,
  Star,
  Wallet,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function HostDashboard() {
  const navigate = useNavigate();

  const [stays, setStays] = useState([]);
  const [trips, setTrips] = useState([]);
  const [stayBookings, setStayBookings] = useState([]);
  const [tripBookings, setTripBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.bookings)) return data.bookings;
    if (Array.isArray(data?.properties)) return data.properties;
    if (Array.isArray(data?.packages)) return data.packages;
    return [];
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user?.id || !token) {
        navigate("/");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
const [staysRes, tripsRes, stayBookingsRes, tripBookingsRes] =
  await Promise.allSettled([
    api.get(`/my-properties/${user.id}`, { headers }),
    api.get(`/host/trip-packages`, { headers }),
    api.get(`/host/reservations/${user.id}`, { headers }),
    api.get(`/host/package-bookings`, { headers }),
  ]);
      const allResponses = [
        staysRes,
        tripsRes,
        stayBookingsRes,
        tripBookingsRes,
      ];

      const authFailed = allResponses.some(
        (res) =>
          res.status === "rejected" &&
          [401, 403].includes(res.reason?.response?.status)
      );

      if (authFailed) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      setStays(staysRes.status === "fulfilled" ? getArray(staysRes.value.data) : []);
      setTrips(tripsRes.status === "fulfilled" ? getArray(tripsRes.value.data) : []);
      setStayBookings(
        stayBookingsRes.status === "fulfilled"
          ? getArray(stayBookingsRes.value.data)
          : []
      );
      setTripBookings(
        tripBookingsRes.status === "fulfilled"
          ? getArray(tripBookingsRes.value.data)
          : []
      );

      if (allResponses.some((res) => res.status === "rejected")) {
        setError("Some host data could not be loaded. Please check backend routes.");
      }
    } catch (err) {
      console.log("Host dashboard failed:", err);
      setError(err.response?.data?.message || "Dashboard load failed.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const validStayBookings = stayBookings.filter(
      (item) => String(item.status || "").toLowerCase() !== "cancelled"
    );

    const validTripBookings = tripBookings.filter(
      (item) => String(item.status || "").toLowerCase() !== "cancelled"
    );

    const stayEarnings = validStayBookings.reduce(
      (sum, item) => sum + Number(item.total || item.amount || 0),
      0
    );

    const tripBookingEarnings = validTripBookings.reduce(
      (sum, item) => sum + Number(item.total || item.amount || 0),
      0
    );

    const tripPackageEarnings = trips.reduce(
      (sum, item) => sum + Number(item.revenue || 0),
      0
    );

    const tripEarnings = tripBookingEarnings || tripPackageEarnings;

    return {
      stays: stays.length,
      trips: trips.length,
      bookings: validStayBookings.length + validTripBookings.length,
      stayEarnings,
      tripEarnings,
      totalEarnings: stayEarnings + tripEarnings,
    };
  }, [stays, trips, stayBookings, tripBookings]);

  return (
    <div className="min-h-screen bg-[#f8fafd] text-[#202124]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-8">
        <section className="rounded-[28px] border border-[#dadce0] bg-white px-6 py-7 md:px-8">
          <p className="text-sm font-medium text-[#1a73e8]">Host dashboard</p>

          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
                Welcome back
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6368]">
                Track your stays, trips, bookings and earnings from one simple
                place.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              className="h-10 rounded-full border border-[#dadce0] bg-white px-5 text-sm font-medium text-[#1a73e8] transition hover:bg-[#f1f5ff]"
            >
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex min-h-[260px] items-center justify-center rounded-[28px] border border-[#dadce0] bg-white">
            <Loader2 className="animate-spin text-[#1a73e8]" size={34} />
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<IndianRupee size={20} />}
                title="Total earnings"
                value={formatINR(stats.totalEarnings)}
                text="Stay + trip income"
              />

              <MetricCard
                icon={<Home size={20} />}
                title="Uploaded stays"
                value={stats.stays}
                text="Your stay listings"
              />

              <MetricCard
                icon={<Map size={20} />}
                title="Uploaded trips"
                value={stats.trips}
                text="Your trip packages"
              />

              <MetricCard
                icon={<CalendarDays size={20} />}
                title="Bookings"
                value={stats.bookings}
                text="Active reservations"
              />
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-2">
              <EarningCard
                icon={<Wallet size={21} />}
                title="Stay earnings"
                value={formatINR(stats.stayEarnings)}
                text="Income from your hosted stays."
                onClick={() => navigate("/earnings")}
              />

              <EarningCard
                icon={<Map size={21} />}
                title="Trip earnings"
                value={formatINR(stats.tripEarnings)}
                text="Income from your hosted trip packages."
                onClick={() => navigate("/host-package-bookings")}
              />
            </section>

            <section className="mt-8 rounded-[28px] border border-[#dadce0] bg-white p-3">
              <OptionRow
                icon={<IndianRupee size={20} />}
                title="Earnings"
                text="View your full earning details"
                onClick={() => navigate("/earnings")}
              />
<OptionRow
  icon={<Wallet size={20} />}
  title="Wallet & Payouts"
  text="Withdraw earnings and manage payouts"
  onClick={() => navigate("/host-wallet")}
/>
<OptionRow
  icon={<ShieldCheck size={20} />}
  title="Identity Verification"
  text="Verify your identity to unlock payouts"
  onClick={() => navigate("/host-verification")}
/>
              <OptionRow
                icon={<Home size={20} />}
                title="Stay listings"
                text="Manage your uploaded stay listings"
                onClick={() => navigate("/host-listings")}
              />

              <OptionRow
                icon={<Map size={20} />}
                title="Trip packages"
                text="Manage your uploaded trip packages"
                onClick={() => navigate("/host-trip-packages")}
              />

              <OptionRow
                icon={<CalendarDays size={20} />}
                title="Bookings"
                text="View reservations and package bookings"
                onClick={() => navigate("/host-package-bookings")}
              />

              <OptionRow
                icon={<Star size={20} />}
                title="Reviews"
                text="Read guest feedback"
                onClick={() => navigate("/host-reviews")}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({ icon, title, value, text }) {
  return (
    <article className="rounded-[24px] border border-[#dadce0] bg-white p-5 transition hover:shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
        {icon}
      </div>

      <p className="text-sm text-[#5f6368]">{title}</p>

      <h3 className="mt-2 text-3xl font-medium tracking-tight text-[#202124]">
        {value}
      </h3>

      <p className="mt-2 text-sm text-[#5f6368]">{text}</p>
    </article>
  );
}

function EarningCard({ icon, title, value, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-[28px] border border-[#dadce0] bg-white p-6 text-left transition hover:bg-[#f8fafd] hover:shadow-sm"
    >
      <div className="flex items-center gap-3 text-[#1a73e8]">
        {icon}
        <h3 className="text-base font-medium text-[#202124]">{title}</h3>
      </div>

      <h2 className="mt-5 text-3xl font-medium tracking-tight text-[#202124]">
        {value}
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#5f6368]">{text}</p>
    </button>
  );
}

function OptionRow({ icon, title, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left transition hover:bg-[#f1f5ff]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-[#202124]">{title}</h3>
        <p className="mt-1 truncate text-sm text-[#5f6368]">{text}</p>
      </div>

      <ChevronRight size={18} className="text-[#5f6368]" />
    </button>
  );
}