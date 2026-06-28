import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Tag,
  Wallet,
  X,
} from "lucide-react";

import api from "../api/api";

const BRAND = "#3b71e6";
const BRAND_HOVER = "#2f5fc2";
const APP_NAME = import.meta.env.VITE_APP_NAME || "Dovail Stay";
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const property = location.state?.property;
  const guests = Number(location.state?.guests || 1);
  const nights = Number(location.state?.nights || 1);
  const checkin = location.state?.checkin || "";
  const checkout = location.state?.checkout || "";

  const [paymentType, setPaymentType] = useState("razorpay");
  const [loading, setLoading] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const price = Number(property?.price || 0);
  const subtotal = price * nights;
  const beforeDiscountTotal = subtotal;
  const discount = Number(coupon?.discount || 0);
  const total = Math.max(beforeDiscountTotal - discount, 0);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

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
        ondismiss: () => {
          setLoading(false);
        },
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

  const paymentOptions = useMemo(
    () => [
      {
        id: "razorpay",
        name: "Razorpay Secure Checkout",
        desc: "Cards, UPI, NetBanking and wallets",
        icon: <Wallet size={21} className="text-[#3b71e6]" />,
      },
      {
        id: "upi",
        name: "UPI / Google Pay",
        desc: "Pay using UPI apps through Razorpay",
        icon: <Smartphone size={21} className="text-[#3b71e6]" />,
      },
      {
        id: "card",
        name: "Credit or debit card",
        desc: "Card payment handled securely by Razorpay",
        icon: <CreditCard size={21} className="text-[#3b71e6]" />,
      },
    ],
    []
  );

  if (!property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
            No property selected
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Please choose a property before checkout.
          </p>

          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-8">
        <header className="mb-8 flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <p className="text-sm font-medium text-gray-500">Checkout</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Confirm and pay
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Review your trip details and complete the payment securely.
            </p>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <Card title="Your trip">
              <div className="space-y-4">
                <DetailRow title="Dates" value={`${checkin} – ${checkout}`} />
                <DetailRow
                  title="Guests"
                  value={`${guests} ${guests === 1 ? "guest" : "guests"}`}
                />
              </div>
            </Card>

            <Card title="Pay with">
              <div className="divide-y divide-gray-100">
                {paymentOptions.map((option) => (
                  <PaymentOption
                    key={option.id}
                    option={option}
                    active={paymentType === option.id}
                    onClick={() => setPaymentType(option.id)}
                  />
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#eef4ff] p-4 text-sm leading-6 text-gray-600">
                Razorpay opens a secure payment window. Your booking is created
                only after payment verification.
              </div>
            </Card>

            <Card title="Apply coupon">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError("");
                  }}
                  disabled={Boolean(coupon)}
                  placeholder="WELCOME10"
                  className="h-11 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium uppercase outline-none transition placeholder:text-gray-400 focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10 disabled:bg-gray-50"
                />

                {coupon ? (
                  <button
                    onClick={removeCoupon}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <X size={16} />
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={validateCoupon}
                    disabled={couponLoading}
                    className="h-11 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:opacity-60"
                  >
                    {couponLoading ? "Checking..." : "Apply"}
                  </button>
                )}
              </div>

              {coupon && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                  <CheckCircle size={17} />
                  Coupon {coupon.code} applied. You saved{" "}
                  {formatINR(coupon.discount)}.
                </div>
              )}

              {couponError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                  {couponError}
                </div>
              )}
            </Card>

            <Card title="Ground rules">
              <p className="text-sm leading-7 text-gray-600">
                Follow the host rules, treat the home respectfully, and contact
                the host if anything changes before check-in.
              </p>
            </Card>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? "Processing..." : `Pay ${formatINR(total)}`}
            </button>
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <img
                  src={
                    property?.image ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80"
                  }
                  alt={property?.title || "Stay"}
                  className="h-24 w-24 rounded-xl object-cover"
                />

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Entire stay
                  </p>

                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-gray-950">
                    {property?.title || "Selected stay"}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    ★ {property?.rating || "5.0"} · Guest favorite
                  </p>
                </div>
              </div>

              <Divider />

              <h4 className="text-lg font-semibold tracking-tight text-gray-950">
                Price details
              </h4>

              <div className="mt-4 space-y-3 text-sm">
                <PriceRow
                  label={`${formatINR(price)} × ${nights} nights`}
                  value={formatINR(subtotal)}
                />

                {discount > 0 && (
                  <PriceRow
                    label="Coupon discount"
                    value={`-${formatINR(discount)}`}
                    success
                  />
                )}
              </div>

              <Divider />

              <div className="flex justify-between text-base font-semibold text-gray-950">
                <span>Total INR</span>
                <span>{formatINR(total)}</span>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#eef4ff] p-4">
                <ShieldCheck size={20} className="mt-0.5 text-[#3b71e6]" />

                <p className="text-sm leading-6 text-gray-600">
                  Your payment is verified securely before booking confirmation.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <Tag size={19} className="text-green-700" />
              <p className="text-sm font-medium text-green-800">
                You won’t be redirected away from the booking page.
              </p>
            </div>
          </aside>
        </div>
      </main>
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

function PaymentOption({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between py-4 text-left transition ${
        active ? "text-[#3b71e6]" : "text-gray-900 hover:text-[#3b71e6]"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
            active
              ? "border-[#3b71e6] bg-[#eef4ff]"
              : "border-gray-200 bg-white"
          }`}
        >
          {option.icon}
        </div>

        <div>
          <span className="text-sm font-medium">{option.name}</span>
          <p className="mt-1 text-xs text-gray-500">{option.desc}</p>
        </div>
      </div>

      <Radio checked={active} />
    </button>
  );
}

function Radio({ checked }) {
  return (
    <div
      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
        checked ? "border-[#3b71e6]" : "border-gray-300"
      }`}
    >
      {checked && <div className="h-2.5 w-2.5 rounded-full bg-[#3b71e6]" />}
    </div>
  );
}

function DetailRow({ title, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-medium text-gray-950">{title}</h3>
      <p className="text-right text-sm text-gray-600">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, success }) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        success ? "font-medium text-green-700" : "text-gray-600"
      }`}
    >
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-5 border-t border-gray-200" />;
}