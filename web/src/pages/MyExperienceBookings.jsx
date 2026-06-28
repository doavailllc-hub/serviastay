import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  Star,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND = "#7E4FF5";

export default function MyExperienceBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = ["All", "Confirmed", "Pending", "Cancelled"];

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      if (!token || !user?.id) {
        navigate("/login");
        return;
      }

      const res = await api.get(`/experience-bookings/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Package bookings load failed:", err);
      setError("Unable to load your package bookings.");
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    if (activeFilter === "All") return bookings;

    return bookings.filter(
      (booking) =>
        String(booking.status || "").toLowerCase() ===
        activeFilter.toLowerCase()
    );
  }, [bookings, activeFilter]);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
              Dovail Stay Packages
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              My package bookings
            </h1>

            <p className="mt-3 max-w-2xl text-gray-500">
              View your confirmed, pending and cancelled trip package bookings.
            </p>
          </div>

          <button
            onClick={() => navigate("/experiences")}
            className="w-fit rounded-full px-6 py-3 text-sm font-bold text-white transition hover:scale-[1.02]"
            style={{ backgroundColor: BRAND }}
          >
            Explore packages
          </button>
        </div>

        <div className="mt-8 flex gap-3 overflow-x-auto border-b border-gray-200 pb-4">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setActiveFilter(item)}
              className={`min-w-fit rounded-full border px-5 py-2 text-sm font-bold transition ${
                activeFilter === item
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-950"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <section className="mt-8">
          {loading ? (
            <StateBox>
              <Loader2 className="animate-spin" size={24} />
              <p className="font-semibold">Loading package bookings...</p>
            </StateBox>
          ) : error ? (
            <StateBox>
              <p className="font-semibold text-red-600">{error}</p>
              <button
                onClick={loadBookings}
                className="mt-4 rounded-full px-5 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Try again
              </button>
            </StateBox>
          ) : filteredBookings.length === 0 ? (
            <StateBox>
              <h2 className="text-2xl font-black text-gray-900">
                No package bookings yet
              </h2>

              <p className="mt-2 text-gray-500">
                Start exploring curated trip packages and book your first travel
                plan.
              </p>

              <button
                onClick={() => navigate("/experiences")}
                className="mt-6 rounded-full px-6 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Browse packages
              </button>
            </StateBox>
          ) : (
            <div className="grid gap-6">
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onView={() => navigate(`/experiences/${booking.experience_id}`)}
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

function BookingCard({ booking, onView }) {
  const image =
    booking.image ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

  const status = booking.status || "Confirmed";
  const days = Number(booking.package_days || 1);
  const nights = Number(booking.package_nights || Math.max(days - 1, 0));
  const travelers = Number(booking.guests || 1);

  return (
    <article className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm transition hover:shadow-xl">
      <div className="grid md:grid-cols-[260px_1fr_auto]">
        <img
          src={image}
          alt={booking.title || "Trip package"}
          className="h-64 w-full object-cover md:h-full"
        />

        <div className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
              Booking #{booking.id}
            </span>

            <span className="rounded-full bg-[#F7F5FF] px-3 py-1 text-xs font-bold text-[#7E4FF5]">
              Trip Package
            </span>
          </div>

          <h2 className="text-2xl font-black text-gray-900">
            {booking.title || "Dovail Stay Trip Package"}
          </h2>

          <p className="mt-2 flex items-center gap-2 text-gray-500">
            <MapPin size={17} />
            {booking.location || booking.city || "Destination"}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniInfo
              icon={<CalendarDays size={17} />}
              label="Travel date"
              value={formatDate(booking.booking_date)}
            />

            <MiniInfo
              icon={<Users size={17} />}
              label="Travelers"
              value={`${travelers} traveler${travelers > 1 ? "s" : ""}`}
            />

            <MiniInfo
              icon={<Clock3 size={17} />}
              label="Duration"
              value={`${days} Days / ${nights} Nights`}
            />

            <MiniInfo
              icon={<Star size={17} />}
              label="Rating"
              value={
                Number(booking.rating || 0)
                  ? Number(booking.rating).toFixed(2)
                  : "New"
              }
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-500">
            <span>Payment: {booking.payment_method || "cash"}</span>
            <span>·</span>
            <span>{booking.payment_status || "Pay at trip"}</span>
          </div>
        </div>

        <div className="flex flex-col justify-between border-t border-gray-100 p-6 md:border-l md:border-t-0">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-black text-gray-900">
              ₹{Number(booking.total || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <button
            onClick={onView}
            className="mt-6 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
            style={{ backgroundColor: BRAND }}
          >
            <Eye size={17} />
            View package
          </button>
        </div>
      </div>
    </article>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-2 text-[#7E4FF5]">{icon}</div>

      <p className="text-xs font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const styles =
    normalized === "confirmed"
      ? "bg-green-50 text-green-700 border-green-100"
      : normalized === "pending"
      ? "bg-yellow-50 text-yellow-700 border-yellow-100"
      : normalized === "cancelled"
      ? "bg-red-50 text-red-700 border-red-100"
      : "bg-gray-50 text-gray-700 border-gray-100";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${styles}`}
    >
      {status}
    </span>
  );
}

function StateBox({ children }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-gray-200 bg-white p-8 text-center text-gray-500">
      {children}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Selected date";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}