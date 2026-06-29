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
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

export default function HostDashboard() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingPackageId, setDeletingPackageId] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [listingsRes, bookingsRes, packagesRes] =
        await Promise.allSettled([
          api.get(`/my-properties/${user.id}`, { headers }),
          api.get(`/bookings/${user.id}`, { headers }),
          api.get("/host/trip-packages", { headers }),
        ]);

      setListings(
        listingsRes.status === "fulfilled" ? listingsRes.value.data || [] : []
      );

      setBookings(
        bookingsRes.status === "fulfilled" ? bookingsRes.value.data || [] : []
      );

      setPackages(
        packagesRes.status === "fulfilled" ? packagesRes.value.data || [] : []
      );

      const responses = [listingsRes, bookingsRes, packagesRes];

      const authFailed = responses.some(
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

      if (responses.some((res) => res.status === "rejected")) {
        setLoadError("Some dashboard data could not be loaded.");
      }
    } catch (err) {
      console.log("Dashboard load failed:", err);

      if ([401, 403].includes(err.response?.status)) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      setLoadError(err.response?.data?.message || "Dashboard data load failed");
    } finally {
      setLoading(false);
    }
  };

  const deletePackage = async (id) => {
    const ok = window.confirm("Delete this trip package?");
    if (!ok) return;

    try {
      setDeletingPackageId(id);

      const token = localStorage.getItem("token");

      await api.delete(`/trip-packages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPackages((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Package delete failed");
    } finally {
      setDeletingPackageId(null);
    }
  };

  const stats = useMemo(() => {
    const confirmedBookings = bookings.filter(
      (item) => item.status !== "Cancelled"
    );

    const stayRevenue = confirmedBookings.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );

    const packageRevenue = packages.reduce(
      (sum, item) => sum + Number(item.revenue || 0),
      0
    );

    const packageBookings = packages.reduce(
      (sum, item) => sum + Number(item.bookings_count || 0),
      0
    );

    return {
      totalRevenue: stayRevenue + packageRevenue,
      stayListings: listings.length,
      tripPackages: packages.length,
      totalBookings: bookings.length + packageBookings,
    };
  }, [listings, bookings, packages]);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Hosting dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Manage stays, trip packages, reservations and earnings from one
              clean dashboard.
            </p>
          </div>

          <button
            onClick={() => navigate("/host-type")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            <Plus size={17} />
            Add hosting
          </button>
        </header>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
            {loadError}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Total earnings"
                value={formatINR(stats.totalRevenue)}
                subtitle="Stay + package revenue"
                icon={<IndianRupee size={18} />}
              />

              <StatCard
                title="Stay listings"
                value={stats.stayListings}
                subtitle="Properties you host"
                icon={<Home size={18} />}
              />

              <StatCard
                title="Trip packages"
                value={stats.tripPackages}
                subtitle="Packages you sell"
                icon={<Map size={18} />}
              />

              <StatCard
                title="Total bookings"
                value={stats.totalBookings}
                subtitle="Stay + package bookings"
                icon={<CalendarDays size={18} />}
              />
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white">
              <SectionHeader
                title="Stay listings"
                subtitle="Manage your properties, rooms, resorts and villas."
                action="View all"
                onClick={() => navigate("/host-listings")}
              />

              {listings.length === 0 ? (
                <EmptyState
                  title="No stay listings yet"
                  text="List your first stay and start accepting reservations."
                  button="Add stay"
                  onClick={() => navigate("/host-type")}
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {listings.slice(0, 4).map((listing) => (
                    <ListingRow
                      key={listing.id}
                      listing={listing}
                      navigate={navigate}
                      formatINR={formatINR}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white">
              <SectionHeader
                title="Trip package listings"
                subtitle="Edit, delete, view and manage departures for your packages."
                action="Manage all"
                onClick={() => navigate("/host-trip-packages")}
              />

              {packages.length === 0 ? (
                <EmptyState
                  title="No trip packages yet"
                  text="Create your first travel package with itinerary, pickup and departure dates."
                  button="Add trip package"
                  onClick={() => navigate("/add-trip-package")}
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {packages.slice(0, 5).map((pkg) => (
                    <PackageRow
                      key={pkg.id}
                      pkg={pkg}
                      navigate={navigate}
                      deleting={deletingPackageId === pkg.id}
                      onDelete={() => deletePackage(pkg.id)}
                      formatINR={formatINR}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Quick actions
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <QuickAction
                  icon={<Plus size={19} />}
                  title="Add hosting"
                  desc="Stay or package"
                  onClick={() => navigate("/host-type")}
                />

                <QuickAction
                  icon={<Home size={19} />}
                  title="Stays"
                  desc="Manage properties"
                  onClick={() => navigate("/host-listings")}
                />

                <QuickAction
                  icon={<Map size={19} />}
                  title="Packages"
                  desc="Manage trips"
                  onClick={() => navigate("/host-trip-packages")}
                />

                <QuickAction
                  icon={<ListChecks size={19} />}
                  title="Package bookings"
                  desc="Trip reservations"
                  onClick={() => navigate("/host-package-bookings")}
                />

                <QuickAction
                  icon={<CalendarDays size={19} />}
                  title="Calendar"
                  desc="Stay availability"
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

            <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-950">
                Hosting tip
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                Keep stay photos updated and add clear trip package departures
                with available seats to improve customer trust and bookings.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>

      <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}

function SectionHeader({ title, subtitle, action, onClick }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-gray-950">
          {title}
        </h2>

        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <button
        onClick={onClick}
        className="shrink-0 text-sm font-medium text-[#3b71e6] hover:underline"
      >
        {action}
      </button>
    </div>
  );
}

function EmptyState({ title, text, button, onClick }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center px-5 text-center">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-gray-950">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
          {text}
        </p>

        <button
          onClick={onClick}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
        >
          <Plus size={17} />
          {button}
        </button>
      </div>
    </div>
  );
}

function ListingRow({ listing, navigate, formatINR }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img
          src={
            listing.image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
          }
          alt={listing.title || "Listing"}
          className="h-16 w-16 rounded-xl object-cover"
        />

        <div>
          <h3 className="text-sm font-semibold text-gray-950">
            {listing.title || "Untitled listing"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {listing.location || "Location unavailable"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <span className="text-sm font-medium text-gray-950">
          {formatINR(listing.price)} / night
        </span>

        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          Active
        </span>

        <button
          onClick={() => navigate(`/reserve/${listing.id}`)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
        >
          View
        </button>

        <button
          onClick={() => navigate(`/edit-listing/${listing.id}`)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function PackageRow({ pkg, navigate, deleting, onDelete, formatINR }) {
  const days = Number(pkg.package_days || 1);
  const nights = Number(pkg.package_nights || Math.max(days - 1, 0));

  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <img
          src={
            pkg.image ||
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
          }
          alt={pkg.title || "Trip package"}
          className="h-20 w-20 rounded-xl object-cover"
        />

        <div>
          <div className="mb-1 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-medium text-[#3b71e6]">
              Trip Package
            </span>

            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              {pkg.status || "active"}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-gray-950">
            {pkg.title || "Untitled package"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {pkg.location || pkg.city || "Destination"} · {days}D / {nights}N
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <span className="text-sm font-medium text-gray-950">
          {formatINR(pkg.price)} / person
        </span>

        <span className="text-sm text-gray-500">
          {Number(pkg.bookings_count || 0)} bookings
        </span>

        <button
          onClick={() => navigate(`/experiences/${pkg.id}`)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
        >
          <Eye size={15} />
          View
        </button>

        <button
          onClick={() => navigate(`/edit-trip-package/${pkg.id}`)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
        >
          <Edit size={15} />
          Edit
        </button>

        <button
          onClick={() => navigate(`/host-trip-packages/${pkg.id}/departures`)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
        >
          <CalendarDays size={15} />
          Departures
        </button>

        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}
          Delete
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }) {
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

function QuickAction({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:bg-gray-50"
    >
      <div className="mb-3 text-[#3b71e6]">{icon}</div>

      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>

      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </button>
  );
}