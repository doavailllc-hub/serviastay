import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Download,
  Eye,
  MapPin,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Star,
  Users,
} from "lucide-react";

import api from "../api/api";
import Navbar from "../components/Navbar";
import { formatINR, getStoredUser } from "../utils/resortUtils";

const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://stay.dovail.com";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

function formatDate(value) {
  if (!value) return "Not selected";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not selected";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTripValue(trip, keys, fallback = "") {
  for (const key of keys) {
    if (trip?.[key] !== undefined && trip?.[key] !== null && trip?.[key] !== "") {
      return trip[key];
    }
  }

  return fallback;
}

function getImageUrl(trip) {
  const image = getTripValue(
    trip,
    ["image", "image_url", "property_image", "cover_image", "thumbnail"],
    ""
  );

  if (!image) return FALLBACK_IMAGE;
  if (image.startsWith("https://")) return image;

  if (image.startsWith("http://")) {
    try {
      const url = new URL(image);
      return `${SITE_URL}${url.pathname}`;
    } catch {
      return FALLBACK_IMAGE;
    }
  }

  if (image.startsWith("/uploads/")) return `${SITE_URL}${image}`;
  if (image.startsWith("uploads/")) return `${SITE_URL}/${image}`;

  return image;
}

function isPastTrip(trip) {
  const status = String(trip.status || "").toLowerCase();

  if (
    ["cancelled", "completed", "checked-out", "checked out", "refunded"].includes(
      status
    )
  ) {
    return true;
  }

  const checkout = getTripValue(trip, ["checkout", "check_out", "check_out_date"]);

  if (!checkout) return false;

  const checkoutDate = new Date(checkout);
  const today = new Date();

  checkoutDate.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);

  return checkoutDate < today;
}

export default function Trips() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = async () => {
    try {
      setLoading(true);

      const user = getStoredUser();

      if (!user?.id) {
        navigate("/login");
        return;
      }

      const { data } = await api.get(`/bookings/${user.id}`);
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Trips load failed:", err);
      toast.error(err.response?.data?.message || "Trips load failed");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const { upcomingTrips, pastTrips } = useMemo(() => {
    const upcoming = [];
    const past = [];

    trips.forEach((trip) => {
      if (isPastTrip(trip)) past.push(trip);
      else upcoming.push(trip);
    });

    return { upcomingTrips: upcoming, pastTrips: past };
  }, [trips]);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 md:px-8">
        <header className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">
              Reservations
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Trips
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              View upcoming stays, past reservations, receipts, and booking
              details.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTrips}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {loading ? (
          <TripsSkeleton />
        ) : trips.length === 0 ? (
          <EmptyTrips navigate={navigate} />
        ) : (
          <div className="space-y-12">
            <TripSection
              title="Upcoming trips"
              trips={upcomingTrips}
              navigate={navigate}
              reload={loadTrips}
            />

            <TripSection
              title="Past trips"
              trips={pastTrips}
              navigate={navigate}
              reload={loadTrips}
              past
            />
          </div>
        )}
      </main>
    </div>
  );
}

function TripSection({ title, trips, navigate, reload, past }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h2>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          {trips.length}
        </span>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-10 text-sm text-gray-500">
          No {title.toLowerCase()} found.
        </div>
      ) : (
        <div className="grid gap-5">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              navigate={navigate}
              reload={reload}
              past={past}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TripCard({ trip, navigate, reload, past }) {
  const title = getTripValue(
    trip,
    ["property_title", "title", "property_name"],
    "Property booking"
  );

  const location = getTripValue(
    trip,
    ["location", "address"],
    "Location unavailable"
  );

  const image = getImageUrl(trip);

  const checkin = getTripValue(trip, ["checkin", "check_in", "check_in_date"]);
  const checkout = getTripValue(trip, ["checkout", "check_out", "check_out_date"]);
  const total = getTripValue(trip, ["total", "total_amount", "amount"], 0);
  const guests = Number(getTripValue(trip, ["guests", "guest_count"], 1));
  const status = getTripValue(trip, ["status"], "Confirmed");
  const paymentStatus = getTripValue(trip, ["payment_status"], "");
  const paymentMethod = getTripValue(trip, ["payment_method"], "razorpay");
  const hostId = getTripValue(trip, ["host_id", "user_id"], null);
  const propertyId = getTripValue(trip, ["property_id"], null);

  const statusLower = String(status || "").toLowerCase();
  const canRequestRefund =
    !past &&
    !["cancelled", "completed", "refunded"].includes(statusLower) &&
    String(paymentStatus).toLowerCase() === "paid";

  const canReview =
    past &&
    !["cancelled", "refunded"].includes(statusLower) &&
    propertyId;

  const downloadInvoice = () => {
    const win = window.open("", "_blank");

    if (!win) {
      toast.error("Please allow popups to download invoice.");
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Invoice #${trip.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
            .box { max-width: 850px; margin: auto; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; }
            .head { background: #3b71e6; color: white; padding: 28px; display: flex; justify-content: space-between; }
            .content { padding: 28px; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 12px 0; }
            .total { font-size: 28px; font-weight: 800; color: #3b71e6; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="head">
              <div>
                <h1>Dovail Stay</h1>
                <p>Booking Invoice</p>
              </div>
              <div>
                <h2>INVOICE</h2>
                <p>#${trip.id}</p>
              </div>
            </div>

            <div class="content">
              <h2>${title}</h2>
              <p>${location}</p>

              <div class="row"><span>Check-in</span><strong>${formatDate(checkin)}</strong></div>
              <div class="row"><span>Checkout</span><strong>${formatDate(checkout)}</strong></div>
              <div class="row"><span>Guests</span><strong>${guests}</strong></div>
              <div class="row"><span>Payment Method</span><strong>${paymentMethod}</strong></div>
              <div class="row"><span>Status</span><strong>${status}</strong></div>

              <br />
              <div class="row">
                <span>Total Paid</span>
                <span class="total">${formatINR(total)}</span>
              </div>

              <p style="margin-top:30px;color:#6b7280;">Thank you for booking with Dovail Stay.</p>
            </div>
          </div>

          <script>
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);

    win.document.close();
  };

  const contactHost = () => {
    if (!hostId) {
      toast.error("Host details unavailable");
      return;
    }

    navigate("/messages", {
      state: {
        openUserId: hostId,
        propertyId,
      },
    });
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        <img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-60 w-full object-cover md:h-auto md:w-72"
          onError={(event) => {
            if (event.currentTarget.src !== FALLBACK_IMAGE) {
              event.currentTarget.src = FALLBACK_IMAGE;
            }
          }}
        />

        <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
          <div>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                  {title}
                </h3>

                <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <MapPin size={16} />
                  {location}
                </p>
              </div>

              <StatusBadge status={status} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <InfoPill
                icon={<CalendarDays size={18} />}
                label="Dates"
                value={`${formatDate(checkin)} – ${formatDate(checkout)}`}
              />

              <InfoPill
                icon={<Users size={18} />}
                label="Guests"
                value={`${guests} ${guests > 1 ? "guests" : "guest"}`}
              />

              <InfoPill
                icon={<ReceiptText size={18} />}
                label="Payment"
                value={`Paid via ${paymentMethod}`}
                capitalize
              />
            </div>

            <p className="mt-5 text-lg font-semibold text-[#3b71e6]">
              Total paid: {formatINR(total)}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3b71e6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f5fc2]"
            >
              <Eye size={17} />
              View details
            </button>

            <button
              type="button"
              onClick={downloadInvoice}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              <Download size={17} />
              Invoice
            </button>

            <button
              type="button"
              onClick={contactHost}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              <MessageCircle size={17} />
              Contact host
            </button>

            {canRequestRefund && (
              <button
                type="button"
                onClick={() => navigate(`/refund-request/${trip.id}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <RotateCcw size={17} />
                Refund
              </button>
            )}

            {canReview && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/review/${trip.id}`, {
                    state: {
                      bookingId: trip.id,
                      propertyId,
                      propertyTitle: title,
                    },
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <Star size={17} />
                Leave review
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function InfoPill({ icon, label, value, capitalize }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-[#3b71e6]">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>

      <p
        className={`text-sm font-semibold text-gray-950 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const style =
    normalized === "cancelled"
      ? "border-red-200 bg-red-50 text-red-700"
      : normalized === "completed" ||
        normalized === "checked-out" ||
        normalized === "checked out"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : normalized === "pending"
      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
      : normalized === "refunded"
      ? "border-purple-200 bg-purple-50 text-purple-700"
      : "border-green-200 bg-green-50 text-green-700";

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${style}`}
    >
      {status || "Confirmed"}
    </span>
  );
}

function EmptyTrips({ navigate }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-14 text-center">
      <div className="mb-4 text-6xl">🧳</div>

      <h2 className="text-2xl font-semibold tracking-tight">No trips yet</h2>

      <p className="mt-3 text-sm text-gray-500">
        Your bookings will appear here once you reserve a stay.
      </p>

      <button
        type="button"
        onClick={() => navigate("/")}
        className="mt-6 rounded-xl bg-[#3b71e6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2f5fc2]"
      >
        Explore stays
      </button>
    </div>
  );
}

function TripsSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2].map((item) => (
        <div key={item} className="h-64 animate-pulse rounded-3xl bg-gray-100" />
      ))}
    </div>
  );
}