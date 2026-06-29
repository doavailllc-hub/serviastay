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

const BRAND = "#7E4FF5";

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

      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");

      if (!token || !user?.id) {
        navigate("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      let res;

      try {
        res = await api.get(`/host/trip-packages/${user.id}`, { headers });
      } catch {
        res = await api.get("/host/trip-packages", { headers });
      }

      const data = getArray(res.data);
      const hostId = String(user.id);

      const filtered = data.filter((pkg) => {
        const owner =
          pkg.host_id ??
          pkg.hostId ??
          pkg.user_id ??
          pkg.userId ??
          pkg.owner_id ??
          pkg.ownerId ??
          pkg.created_by ??
          pkg.createdBy;

        return String(owner || "") === hostId;
      });

      setPackages(filtered);
    } catch (err) {
      console.error("Host trip packages load failed:", err);
      setError("Unable to load your trip packages.");
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
      (sum, p) => sum + Number(p.bookings_count || 0),
      0
    );

    const totalRevenue = packages.reduce(
      (sum, p) => sum + Number(p.revenue || 0),
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

      const token = localStorage.getItem("token");

      await api.delete(`/trip-packages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPackages((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete package failed:", err);
      alert(err.response?.data?.message || "Package delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
              Host Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              Trip packages
            </h1>

            <p className="mt-3 max-w-2xl text-gray-500">
              Manage only your uploaded travel packages, pricing, bookings and
              availability.
            </p>
          </div>

          <button
            onClick={() => navigate("/add-trip-package")}
            className="flex w-fit items-center gap-2 rounded-full px-6 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
            style={{ backgroundColor: BRAND }}
          >
            <Plus size={18} />
            Add package
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Your packages" value={stats.totalPackages} />
          <StatCard label="Active packages" value={stats.activePackages} />
          <StatCard label="Bookings" value={stats.totalBookings} />
          <StatCard
            label="Revenue"
            value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
          />
        </div>

        <section className="mt-8">
          {loading ? (
            <StateBox>
              <Loader2 className="animate-spin" size={24} />
              <p className="font-semibold">Loading your trip packages...</p>
            </StateBox>
          ) : error ? (
            <StateBox>
              <p className="font-semibold text-red-600">{error}</p>
              <button
                onClick={loadPackages}
                className="mt-4 rounded-full px-5 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Try again
              </button>
            </StateBox>
          ) : packages.length === 0 ? (
            <StateBox>
              <h2 className="text-2xl font-black text-gray-900">
                No trip packages yet
              </h2>
              <p className="mt-2 text-gray-500">
                Create your first travel package and start accepting bookings.
              </p>
              <button
                onClick={() => navigate("/add-trip-package")}
                className="mt-6 rounded-full px-6 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Add package
              </button>
            </StateBox>
          ) : (
            <div className="grid gap-6">
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

  return (
    <article className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm transition hover:shadow-xl">
      <div className="grid md:grid-cols-[240px_1fr_auto]">
        <img
          src={image}
          alt={pkg.title || "Trip package"}
          className="h-60 w-full object-cover md:h-full"
        />

        <div className="p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F7F5FF] px-3 py-1 text-xs font-black text-[#7E4FF5]">
              {pkg.package_type || "Trip Package"}
            </span>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
              {pkg.status || "active"}
            </span>
          </div>

          <h2 className="text-2xl font-black text-gray-900">
            {pkg.title || "Untitled package"}
          </h2>

          <p className="mt-2 flex items-center gap-2 text-gray-500">
            <MapPin size={17} />
            {pkg.location || pkg.city || "Destination"}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniInfo
              icon={<CalendarDays size={17} />}
              label="Duration"
              value={`${days} Days / ${nights} Nights`}
            />

            <MiniInfo
              icon={<Star size={17} />}
              label="Rating"
              value={
                Number(pkg.rating || 0)
                  ? Number(pkg.rating).toFixed(2)
                  : "New"
              }
            />

            <MiniInfo label="Bookings" value={Number(pkg.bookings_count || 0)} />

            <MiniInfo
              label="Revenue"
              value={`₹${Number(pkg.revenue || 0).toLocaleString("en-IN")}`}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between border-t border-gray-100 p-6 md:border-l md:border-t-0">
          <div>
            <p className="text-sm text-gray-500">Price / person</p>
            <p className="mt-1 text-2xl font-black text-gray-900">
              ₹{Number(pkg.price || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <div className="mt-6 grid gap-2">
            <button
              onClick={onView}
              className="flex items-center justify-center gap-2 rounded-full border border-gray-300 px-5 py-3 text-sm font-black transition hover:border-gray-900"
            >
              <Eye size={17} />
              View
            </button>

            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 rounded-full border border-gray-300 px-5 py-3 text-sm font-black transition hover:border-gray-900"
            >
              <Edit size={17} />
              Edit
            </button>

            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 rounded-full bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 size={17} />
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
    <div className="rounded-[26px] border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
    </div>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      {icon && <div className="mb-2 text-[#7E4FF5]">{icon}</div>}
      <p className="text-xs font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StateBox({ children }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-gray-200 bg-white p-8 text-center text-gray-500">
      {children}
    </div>
  );
}