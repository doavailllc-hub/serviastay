import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Edit,
  Eye,
  Loader2,
  MapPin,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

export default function HostTripPackages() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPackages();
  }, []);

  const getArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.packages)) return data.packages;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const user =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");

      if (!token || !user?.id) {
        navigate("/login", { replace: true });
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get("/host/trip-packages", { headers });
      setPackages(getArray(res.data));
    } catch (err) {
      console.error("Host trip packages load failed:", err);

      if ([401, 403].includes(err?.response?.status)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err?.response?.data?.message || "Unable to load your trip packages."
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalPackages = packages.length;

    const activePackages = packages.filter(
      (p) => String(p.status || "active").toLowerCase() === "active"
    ).length;

    const totalBookings = packages.reduce(
      (sum, p) =>
        sum + Number(p.booking_count ?? p.bookings_count ?? p.bookings ?? 0),
      0
    );

    const totalRevenue = packages.reduce(
      (sum, p) => sum + Number(p.earnings ?? p.revenue ?? 0),
      0
    );

    return {
      totalPackages,
      activePackages,
      totalBookings,
      totalRevenue,
    };
  }, [packages]);

  const deletePackage = async (id) => {
    const ok = window.confirm("Delete this trip package?");
    if (!ok) return;

    try {
      setDeletingId(id);

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      await api.delete(`/trip-packages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPackages((prev) =>
        prev.filter((item) => String(item.id) !== String(id))
      );
    } catch (err) {
      console.error("Delete package failed:", err);
      setError(err?.response?.data?.message || "Package delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Trip packages
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Manage your uploaded travel packages, pricing, bookings and
              availability.
            </p>
          </div>

          <button
            onClick={() => navigate("/add-trip-package")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] active:scale-[0.98]"
          >
            <Plus size={17} />
            Add package
          </button>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Your packages" value={stats.totalPackages} />
          <StatCard label="Active packages" value={stats.activePackages} />
          <StatCard label="Bookings" value={stats.totalBookings} />
          <StatCard
            label="Revenue"
            value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
              Your trip packages
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {loading ? "Loading..." : `${packages.length} packages found`}
            </p>
          </div>

          {loading ? (
            <StateBox>
              <Loader2 className="animate-spin text-[#3b71e6]" size={22} />
              <p className="mt-3 text-sm font-medium text-gray-500">
                Loading your trip packages...
              </p>
            </StateBox>
          ) : error ? (
            <StateBox>
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button
                onClick={loadPackages}
                className="mt-5 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
              >
                Try again
              </button>
            </StateBox>
          ) : packages.length === 0 ? (
            <StateBox>
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                No trip packages yet
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                Create your first travel package and start accepting bookings.
              </p>

              <button
                onClick={() => navigate("/add-trip-package")}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
              >
                <Plus size={17} />
                Add package
              </button>
            </StateBox>
          ) : (
            <div className="divide-y divide-gray-100">
              {packages.map((pkg) => (
                <PackageRow
                  key={pkg.id}
                  pkg={pkg}
                  deleting={deletingId === pkg.id}
                  onView={() => navigate(`/experiences/${pkg.id}`)}
                  onEdit={() => navigate(`/edit-trip-package/${pkg.id}`)}
                  onDelete={() => deletePackage(pkg.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PackageRow({ pkg, deleting, onView, onEdit, onDelete }) {
  const image =
    pkg.image ||
    pkg.cover_image ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

  const days = Number(pkg.package_days || pkg.days || 1);
  const nights = Number(pkg.package_nights || Math.max(days - 1, 0));
  const price = Number(pkg.price || 0);
  const rating = Number(pkg.rating || 0);

  return (
    <article className="px-5 py-4 transition hover:bg-gray-50">
      <div className="grid gap-5 lg:grid-cols-[180px_1fr_auto] lg:items-center">
        <img
          src={image}
          alt={pkg.title || "Trip package"}
          className="h-40 w-full rounded-2xl object-cover lg:h-32"
        />

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-[#eef4ff] px-3 py-1 text-xs font-medium text-[#3b71e6]">
              {pkg.package_type || "Trip Package"}
            </span>

            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 capitalize">
              {pkg.status || "active"}
            </span>
          </div>

          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-gray-950">
            {pkg.title || "Untitled package"}
          </h3>

          <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <MapPin size={16} />
            {pkg.location || pkg.city || "Destination"}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniInfo
              icon={<CalendarDays size={16} />}
              label="Duration"
              value={`${days}D / ${nights}N`}
            />

            <MiniInfo
              icon={<Star size={16} />}
              label="Rating"
              value={rating ? rating.toFixed(2) : "New"}
            />

            <MiniInfo
              label="Bookings"
              value={Number(
                pkg.booking_count ?? pkg.bookings_count ?? pkg.bookings ?? 0
              )}
            />

            <MiniInfo
              label="Revenue"
              value={`₹${Number(
                pkg.earnings ?? pkg.revenue ?? 0
              ).toLocaleString("en-IN")}`}
            />
          </div>
        </div>

        <div className="lg:w-44">
          <p className="text-sm text-gray-500">Price / person</p>

          <p className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
            ₹{price.toLocaleString("en-IN")}
          </p>

          <div className="mt-5 grid gap-2">
            <button
              onClick={onView}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
            >
              <Eye size={16} />
              View
            </button>

            <button
              onClick={onEdit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
            >
              <Edit size={16} />
              Edit
            </button>

            <button
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>

      <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
        {value}
      </h2>
    </article>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>

      <p className="text-sm font-medium text-gray-950">{value}</p>
    </div>
  );
}

function StateBox({ children }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
      {children}
    </div>
  );
}