import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Hotel,
  Loader2,
  MapPin,
  Route,
  ShieldCheck,
  Star,
  Users,
  Utensils,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND = "#7E4FF5";

export default function ExperienceCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const passedState = location.state || {};

  const [pkg, setPkg] = useState(passedState.experience || null);
  const [selectedDate, setSelectedDate] = useState(
    passedState.selectedDate || ""
  );
  const [travelers, setTravelers] = useState(Number(passedState.guests || 1));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [pickupNote, setPickupNote] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [loading, setLoading] = useState(!passedState.experience);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pkg) loadPackage();
  }, [id]);

  const loadPackage = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/experiences/${id}`);
      setPkg(res.data);
    } catch (err) {
      console.error("Package checkout load failed:", err);
      setError("Unable to load package checkout.");
    } finally {
      setLoading(false);
    }
  };

  const image = useMemo(() => {
    const firstImage = pkg?.images?.[0]?.image_url;

    return (
      firstImage ||
      pkg?.image ||
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
    );
  }, [pkg]);

  const price = Number(pkg?.price || 0);
  const subtotal = price * travelers;
  const serviceFee = Math.round(subtotal * 0.08);
  const total = subtotal + serviceFee;

  const days = Number(pkg?.package_days || 1);
  const nights = Number(pkg?.package_nights || Math.max(days - 1, 0));

  const handleConfirmBooking = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      if (!token || !user?.id) {
        navigate("/login");
        return;
      }

      if (!selectedDate) {
        setError("Please select a travel date.");
        return;
      }

      setSubmitting(true);

      const res = await api.post(
        "/experience-bookings",
        {
          experience_id: Number(id),
          user_id: Number(user.id),
          booking_date: selectedDate,
          guests: travelers,
          total,
          payment_method: paymentMethod,
          payment_status:
            paymentMethod === "cash" ? "Pay at trip" : "Pending",
          status: paymentMethod === "cash" ? "Confirmed" : "Pending",
          pickup_note: pickupNote,
          special_request: specialRequest,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/experience-booking-success", {
        state: {
          bookingId: res.data?.bookingId,
          experience: pkg,
          selectedDate,
          guests: travelers,
          total,
        },
      });
    } catch (err) {
      console.error("Package booking failed:", err);

      setError(
        err.response?.data?.message ||
          "Package booking failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-semibold">Loading package checkout...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black text-gray-900">
            Checkout unavailable
          </h1>

          <p className="mt-3 text-gray-500">{error}</p>

          <button
            onClick={() => navigate("/experiences")}
            className="mt-6 rounded-full px-6 py-3 font-bold text-white"
            style={{ backgroundColor: BRAND }}
          >
            Back to trip packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
          Confirm package booking
        </h1>

        <p className="mt-3 max-w-2xl text-gray-500">
          Review your travel date, travelers, pickup details and payment method
          before confirming your trip package.
        </p>

        <section className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px]">
          <div className="space-y-8">
            <div className="rounded-[28px] border border-gray-200 p-6">
              <h2 className="text-2xl font-black text-gray-900">
                Your trip package
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <FieldBox icon={<CalendarDays size={20} />} label="Travel date">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </FieldBox>

                <FieldBox icon={<Users size={20} />} label="Travelers">
                  <select
                    value={travelers}
                    onChange={(e) => setTravelers(Number(e.target.value))}
                    className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} traveler{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </FieldBox>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <MiniBox
                  icon={<Hotel size={18} />}
                  label="Hotel"
                  value={pkg.hotel_name || "Included"}
                />

                <MiniBox
                  icon={<Route size={18} />}
                  label="Transport"
                  value={pkg.transport || "Included"}
                />

                <MiniBox
                  icon={<Utensils size={18} />}
                  label="Meals"
                  value={pkg.meals || "Selected meals"}
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 p-6">
              <h2 className="text-2xl font-black text-gray-900">
                Pickup details
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Pickup location:{" "}
                <span className="font-bold text-gray-800">
                  {pkg.pickup_location || "Will be confirmed after booking"}
                </span>
              </p>

              <textarea
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
                placeholder="Add hotel name, airport terminal, or pickup note..."
                rows={4}
                className="mt-5 w-full rounded-2xl border border-gray-200 p-4 text-sm outline-none transition focus:border-[#7E4FF5]"
              />
            </div>

            <div className="rounded-[28px] border border-gray-200 p-6">
              <h2 className="text-2xl font-black text-gray-900">
                Special requests
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Share any food preference, child seat request, timing note or
                travel requirement.
              </p>

              <textarea
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="Optional"
                rows={4}
                className="mt-5 w-full rounded-2xl border border-gray-200 p-4 text-sm outline-none transition focus:border-[#7E4FF5]"
              />
            </div>

            <div className="rounded-[28px] border border-gray-200 p-6">
              <h2 className="text-2xl font-black text-gray-900">
                Payment method
              </h2>

              <div className="mt-5 space-y-3">
                <PaymentOption
                  active={paymentMethod === "cash"}
                  title="Pay at trip"
                  text="Confirm now and pay directly before or during the package."
                  icon={<CreditCard size={22} />}
                  onClick={() => setPaymentMethod("cash")}
                />

                <PaymentOption
                  active={paymentMethod === "razorpay"}
                  title="Online payment"
                  text="Reserve using secure online payment."
                  icon={<ShieldCheck size={22} />}
                  onClick={() => setPaymentMethod("razorpay")}
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-[#F7F5FF] p-6">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-1 text-[#7E4FF5]" size={22} />

                <div>
                  <h3 className="font-black text-gray-900">
                    Package booking support
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    You can contact Dovail Stay support if pickup timing,
                    package schedule or host availability changes.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="w-full rounded-2xl py-4 text-base font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 md:w-auto md:px-10"
              style={{ backgroundColor: BRAND }}
            >
              {submitting ? "Confirming..." : "Confirm package booking"}
            </button>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
              <div className="flex gap-4">
                <img
                  src={image}
                  alt={pkg.title}
                  className="h-28 w-32 rounded-2xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                    Trip Package
                  </p>

                  <h3 className="mt-1 line-clamp-2 font-black text-gray-900">
                    {pkg.title}
                  </h3>

                  <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={14} />
                    {pkg.location || pkg.city || "Destination"}
                  </p>

                  <p className="mt-2 text-sm font-bold text-gray-700">
                    {days} Days / {Math.max(nights, 0)} Nights
                  </p>

                  <p className="mt-2 flex items-center gap-1 text-sm font-bold text-gray-700">
                    <Star size={14} fill="black" />
                    {Number(pkg.rating || 0)
                      ? Number(pkg.rating).toFixed(2)
                      : "New"}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-5">
                <h3 className="text-xl font-black text-gray-900">
                  Price details
                </h3>

                <div className="mt-4 space-y-3 text-sm">
                  <PriceRow
                    label={`₹${price.toLocaleString(
                      "en-IN"
                    )} x ${travelers} traveler${travelers > 1 ? "s" : ""}`}
                    value={`₹${subtotal.toLocaleString("en-IN")}`}
                  />

                  <PriceRow
                    label="Service fee"
                    value={`₹${serviceFee.toLocaleString("en-IN")}`}
                  />

                  <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-black">
                    <span>Total</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FieldBox({ icon, label, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-xs font-black uppercase text-gray-700">
          {label}
        </span>
      </div>

      {children}
    </div>
  );
}

function MiniBox({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-2 text-[#7E4FF5]">{icon}</div>
      <p className="text-xs font-black uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function PaymentOption({ active, title, text, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#7E4FF5] bg-[#F7F5FF]"
          : "border-gray-200 bg-white hover:border-gray-900"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          active ? "bg-[#7E4FF5] text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        {icon}
      </div>

      <div>
        <h3 className="font-black text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{text}</p>
      </div>
    </button>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-gray-600">
      <span className="underline underline-offset-4">{label}</span>
      <span>{value}</span>
    </div>
  );
}