import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  ChevronDown,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Tag,
  Wallet,
  X,
} from "lucide-react";

import api from "../api/api";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const property = location.state?.property;
  const guests = location.state?.guests || 1;
  const nights = location.state?.nights || 2;
  const checkin = location.state?.checkin || "2026-06-12";
  const checkout = location.state?.checkout || "2026-06-14";

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const price = Number(property?.price || 0);
  const subtotal = price * nights;
  const taxes = Math.round(subtotal * 0.12);
  const beforeDiscountTotal = subtotal + taxes;
  const discount = Number(coupon?.discount || 0);
  const total = Math.max(beforeDiscountTotal - discount, 0);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getUser = () => {
    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!user || !token) {
      alert("Please login first");
      navigate("/");
      return null;
    }

    return user;
  };

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
        payableAmount: Number(res.data.payableAmount || total),
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
    setCouponError("");
    setCouponCode("");
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createBooking = async (method) => {
    const user = getUser();
    if (!user) return;

    if (!property?.id) {
      alert("Property not found");
      return;
    }

    await api.post("/bookings", {
      property_id: property.id,
      user_id: user.id,
      checkin,
      checkout,
      guests,
      total,
      payment_method: method,
      coupon_code: coupon?.code || null,
      discount,
    });

    navigate("/booking-success", {
      state: {
        property,
        guests,
        nights,
        total,
        discount,
        couponCode: coupon?.code || null,
        paymentMethod: method,
        checkin,
        checkout,
      },
    });
  };

  const payWithRazorpay = async () => {
    try {
      const user = getUser();
      if (!user) return;

      const loaded = await loadRazorpay();

      if (!loaded) {
        alert("Razorpay SDK failed to load");
        return;
      }

      const orderRes = await api.post("/payments/create-order", {
        user_id: user.id,
        property_id: property?.id,
        amount: total,
      });

      const options = {
        key: orderRes.data.key,
        amount: orderRes.data.order.amount,
        currency: "INR",
        name: "Servia Stay",
        description: property?.title || "Property Booking",
        order_id: orderRes.data.order.id,
        prefill: {
          name: user.fullname || "",
          email: user.email || "",
        },
        theme: {
          color: "#8363F5",
        },
        handler: async function (response) {
          await api.post("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          await createBooking("razorpay");
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.log("Razorpay failed:", err);
      alert("Payment failed. Please try again.");
    }
  };

  const handleBooking = async () => {
    try {
      setLoading(true);

      if (!property?.id) {
        alert("Property not found");
        return;
      }

      if (paymentMethod === "razorpay" || paymentMethod === "googlepay") {
        await payWithRazorpay();
        return;
      }

      if (paymentMethod === "paypal") {
        alert("PayPal is coming soon. Please use Razorpay or Cash.");
        return;
      }

      if (paymentMethod === "card") {
        alert("Card payments are handled through Razorpay. Please select Razorpay.");
        return;
      }

      await createBooking(paymentMethod);
    } catch (err) {
      console.log("Booking failed:", err);

      if (err.response?.status === 409) {
        alert("This property is already booked for these dates.");
        return;
      }

      alert(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = useMemo(
    () => [
      {
        id: "razorpay",
        name: "Razorpay",
        desc: "Cards, UPI, NetBanking, Wallets",
        logo: "R Pay",
        icon: <Wallet size={22} className="text-[#8363F5]" />,
      },
      {
        id: "googlepay",
        name: "Google Pay / UPI",
        desc: "Pay securely using UPI through Razorpay",
        logo: "G Pay",
        icon: <GooglePayIcon />,
      },
      {
        id: "card",
        name: "Credit or debit card",
        desc: "Use Razorpay for card payments",
        icon: <CreditCard size={22} />,
      },
      {
        id: "paypal",
        name: "PayPal",
        desc: "Coming soon",
        logo: "P",
        disabled: true,
      },
      {
        id: "cash",
        name: "Cash on place",
        desc: "Pay directly at the property during check-in",
        icon: <Banknote size={22} className="text-green-700" />,
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-8 flex items-center gap-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="text-3xl font-bold">Request to book</h1>
        </div>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 p-6 shadow-lg">
              <h2 className="mb-8 text-lg font-bold">
                1. Add a payment method
              </h2>

              <div className="divide-y">
                {paymentOptions.map((option) => (
                  <PaymentOption
                    key={option.id}
                    option={option}
                    active={paymentMethod === option.id}
                    onClick={() => {
                      if (!option.disabled) setPaymentMethod(option.id);
                    }}
                  />
                ))}
              </div>

              {paymentMethod === "card" && (
                <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  For production security, card details should not be collected
                  directly here. Select Razorpay to pay safely by card.
                </div>
              )}

              {paymentMethod === "googlepay" && (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  Google Pay / UPI will open securely through Razorpay checkout.
                </div>
              )}

              {paymentMethod === "cash" && (
                <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  You can pay directly at the property during check-in.
                </div>
              )}

              <div className="mt-8">
                <h2 className="mb-4 text-lg font-bold">
                  2. Apply coupon
                </h2>

                <div className="flex gap-3">
                  <input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                    disabled={Boolean(coupon)}
                    placeholder="WELCOME10"
                    className="h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 font-semibold uppercase outline-none focus:ring-2 focus:ring-[#8363F5] disabled:bg-gray-100"
                  />

                  {coupon ? (
                    <button
                      onClick={removeCoupon}
                      className="flex h-12 items-center gap-2 rounded-xl border border-red-300 px-5 font-semibold text-red-600 hover:bg-red-50"
                    >
                      <X size={17} />
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={validateCoupon}
                      disabled={couponLoading}
                      className="h-12 rounded-xl bg-[#8363F5] px-6 font-semibold text-white hover:bg-[#7152E8] disabled:opacity-60"
                    >
                      {couponLoading ? "Checking..." : "Apply"}
                    </button>
                  )}
                </div>

                {coupon && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    <CheckCircle size={18} />
                    Coupon {coupon.code} applied. You saved{" "}
                    {formatINR(coupon.discount)}.
                  </div>
                )}

                {couponError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                    {couponError}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleBooking}
                  disabled={loading}
                  className="h-12 rounded-xl bg-[#222] px-10 font-bold text-white transition hover:bg-black disabled:opacity-60"
                >
                  {loading
                    ? "Processing..."
                    : paymentMethod === "cash"
                    ? "Confirm Booking"
                    : "Confirm & Pay"}
                </button>
              </div>
            </div>

            <StepBox
              title="3. Message to the host"
              desc="You can message the host anytime after booking from Trips or Messages."
            />

            <StepBox
              title="4. Review your request"
              desc="Check dates, guests, payment method, and total before confirming."
            />
          </div>

          <aside>
            <div className="sticky top-8 rounded-3xl border border-gray-300 bg-white p-6 shadow-sm">
              <div className="flex gap-4">
                <img
                  src={
                    property?.image ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80"
                  }
                  alt={property?.title || "Stay"}
                  className="h-24 w-24 rounded-xl object-cover"
                />

                <div>
                  <h3 className="font-bold leading-snug">
                    {property?.title || "Selected stay"}
                  </h3>

                  <p className="mt-1 text-sm">
                    ★ {property?.rating || "4.98"} · Guest favorite
                  </p>
                </div>
              </div>

              <Divider />

              <InfoRow title="Dates" desc={`${checkin} – ${checkout}`} />

              <Divider />

              <InfoRow
                title="Guests"
                desc={`${guests} ${guests === 1 ? "guest" : "guests"}`}
              />

              <Divider />

              <div>
                <h4 className="mb-3 text-sm font-bold">Price details</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {nights} nights x {formatINR(price)}
                    </span>
                    <span>{formatINR(subtotal)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span>{formatINR(taxes)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Coupon discount</span>
                      <span>-{formatINR(discount)}</span>
                    </div>
                  )}
                </div>
              </div>

              <Divider />

              <div className="flex justify-between text-lg font-bold">
                <span>
                  Total <u>INR</u>
                </span>
                <span>{formatINR(total)}</span>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#F4F1FF] p-4">
                <ShieldCheck size={22} className="mt-0.5 text-[#8363F5]" />
                <p className="text-sm text-gray-600">
                  Your payment and booking information are protected.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-green-100 px-5 py-4">
              <Tag size={22} className="text-green-700" />
              <p className="text-sm font-medium">
                Price is below the 60-day average
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PaymentOption({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={option.disabled}
      className={`flex w-full items-center justify-between py-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "text-[#8363F5]" : "text-gray-900 hover:text-[#8363F5]"
      }`}
    >
      <div className="flex items-center gap-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white">
          {option.icon || (
            <span className="text-sm font-black text-blue-700">
              {option.logo}
            </span>
          )}
        </div>

        <div>
          <span className="font-semibold">{option.name}</span>
          <p className="mt-1 text-xs text-gray-500">{option.desc}</p>
        </div>
      </div>

      <Radio checked={active} />
    </button>
  );
}

function GooglePayIcon() {
  return (
    <div className="flex items-center gap-[1px] text-sm font-black">
      <span className="text-blue-600">G</span>
      <span className="text-red-500">P</span>
      <span className="text-yellow-500">a</span>
      <span className="text-green-600">y</span>
    </div>
  );
}

function Radio({ checked }) {
  return (
    <div
      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
        checked ? "border-[#8363F5]" : "border-gray-400"
      }`}
    >
      {checked && <div className="h-3 w-3 rounded-full bg-[#8363F5]" />}
    </div>
  );
}

function StepBox({ title, desc }) {
  return (
    <div className="rounded-3xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {desc && <p className="mt-2 text-sm text-gray-500">{desc}</p>}
    </div>
  );
}

function InfoRow({ title, desc }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold">{title}</h4>
        <p className="mt-2 text-sm">{desc}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 border-t border-gray-200" />;
}