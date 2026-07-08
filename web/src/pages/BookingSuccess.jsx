import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle,
  Download,
  Home,
  MapPin,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import api from "../api/api";
import { formatINR, getStoredUser } from "../utils/resortUtils";

const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://stay.dovail.com";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80";

function getImageUrl(booking, property) {
  const image =
    booking?.image ||
    property?.image ||
    property?.image_url ||
    property?.cover_image ||
    property?.thumbnail ||
    "";

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

function formatDate(dateString) {
  if (!dateString) return "Not selected";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

export default function BookingSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const stateBooking = location.state?.booking || null;
  const property = location.state?.property || null;

  const bookingId =
    stateBooking?.bookingId ||
    stateBooking?.id ||
    location.state?.bookingId ||
    location.state?.booking_id ||
    null;

  const [booking, setBooking] = useState(stateBooking);
  const [loading, setLoading] = useState(Boolean(bookingId && !stateBooking));
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId || stateBooking) return;

      try {
        setLoading(true);
        setError("");

        const user = getStoredUser();

        if (!user?.id) {
          setError("Please login to view your booking.");
          return;
        }

        const { data } = await api.get(`/trip/${bookingId}`);
        setBooking(data);
      } catch (err) {
        console.log("Booking success load failed:", err);
        setError(err.response?.data?.message || "Booking details could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, stateBooking]);

  const details = useMemo(() => {
    const guests = Number(
      booking?.guests ||
        location.state?.guests ||
        1
    );

    const nights = Number(
      location.state?.nights ||
        booking?.nights ||
        1
    );

    const total = Number(
      booking?.total ||
        location.state?.total ||
        0
    );

    const checkin =
      booking?.checkin ||
      location.state?.checkin ||
      "";

    const checkout =
      booking?.checkout ||
      location.state?.checkout ||
      "";

    const title =
      booking?.title ||
      property?.title ||
      "Selected Stay";

    const locationText =
      booking?.location ||
      property?.location ||
      "Location not specified";

    const paymentMethod =
      location.state?.paymentMethod ||
      booking?.payment_method ||
      "razorpay";

    const paymentStatus =
      location.state?.paymentStatus ||
      booking?.payment_status ||
      "Paid";

    return {
      guests,
      nights,
      total,
      checkin,
      checkout,
      title,
      locationText,
      paymentMethod,
      paymentStatus,
    };
  }, [booking, location.state, property]);

  const image = getImageUrl(booking, property);
  const displayBookingId = bookingId || booking?.id || booking?.bookingId;

  const downloadReceipt = () => {
    if (!displayBookingId) return;
    window.open(`${SITE_URL}/api/bookings/${displayBookingId}/receipt`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-gray-100" />
          <div className="mx-auto mt-6 h-8 w-64 animate-pulse rounded-xl bg-gray-100" />
          <div className="mx-auto mt-4 h-4 w-80 animate-pulse rounded-xl bg-gray-100" />
          <div className="mt-8 h-48 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || (!booking && !property)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <ReceiptText className="mx-auto text-gray-400" size={40} />

          <h1 className="mt-5 text-2xl font-semibold text-gray-950">
            Booking details unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            {error || "We could not find the booking details for this confirmation."}
          </p>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => navigate("/trips")}
              className="rounded-xl bg-[#3b71e6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f5fc2]"
            >
              View my trips
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-8 text-gray-950 md:py-12">
      <main className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-sm">
          <section className="grid gap-0 lg:grid-cols-[1fr_380px]">
            <div className="p-6 md:p-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
                <CheckCircle size={34} />
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#3b71e6]">
                Booking confirmed
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                You’re going to {details.locationText.split(",")[0]}.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500 md:text-base">
                Your reservation has been confirmed. We’ve saved the booking in
                your trips and sent the host your reservation details.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <ConfirmationItem
                  icon={<ShieldCheck size={20} />}
                  title="Payment verified"
                  text={details.paymentStatus}
                />

                <ConfirmationItem
                  icon={<ReceiptText size={20} />}
                  title="Booking ID"
                  text={displayBookingId ? `#${displayBookingId}` : "Created"}
                />

                <ConfirmationItem
                  icon={<MessageCircle size={20} />}
                  title="Host notified"
                  text="Ready for your trip"
                />
              </div>

              <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-5">
                <h2 className="text-xl font-semibold tracking-tight">
                  Reservation details
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <DetailCard
                    icon={<CalendarDays size={20} />}
                    label="Dates"
                    value={`${formatDate(details.checkin)} → ${formatDate(
                      details.checkout
                    )}`}
                  />

                  <DetailCard
                    icon={<Users size={20} />}
                    label="Guests"
                    value={`${details.guests} ${
                      details.guests === 1 ? "guest" : "guests"
                    }`}
                  />

                  <DetailCard
                    icon={<MapPin size={20} />}
                    label="Location"
                    value={details.locationText}
                  />

                  <DetailCard
                    icon={<ReceiptText size={20} />}
                    label="Payment"
                    value={`Paid with ${details.paymentMethod}`}
                    capitalize
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/trips"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-6 text-sm font-semibold text-white transition hover:bg-[#2f5fc2]"
                >
                  View my trips
                  <ArrowRight size={17} />
                </Link>

                <button
                  type="button"
                  onClick={downloadReceipt}
                  disabled={!displayBookingId}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={17} />
                  Download receipt
                </button>

                <Link
                  to="/"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 text-sm font-semibold transition hover:bg-gray-50"
                >
                  <Home size={17} />
                  Continue exploring
                </Link>
              </div>
            </div>

            <aside className="border-t border-gray-200 bg-gray-50 p-6 lg:border-l lg:border-t-0">
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <img
                  src={image}
                  alt={details.title}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    if (event.currentTarget.src !== FALLBACK_IMAGE) {
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }
                  }}
                  className="h-64 w-full object-cover"
                />

                <div className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Entire stay
                  </p>

                  <h2 className="mt-2 line-clamp-2 text-lg font-semibold leading-6">
                    {details.title}
                  </h2>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                    {details.locationText}
                  </p>

                  <div className="my-5 border-t border-gray-200" />

                  <InfoRow label="Nights" value={details.nights} />
                  <InfoRow label="Guests" value={details.guests} />
                  <InfoRow label="Payment status" value={details.paymentStatus} />

                  <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5">
                    <span className="text-base font-semibold">Total paid</span>
                    <span className="text-xl font-bold text-[#3b71e6]">
                      {formatINR(details.total)}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function ConfirmationItem({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-[#3b71e6]">{icon}</div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
    </div>
  );
}

function DetailCard({ icon, label, value, capitalize }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-gray-50 p-4">
      <div className="mt-0.5 text-[#3b71e6]">{icon}</div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p
          className={`mt-1 text-sm font-semibold text-gray-950 ${
            capitalize ? "capitalize" : ""
          }`}
        >
          {value || "Not available"}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-950">{value}</span>
    </div>
  );
}