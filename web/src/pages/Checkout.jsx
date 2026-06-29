import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Home,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

import api from "../api/api";

const BRAND = "#3b71e6";
const BRAND_HOVER = "#2f5fc2";
const APP_NAME = import.meta.env.VITE_APP_NAME || "Dovail Stay";
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const property = location.state?.property;
  const guests = Number(location.state?.guests || 1);
  const nights = Number(location.state?.nights || 1);
  const checkin = location.state?.checkin || "";
  const checkout = location.state?.checkout || "";

  const [loading, setLoading] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(true);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const price = Number(property?.price || 0);
  const subtotal = price * nights;
  const serviceFee = Math.round(subtotal * 0.08);
  const taxes = Math.round(subtotal * 0.12);
  const beforeDiscountTotal = subtotal + serviceFee + taxes;
  const discount = Number(coupon?.discount || 0);
  const total = Math.max(beforeDiscountTotal - discount, 0);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const image =
    property?.image ||
    property?.image_url ||
    property?.cover_image ||
    property?.thumbnail ||
    FALLBACK_IMAGE;

  const getUser = () => {
    try {
      const user =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!user || !token) {
        alert("Please login first");
        navigate("/login");
        return null;
      }

      return user;
    } catch {
      alert("Session expired. Please login again.");
      navigate("/login");
      return null;
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const existingScript = document.querySelector(
        `script[src="${RAZORPAY_SCRIPT}"]`
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true));
        existingScript.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const validateCoupon = async () => {
    try {
      const code = couponCode.trim().toUpperCase();

      if (!code) {
        setCouponError("Enter a coupon code");
        return;
      }

      setCouponLoading(true);
      setCouponError("");

      const res = await api.post("/coupons/validate", {
        code,
        amount: beforeDiscountTotal,
      });

      setCoupon({
        code,
        discount: Number(res.data.discount || 0),
        payableAmount: Number(res.data.payableAmount || 0),
      });

      setCouponCode(code);
    } catch (err) {
      console.log("Coupon validation failed:", err);
      setCoupon(null);
      setCouponError(err.response?.data?.message || "Invalid coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const createBooking = async ({ method, paymentId, orderId }) => {
    const user = getUser();
    if (!user) return;

    const res = await api.post("/bookings", {
      property_id: property.id,
      user_id: user.id,
      checkin,
      checkout,
      guests,
      total,
      payment_method: method,
      payment_status: "Paid",
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      coupon_code: coupon?.code || null,
      discount,
      service_fee: serviceFee,
      taxes,
    });

    navigate("/booking-success", {
      replace: true,
      state: {
        booking: res.data,
        property,
        guests,
        nights,
        total,
        discount,
        couponCode: coupon?.code || null,
        paymentMethod: method,
        paymentStatus: "Paid",
        checkin,
        checkout,
      },
    });
  };

  const payWithRazorpay = async () => {
    const user = getUser();
    if (!user) return;

    if (!property?.id) {
      alert("Property not found");
      return;
    }

    const scriptLoaded = await loadRazorpay();

    if (!scriptLoaded) {
      alert("Razorpay failed to load. Please check your internet connection.");
      return;
    }

    const orderRes = await api.post("/payments/create-order", {
      user_id: user.id,
      property_id: property.id,
      amount: total,
      currency: "INR",
      coupon_code: coupon?.code || null,
      discount,
      service_fee: serviceFee,
      taxes,
      checkin,
      checkout,
      guests,
    });

    const options = {
      key: orderRes.data.key,
      amount: orderRes.data.order.amount,
      currency: "INR",
      name: APP_NAME,
      description: property?.title || "Stay booking",
      order_id: orderRes.data.order.id,

      prefill: {
        name: user.fullname || user.name || "",
        email: user.email || "",
        contact: user.phone || user.phone_number || "",
      },

      notes: {
        property_id: String(property.id),
        user_id: String(user.id),
        checkin,
        checkout,
        guests: String(guests),
      },

      theme: {
        color: BRAND,
      },

      modal: {
        escape: true,
        ondismiss: () => setLoading(false),
      },

      handler: async (response) => {
        await api.post("/payments/verify", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });

        await createBooking({
          method: "razorpay",
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
        });
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", (response) => {
      console.log("Razorpay payment failed:", response.error);
      alert(response.error?.description || "Payment failed. Please try again.");
      setLoading(false);
    });

    razorpay.open();
  };

  const handlePayment = async () => {
    try {
      if (!acceptedRules) {
        alert("Please accept the house rules before continuing.");
        return;
      }

      setLoading(true);

      if (!property?.id) {
        alert("Property not found");
        return;
      }

      await payWithRazorpay();
    } catch (err) {
      console.log("Checkout failed:", err);

      if (err.response?.status === 409) {
        alert("This property is already booked for these dates.");
        return;
      }

      alert(err.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md rounded-[28px] border border-gray-200 p-8 text-center shadow-sm">
          <Home className="mx-auto text-gray-400" size={34} />
          <h1 className="mt-5 text-2xl font-semibold text-gray-950">
            No property selected
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Please select a stay before continuing to checkout.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-xl bg-[#3b71e6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f5fc2]"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-7 md:px-8 lg:pt-10">
        <header className="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Confirm and pay
          </h1>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="max-w-2xl space-y-8">
            <TopNotice />

            <Section title="Your trip">
              <TripRow title="Dates" value={`${checkin} – ${checkout}`} />
              <TripRow
                title="Guests"
                value={`${guests} ${guests === 1 ? "guest" : "guests"}`}
              />
            </Section>

            <Divider />

            <Section title="Choose how to pay">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border-2 border-gray-950 p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                    <CreditCard size={21} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-950">
                      Pay securely with Razorpay
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      UPI, cards, wallets and net banking
                    </p>
                  </div>
                </div>
                <CheckCircle size={22} className="text-gray-950" />
              </button>

              <p className="mt-4 text-sm leading-6 text-gray-500">
                Your card or UPI details are handled securely by Razorpay. We
                confirm your booking only after successful payment verification.
              </p>
            </Section>

            <Divider />

            <Section title="Apply coupon">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError("");
                  }}
                  disabled={Boolean(coupon)}
                  placeholder="WELCOME10"
                  className="h-12 flex-1 rounded-xl border border-gray-300 px-4 text-sm font-semibold uppercase outline-none transition placeholder:text-gray-400 focus:border-gray-950 disabled:bg-gray-50"
                />

                {coupon ? (
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-950 transition hover:bg-gray-50"
                  >
                    <X size={16} />
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={validateCoupon}
                    disabled={couponLoading}
                    className="h-12 rounded-xl bg-gray-950 px-6 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                  >
                    {couponLoading ? "Checking..." : "Apply"}
                  </button>
                )}
              </div>

              {coupon && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                  <CheckCircle size={17} />
                  Coupon {coupon.code} applied. You saved{" "}
                  {formatINR(coupon.discount)}.
                </div>
              )}

              {couponError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                  {couponError}
                </div>
              )}
            </Section>

            <Divider />

            <Section title="Cancellation policy">
              <p className="text-sm leading-7 text-gray-600">
                Free cancellation before check-in according to the host policy.
                After that, the reservation may be partially refundable based on
                the stay rules.
              </p>
            </Section>

            <Divider />

            <Section title="Ground rules">
              <div className="space-y-3">
                <Rule text="Follow the house rules" />
                <Rule text="Treat the host’s place like your own home" />
                <Rule text="Contact the host if your plans change" />
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-black"
                />
                <span className="text-sm leading-6 text-gray-600">
                  I agree to the booking terms, cancellation policy, and house
                  rules.
                </span>
              </label>
            </Section>

            <Divider />

            <div>
              <p className="text-xs leading-6 text-gray-500">
                By selecting the button below, I agree to the host’s house
                rules, cancellation policy, and booking terms. Razorpay will
                securely process the payment.
              </p>

              <button
                onClick={handlePayment}
                disabled={loading || !acceptedRules}
                className="mt-5 h-14 w-full rounded-xl bg-[#3b71e6] text-base font-semibold text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto sm:px-10"
              >
                {loading ? "Processing..." : "Confirm and pay"}
              </button>
            </div>
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,0.08)]">
              <div className="flex gap-4">
                <img
                  src={image}
                  alt={property?.title || "Selected stay"}
                  className="h-28 w-28 rounded-2xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Entire stay</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-gray-950">
                    {property?.title || "Selected stay"}
                  </h3>
                  <p className="mt-2 text-xs font-medium text-gray-600">
                    ★ {property?.rating || "5.0"} · Guest favorite
                  </p>
                </div>
              </div>

              <SummaryDivider />

              <h3 className="text-xl font-semibold tracking-tight">
                Price details
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <PriceRow
                  label={`${formatINR(price)} × ${nights} ${
                    nights === 1 ? "night" : "nights"
                  }`}
                  value={formatINR(subtotal)}
                />
                <PriceRow label="Service fee" value={formatINR(serviceFee)} />
                <PriceRow label="Taxes" value={formatINR(taxes)} />

                {discount > 0 && (
                  <PriceRow
                    label="Coupon discount"
                    value={`-${formatINR(discount)}`}
                    success
                  />
                )}
              </div>

              <SummaryDivider />

              <div className="flex justify-between text-base font-semibold">
                <span>Total INR</span>
                <span>{formatINR(total)}</span>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading || !acceptedRules}
                className="mt-6 h-13 w-full rounded-xl bg-[#3b71e6] py-3.5 text-sm font-semibold text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loading ? "Processing..." : "Confirm and pay"}
              </button>

              <p className="mt-3 text-center text-xs text-gray-500">
                You will be taken to secure Razorpay checkout.
              </p>

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                <ShieldCheck size={20} className="mt-0.5 text-gray-800" />
                <p className="text-sm leading-6 text-gray-600">
                  Your booking is confirmed only after payment verification.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <Tag size={18} className="text-green-700" />
              <p className="text-sm font-semibold text-green-800">
                Secure payment powered by Razorpay
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TopNotice() {
  return (
    <div className="rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-950">
            This is a rare find.
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            This stay is usually booked quickly. Complete your payment to secure
            your reservation.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-5 text-[22px] font-semibold tracking-tight text-gray-950">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TripRow({ title, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <h3 className="text-base font-semibold text-gray-950">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{value || "Not selected"}</p>
      </div>
      <button
        type="button"
        className="text-sm font-semibold underline underline-offset-2"
      >
        Edit
      </button>
    </div>
  );
}

function Rule({ text }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-700">
      <Check size={18} className="text-gray-950" />
      <span>{text}</span>
    </div>
  );
}

function PriceRow({ label, value, success }) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        success ? "font-semibold text-green-700" : "text-gray-600"
      }`}
    >
      <span>{label}</span>
      <span className="font-medium text-gray-950">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-200" />;
}

function SummaryDivider() {
  return <div className="my-5 border-t border-gray-200" />;
}