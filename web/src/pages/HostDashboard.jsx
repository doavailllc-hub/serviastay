import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Edit,
  Eye,
  Home,
  IndianRupee,
  ListChecks,
  Loader2,
  Map,
  Plus,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

const FALLBACK_STAY =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_TRIP =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

export default function HostDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [stays, setStays] = useState([]);
  const [trips, setTrips] = useState([]);
  const [stayBookings, setStayBookings] = useState([]);
  const [tripBookings, setTripBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingTripId, setDeletingTripId] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const hostOwns = (item) => {
    if (!user?.id || !item) return false;

    const hostId = String(user.id);

    return [
      item.host_id,
      item.hostId,
      item.user_id,
      item.userId,
      item.owner_id,
      item.ownerId,
      item.created_by,
      item.createdBy,
    ]
      .filter(Boolean)
      .map(String)
      .includes(hostId);
  };

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.properties)) return data.properties;
    if (Array.isArray(data?.packages)) return data.packages;
    if (Array.isArray(data?.bookings)) return data.bookings;
    return [];
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!storedUser?.id || !token) {
        navigate("/");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const requests = await Promise.allSettled([
        api.get(`/my-properties/${storedUser.id}`, { headers }),
        api.get(`/host/reservations/${storedUser.id}`, { headers }),
        api.get(`/host/trip-packages`, { headers }),
        api.get(`/host/package-bookings/${storedUser.id}`, { headers }),
      ]);

      const [staysRes, stayBookingsRes, tripsRes, tripBookingsRes] = requests;

      const authFailed = requests.some(
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

      const staysData =
        staysRes.status === "fulfilled" ? normalizeArray(staysRes.value.data) : [];

      const tripsData =
        tripsRes.status === "fulfilled" ? normalizeArray(tripsRes.value.data) : [];

      const cleanStays = staysData.filter((item) => hostOwns(item) || true);
      const cleanTrips = tripsData.filter((item) => hostOwns(item) || true);

      const stayIds = new Set(cleanStays.map((item) => String(item.id)));
      const tripIds = new Set(cleanTrips.map((item) => String(item.id)));

      const stayBookingsData =
        stayBookingsRes.status === "fulfilled"
          ? normalizeArray(stayBookingsRes.value.data)
          : [];

      const tripBookingsData =
        tripBookingsRes.status === "fulfilled"
          ? normalizeArray(tripBookingsRes.value.data)
          : [];

      setStays(cleanStays);

      setTrips(
        cleanTrips.filter((item) => {
          if (!user?.id) return true;
          if (hostOwns(item)) return true;
          return !item.host_id && !item.user_id && !item.owner_id;
        })
      );

      setStayBookings(
        stayBookingsData.filter((booking) => {
          if (hostOwns(booking)) return true;
          return stayIds.has(String(booking.property_id || booking.stay_id));
        })
      );

      setTripBookings(
        tripBookingsData.filter((booking) => {
          if (hostOwns(booking)) return true;
          return tripIds.has(String(booking.package_id || booking.trip_id));
        })
      );

      if (requests.some((res) => res.status === "rejected")) {
        setLoadError("Some dashboard data could not be loaded.");
      }
    } catch (err) {
      console.log("Host dashboard error:", err);
      setLoadError(err.response?.data?.message || "Dashboard load failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteTrip = async (id) => {
    if (!window.confirm("Delete this trip package?")) return;

    try {
      setDeletingTripId(id);
      const token = localStorage.getItem("token");

      await api.delete(`/trip-packages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTrips((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Trip delete failed");
    } finally {
      setDeletingTripId(null);
    }
  };

  const stats = useMemo(() => {
    const activeStayBookings = stayBookings.filter(
      (item) => String(item.status || "").toLowerCase() !== "cancelled"
    );

    const activeTripBookings = tripBookings.filter(
      (item) => String(item.status || "").toLowerCase() !== "cancelled"
    );

    const stayRevenue = activeStayBookings.reduce(
      (sum, item) => sum + Number(item.total || item.amount || 0),
      0
    );

    const tripRevenue =
      activeTripBookings.reduce(
        (sum, item) => sum + Number(item.total || item.amount || 0),
        0
      ) ||
      trips.reduce((sum, item) => sum + Number(item.revenue || 0), 0);

    return {
      stayRevenue,
      tripRevenue,
      totalRevenue: stayRevenue + tripRevenue,
      stays: stays.length,
      trips: trips.length,
      bookings: activeStayBookings.length + activeTripBookings.length,
    };
  }, [stays, trips, stayBookings, tripBookings]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-200 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#3b71e6]">
                Host Center
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Hosting dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Manage your own uploaded stays, trip packages, bookings,
                earnings, calendar and reviews from one professional dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/host-type")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-semibold text-white transition hover:bg-[#2f5fc2]"
              >
                <Plus size={17} />
                Add hosting
              </button>

              <button
                onClick={loadDashboard}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        {loadError && (
          <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
            {loadError}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-5">
              <StatCard
                icon={<IndianRupee size={19} />}
                title="Total earnings"
                value={formatINR(stats.totalRevenue)}
                text="Stay + trip revenue"
              />
              <StatCard
                icon={<Home size={19} />}
                title="Stay listings"
                value={stats.stays}
                text="Your uploaded stays"
              />
              <StatCard
                icon={<Map size={19} />}
                title="Trip listings"
                value={stats.trips}
                text="Your uploaded trips"
              />
              <StatCard
                icon={<CalendarDays size={19} />}
                title="Bookings"
                value={stats.bookings}
                text="Confirmed reservations"
              />
              <StatCard
                icon={<Wallet size={19} />}
                title="Trip earnings"
                value={formatINR(stats.tripRevenue)}
                text="Package revenue"
              />
            </section>

            <div className="mt-8 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200">
              {[
                ["overview", "Overview"],
                ["stays", "Stays"],
                ["trips", "Trips"],
                ["earnings", "Earnings"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`h-10 shrink-0 rounded-xl px-5 text-sm font-semibold transition ${
                    activeTab === key
                      ? "bg-[#3b71e6] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {(activeTab === "overview" || activeTab === "stays") && (
              <DashboardSection
                title="Your stay listings"
                subtitle="Only properties uploaded by this host are shown here."
                action="Manage stays"
                onAction={() => navigate("/host-listings")}
              >
                {stays.length === 0 ? (
                  <EmptyState
                    title="No stays uploaded yet"
                    text="Create your first stay listing and start receiving bookings."
                    button="Add stay"
                    onClick={() => navigate("/host-type")}
                  />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {stays.map((stay) => (
                      <StayRow
                        key={stay.id}
                        stay={stay}
                        navigate={navigate}
                        formatINR={formatINR}
                      />
                    ))}
                  </div>
                )}
              </DashboardSection>
            )}

            {(activeTab === "overview" || activeTab === "trips") && (
              <DashboardSection
                title="Your trip packages"
                subtitle="Only trip packages uploaded by this host are shown here."
                action="Manage trips"
                onAction={() => navigate("/host-trip-packages")}
              >
                {trips.length === 0 ? (
                  <EmptyState
                    title="No trips uploaded yet"
                    text="Add itinerary, destination, seats and pricing for your first package."
                    button="Add trip package"
                    onClick={() => navigate("/add-trip-package")}
                  />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {trips.map((trip) => (
                      <TripRow
                        key={trip.id}
                        trip={trip}
                        navigate={navigate}
                        formatINR={formatINR}
                        deleting={deletingTripId === trip.id}
                        onDelete={() => deleteTrip(trip.id)}
                      />
                    ))}
                  </div>
                )}
              </DashboardSection>
            )}

            {(activeTab === "overview" || activeTab === "earnings") && (
              <section className="mt-8 grid gap-4 md:grid-cols-2">
                <EarningCard
                  title="Stay earnings"
                  value={formatINR(stats.stayRevenue)}
                  text={`${stayBookings.length} stay reservations`}
                  onClick={() => navigate("/earnings")}
                />

                <EarningCard
                  title="Trip earnings"
                  value={formatINR(stats.tripRevenue)}
                  text={`${tripBookings.length} trip reservations`}
                  onClick={() => navigate("/host-package-bookings")}
                />
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-xl font-bold tracking-tight">
                Host options
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <QuickAction
                  icon={<Plus size={19} />}
                  title="Add hosting"
                  desc="Stay or trip"
                  onClick={() => navigate("/host-type")}
                />
                <QuickAction
                  icon={<Home size={19} />}
                  title="Listings"
                  desc="Your stays"
                  onClick={() => navigate("/host-listings")}
                />
                <QuickAction
                  icon={<Map size={19} />}
                  title="Trips"
                  desc="Your packages"
                  onClick={() => navigate("/host-trip-packages")}
                />
                <QuickAction
                  icon={<ListChecks size={19} />}
                  title="Bookings"
                  desc="Trip bookings"
                  onClick={() => navigate("/host-package-bookings")}
                />
                <QuickAction
                  icon={<CalendarDays size={19} />}
                  title="Calendar"
                  desc="Availability"
                  onClick={() => navigate("/host-calendar")}
                />
                <QuickAction
                  icon={<Star size={19} />}
                  title="Reviews"
                  desc="Guest feedback"
                  onClick={() => navigate("/host-reviews")}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function DashboardSection({ title, subtitle, action, onAction, children }) {
  return (
    <section className="mt-8 overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>

        <button
          onClick={onAction}
          className="text-left text-sm font-semibold text-[#3b71e6] hover:underline md:text-right"
        >
          {action}
        </button>
      </div>

      {children}
    </section>
  );
}

function StayRow({ stay, navigate, formatINR }) {
  return (
    <div className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img
          src={stay.image || stay.cover_image || FALLBACK_STAY}
          alt={stay.title || "Stay"}
          className="h-20 w-20 rounded-2xl object-cover"
        />

        <div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#3b71e6]">
            Stay
          </span>

          <h3 className="mt-2 font-bold text-gray-950">
            {stay.title || stay.name || "Untitled stay"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {stay.location || stay.city || "Location not added"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold">{formatINR(stay.price)} / night</p>

        <button
          onClick={() => navigate(`/reserve/${stay.id}`)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-white"
        >
          View
        </button>

        <button
          onClick={() => navigate(`/edit-listing/${stay.id}`)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-white"
        >
          <Edit size={15} />
          Edit
        </button>
      </div>
    </div>
  );
}

function TripRow({ trip, navigate, formatINR, deleting, onDelete }) {
  const days = Number(trip.package_days || trip.days || 1);
  const nights = Number(trip.package_nights || Math.max(days - 1, 0));

  return (
    <div className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <img
          src={trip.image || trip.cover_image || FALLBACK_TRIP}
          alt={trip.title || "Trip"}
          className="h-20 w-20 rounded-2xl object-cover"
        />

        <div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#3b71e6]">
            Trip Package
          </span>

          <h3 className="mt-2 font-bold text-gray-950">
            {trip.title || trip.name || "Untitled trip"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {trip.location || trip.city || "Destination"} · {days}D / {nights}N
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold">{formatINR(trip.price)} / person</p>

        <button
          onClick={() => navigate(`/experiences/${trip.id}`)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-white"
        >
          <Eye size={15} />
          View
        </button>

        <button
          onClick={() => navigate(`/edit-trip-package/${trip.id}`)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-white"
        >
          <Edit size={15} />
          Edit
        </button>

        <button
          onClick={() => navigate(`/host-trip-packages/${trip.id}/departures`)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-white"
        >
          <CalendarDays size={15} />
          Departures
        </button>

        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          Delete
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, text }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#3b71e6]">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold tracking-tight">{value}</h3>
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </article>
  );
}

function EarningCard({ title, value, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-[1.5rem] bg-white p-6 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <h3 className="mt-3 text-3xl font-bold">{value}</h3>
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </button>
  );
}

function QuickAction({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 text-[#3b71e6]">{icon}</div>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </button>
  );
}

function EmptyState({ title, text, button, onClick }) {
  return (
    <div className="flex min-h-[230px] items-center justify-center p-8 text-center">
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          {text}
        </p>
        <button
          onClick={onClick}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-semibold text-white hover:bg-[#2f5fc2]"
        >
          <Plus size={17} />
          {button}
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-[1.5rem] bg-white" />
    </div>
  );
}