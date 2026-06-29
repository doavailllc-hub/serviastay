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

const BRAND = "#3b71e6";

export default function ExperienceCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const passedState = location.state || {};

  const [departureId] = useState(passedState.departureId || null);
  const [selectedDeparture] = useState(passedState.selectedDeparture || null);

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
      const user = JSON.parse(localStorage.getItem("user") || "null");

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
          departure_id: departureId,
          booking_date: selectedDate,
          guests: travelers,
          total,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "cash" ? "Pay at trip" : "Pending",
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
          departureId,
          selectedDeparture,
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

  if (loading) return <LoadingPage />;

  if (!pkg) {
    return (
      <div className="min-h-screen bg-white text-gray-950">
        <Navbar />

        <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Checkout unavailable
            </h1>

            <p className="mt-3 text-sm text-gray-500">{error}</p>

            <button
              onClick={() => navigate("/experiences")}
              className="mt-6 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
            >
              Back to trip packages
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <p className="text-sm font-medium text-gray-500">Checkout</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
            Confirm package booking
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Review your travel date, travelers, pickup details and payment
            method before confirming your trip package.
          </p>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card title="Your trip package">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBox icon={<CalendarDays size={18} />} label="Travel date">
                  <input
                    type="date"
                    value={selectedDate}
                    disabled={Boolean(selectedDeparture)}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-2 w-full bg-transparent text-sm outline-none disabled:text-gray-500"
                  />
                </FieldBox>

                <FieldBox icon={<Users size={18} />} label="Travelers">
                  <select
                    value={travelers}
                    onChange={(e) => setTravelers(Number(e.target.value))}
                    className="mt-2 w-full bg-transparent text-sm outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} traveler{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </FieldBox>
              </div>

              {selectedDeparture && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-[#eef4ff] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#3b71e6]">
                    Selected departure
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-950">
                    {formatDisplayDate(selectedDeparture.departure_date)}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {Math.max(
                      Number(selectedDeparture.total_seats || 0) -
                        Number(selectedDeparture.booked_seats || 0),
                      0
                    )}{" "}
                    seats left
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MiniBox
                  icon={<Hotel size={17} />}
                  label="Hotel"
                  value={pkg.hotel_name || "Included"}
                />

                <MiniBox
                  icon={<Route size={17} />}
                  label="Transport"
                  value={pkg.transport || "Included"}
                />

                <MiniBox
                  icon={<Utensils size={17} />}
                  label="Meals"
                  value={pkg.meals || "Selected meals"}
                />
              </div>
            </Card>

            <Card title="Pickup details">
              <p className="text-sm leading-6 text-gray-500">
                Pickup location:{" "}
                <span className="font-medium text-gray-950">
                  {pkg.pickup_location || "Will be confirmed after booking"}
                </span>
              </p>

              <Textarea
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
                placeholder="Add hotel name, airport terminal, or pickup note..."
              />
            </Card>

            <Card title="Special requests">
              <p className="text-sm leading-6 text-gray-500">
                Share any food preference, child seat request, timing note or
                travel requirement.
              </p>

              <Textarea
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="Optional"
              />
            </Card>

            <Card title="Payment method">
              <div className="space-y-3">
                <PaymentOption
                  active={paymentMethod === "cash"}
                  title="Pay at trip"
                  text="Confirm now and pay directly before or during the package."
                  icon={<CreditCard size={20} />}
                  onClick={() => setPaymentMethod("cash")}
                />

                <PaymentOption
                  active={paymentMethod === "razorpay"}
                  title="Online payment"
                  text="Reserve using secure online payment."
                  icon={<ShieldCheck size={20} />}
                  onClick={() => setPaymentMethod("razorpay")}
                />
              </div>
            </Card>

            <div className="rounded-2xl border border-blue-200 bg-[#eef4ff] p-5">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 text-[#3b71e6]" size={20} />

                <div>
                  <h3 className="text-sm font-semibold text-gray-950">
                    Package booking support
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Contact Dovail Stay support if pickup timing, package
                    schedule or host availability changes.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-[#3b71e6] px-6 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300 md:w-auto"
            >
              {submitting ? "Confirming..." : "Confirm package booking"}
            </button>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SummaryCard
              pkg={pkg}
              image={image}
              days={days}
              nights={nights}
              selectedDeparture={selectedDeparture}
              price={price}
              travelers={travelers}
              subtotal={subtotal}
              serviceFee={serviceFee}
              total={total}
            />
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin text-[#3b71e6]" size={22} />
          <span className="text-sm font-medium">
            Loading package checkout...
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  pkg,
  image,
  days,
  nights,
  selectedDeparture,
  price,
  travelers,
  subtotal,
  serviceFee,
  total,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <img
          src={image}
          alt={pkg.title}
          className="h-24 w-24 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Trip package
          </p>

          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-gray-950">
            {pkg.title}
          </h3>

          <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={14} />
            {pkg.location || pkg.city || "Destination"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {days} days / {Math.max(nights, 0)} nights
          </p>

          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Star size={13} fill="currentColor" />
            {Number(pkg.rating || 0)
              ? Number(pkg.rating).toFixed(2)
              : "New"}
          </p>
        </div>
      </div>

      {selectedDeparture && (
        <div className="mt-5 rounded-2xl bg-[#eef4ff] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#3b71e6]">
            Departure
          </p>

          <p className="mt-1 text-sm font-medium text-gray-950">
            {formatDisplayDate(selectedDeparture.departure_date)}
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-gray-200 pt-5">
        <h3 className="text-lg font-semibold tracking-tight text-gray-950">
          Price details
        </h3>

        <div className="mt-4 space-y-3 text-sm">
          <PriceRow
            label={`₹${price.toLocaleString("en-IN")} × ${travelers} traveler${
              travelers > 1 ? "s" : ""
            }`}
            value={`₹${subtotal.toLocaleString("en-IN")}`}
          />

          <PriceRow
            label="Service fee"
            value={`₹${serviceFee.toLocaleString("en-IN")}`}
          />

          <div className="flex justify-between border-t border-gray-200 pt-4 font-semibold text-gray-950">
            <span>Total</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-gray-950">
        {title}
      </h2>

      {children}
    </section>
  );
}

function FieldBox({ icon, label, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}

        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>

      {children}
    </div>
  );
}

function MiniBox({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="mb-2 text-[#3b71e6]">{icon}</div>

      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-950">{value}</p>
    </div>
  );
}

function Textarea(props) {
  return (
    <textarea
      rows={4}
      {...props}
      className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
    />
  );
}

function PaymentOption({ active, title, text, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#3b71e6] bg-[#eef4ff]"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            active ? "bg-[#3b71e6] text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {icon}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
        </div>
      </div>

      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          active ? "border-[#3b71e6]" : "border-gray-300"
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[#3b71e6]" />}
      </span>
    </button>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-gray-600">
      <span>{label}</span>
      <span className="font-medium text-gray-950">{value}</span>
    </div>
  );
}

function formatDisplayDate(value) {
  if (!value) return "No date";

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