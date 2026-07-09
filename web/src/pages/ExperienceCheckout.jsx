import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";
import { formatINR, getStoredUser } from "../utils/resortUtils";

const BRAND = "#3b71e6";
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export default function ExperienceCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const [pkg, setPkg] = useState(state.experience || null);
  const [loading, setLoading] = useState(!state.experience);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [error, setError] = useState("");

  const selectedDate = state.selectedDate || "";
  const travelers = Number(state.guests || 1);
  const departureId = state.departureId || null;
  const selectedDeparture = state.selectedDeparture || null;

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
      console.error("Package payment load failed:", err);
      setError("Unable to load payment details.");
    } finally {
      setLoading(false);
    }
  };

  const image = useMemo(() => {
    return (
      pkg?.images?.[0]?.image_url ||
      pkg?.image ||
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
    );
  }, [pkg]);

  const price = Number(pkg?.price || 0);
  const subtotal = price * travelers;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const existingScript = document.querySelector(
        `script[src="${RAZORPAY_SCRIPT}"]`
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), {
          once: true,
        });
        existingScript.addEventListener("error", () => resolve(false), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const getUserOrRedirect = () => {
    const user = getStoredUser();

    if (!user?.id) {
      navigate("/login");
      return null;
    }

    return user;
  };

  const createBooking = async ({
    paymentStatus,
    paymentId = null,
    orderId = null,
  }) => {
    const user = getUserOrRedirect();
    if (!user) return;

    const res = await api.post("/experience-bookings", {
      experience_id: Number(id),
      user_id: Number(user.id),
      departure_id: departureId,
      booking_date: selectedDate,
      guests: travelers,
      total,
      taxes,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: paymentStatus === "Paid" ? "Confirmed" : "Pending",
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
    });

    navigate("/experience-booking-success", {
      replace: true,
      state: {
        bookingId: res.data?.bookingId,
        experience: pkg,
        selectedDate,
        guests: travelers,
        departureId,
        selectedDeparture,
        subtotal,
        taxes,
        total,
        paymentStatus,
        paymentId,
      },
    });
  };

  const payWithRazorpay = async () => {
    const user = getUserOrRedirect();
    if (!user) return;

    const loaded = await loadRazorpay();

    if (!loaded) {
      setError("Razorpay failed to load. Please try again.");
      return;
    }

    const orderRes = await api.post("/experience-payments/create-order", {
      experience_id: Number(id),
      user_id: Number(user.id),
      amount: total,
      currency: "INR",
      guests: travelers,
      booking_date: selectedDate,
      departure_id: departureId,
    });

    const options = {
      key: orderRes.data.key,
      amount: orderRes.data.order.amount,
      currency: "INR",
      name: "Dovail Stay",
      description: pkg?.title || "Trip package payment",
      order_id: orderRes.data.order.id,
      theme: {
        color: BRAND,
      },
      prefill: {
        name: user.fullname || user.name || "",
        email: user.email || "",
        contact: user.phone || user.phone_number || "",
      },
      notes: {
        experience_id: String(id),
        user_id: String(user.id),
        booking_date: selectedDate,
        guests: String(travelers),
      },
      handler: async (response) => {
        try {
          await api.post("/experience-payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          await createBooking({
            paymentStatus: "Paid",
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
          });
        } catch (err) {
          console.error("Experience payment verification failed:", err);
          setError(
            err.response?.data?.message ||
              "Payment verification failed. Please contact support."
          );
          setPaying(false);
        }
      },
      modal: {
        escape: true,
        ondismiss: () => setPaying(false),
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", (response) => {
      console.log("Payment failed:", response.error);
      setError(response.error?.description || "Payment failed. Please try again.");
      setPaying(false);
    });

    razorpay.open();
  };

  const handlePayment = async () => {
    try {
      if (paying) return;

      setError("");

      if (!selectedDate) {
        setError("Travel date is missing. Please go back and select a package date.");
        return;
      }

      if (!pkg?.id && !id) {
        setError("Package details are missing.");
        return;
      }

      if (travelers <= 0) {
        setError("Please select at least one traveler.");
        return;
      }

      if (total <= 0) {
        setError("Invalid payment amount.");
        return;
      }

      setPaying(true);

      if (paymentMethod === "pay_later") {
        await createBooking({
          paymentStatus: "Pay at trip",
        });
        return;
      }

      await payWithRazorpay();
    } catch (err) {
      console.error("Payment failed:", err);
      setError(err.response?.data?.message || "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="animate-spin text-[#3b71e6]" size={22} />
            <span className="text-sm font-medium">Loading payment...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Payment unavailable
            </h1>
            <p className="mt-3 text-sm text-gray-500">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/experiences")}
              className="mt-6 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white"
            >
              Back to packages
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
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <p className="text-sm font-medium text-gray-500">Payment</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
            Confirm and pay
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Complete your payment securely to confirm this trip package.
          </p>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card title="Payment method">
              <div className="space-y-3">
                <PaymentOption
                  active={paymentMethod === "razorpay"}
                  title="Razorpay secure checkout"
                  text="Pay using UPI, card, net banking or wallet."
                  icon={<Wallet size={20} />}
                  onClick={() => setPaymentMethod("razorpay")}
                />

                <PaymentOption
                  active={paymentMethod === "upi"}
                  title="UPI / Google Pay"
                  text="UPI payment handled securely through Razorpay."
                  icon={<Smartphone size={20} />}
                  onClick={() => setPaymentMethod("razorpay")}
                />

                <PaymentOption
                  active={paymentMethod === "card"}
                  title="Credit or debit card"
                  text="Card payment handled securely through Razorpay."
                  icon={<CreditCard size={20} />}
                  onClick={() => setPaymentMethod("razorpay")}
                />

                <PaymentOption
                  active={paymentMethod === "pay_later"}
                  title="Pay at trip"
                  text="Confirm now and pay before or during the package."
                  icon={<ShieldCheck size={20} />}
                  onClick={() => setPaymentMethod("pay_later")}
                />
              </div>
            </Card>

            <Card title="Trip summary">
              <div className="space-y-4">
                <SummaryRow
                  label="Travel date"
                  value={formatDisplayDate(selectedDate)}
                />

                <SummaryRow
                  label="Travelers"
                  value={`${travelers} traveler${travelers > 1 ? "s" : ""}`}
                />

                <SummaryRow
                  label="Departure"
                  value={
                    selectedDeparture
                      ? formatDisplayDate(selectedDeparture.departure_date)
                      : "Flexible"
                  }
                />
              </div>
            </Card>

            <div className="rounded-2xl border border-blue-200 bg-[#eef4ff] p-5">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 text-[#3b71e6]" size={20} />
                <p className="text-sm leading-6 text-gray-600">
                  Your booking will be confirmed after successful payment
                  verification.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handlePayment}
              disabled={paying}
              className="h-12 w-full rounded-xl bg-[#3b71e6] px-6 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300 md:w-auto"
            >
              {paying
                ? "Processing..."
                : paymentMethod === "pay_later"
                ? "Confirm booking"
                : `Pay ${formatINR(total)}`}
            </button>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <img
                  src={image}
                  alt={pkg.title}
                  className="h-24 w-24 rounded-xl object-cover"
                />

                <div className="min-w-0">
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
                </div>
              </div>

              <div className="mt-5 border-t border-gray-200 pt-5">
                <h3 className="text-lg font-semibold tracking-tight text-gray-950">
                  Price details
                </h3>

                <div className="mt-4 space-y-3 text-sm">
                  <PriceRow
                    label={`${formatINR(price)} × ${travelers}`}
                    value={formatINR(subtotal)}
                  />

                  <PriceRow label="Taxes" value={formatINR(taxes)} />

                  <div className="flex justify-between border-t border-gray-200 pt-4 font-semibold text-gray-950">
                    <span>Total</span>
                    <span>{formatINR(total)}</span>
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

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-950">
        {value}
      </span>
    </div>
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
  if (!value) return "Not selected";

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