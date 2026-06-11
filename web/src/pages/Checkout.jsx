import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CreditCard,
  ChevronDown,
  Tag,
  Banknote,
} from "lucide-react";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [paymentMethod, setPaymentMethod] = useState("card");

  const property = location.state?.property;
  const guests = location.state?.guests || 1;
  const nights = location.state?.nights || 2;

  const price = Number(property?.price || 220);
  const subtotal = price * nights;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;

  const handleBooking = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        alert("Please login first");
        navigate("/");
        return;
      }

      await axios.post("http://localhost:5000/api/bookings", {
        property_id: property?.id,
        user_id: user.id,
        checkin: "2026-06-12",
        checkout: "2026-06-14",
        guests,
        total,
        payment_method: paymentMethod,
      });

      navigate("/booking-success", {
        state: {
          property,
          guests,
          nights,
          total,
          paymentMethod,
        },
      });
    } catch (err) {
      console.log(err);
      alert("Booking failed");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-5 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="text-3xl font-bold">Request to book</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-16">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 shadow-lg p-6">
              <h2 className="text-lg font-bold mb-8">
                1. Add a payment method
              </h2>

              <div
                onClick={() => setPaymentMethod("card")}
                className="flex items-center justify-between mb-5 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <CreditCard size={22} />

                  <div>
                    <p className="font-medium">Credit or debit card</p>

                    <div className="flex gap-1 mt-1 text-[10px] font-bold items-center">
                      <span className="text-blue-700">VISA</span>
                      <span className="text-red-500">●</span>
                      <span className="text-blue-900">AMEX</span>
                      <span className="text-orange-500">DISCOVER</span>
                      <span className="bg-blue-700 text-white px-1 rounded">
                        MC
                      </span>
                    </div>
                  </div>
                </div>

                <Radio checked={paymentMethod === "card"} />
              </div>

              {paymentMethod === "card" && (
                <>
                  <div className="rounded-xl border border-gray-400 overflow-hidden">
                    <input
                      placeholder="Card number"
                      className="w-full h-14 px-4 border-b border-gray-400 outline-none"
                    />

                    <div className="grid grid-cols-2">
                      <input
                        placeholder="Expiration"
                        className="h-14 px-4 border-r border-gray-400 outline-none"
                      />

                      <input
                        placeholder="CVV"
                        className="h-14 px-4 outline-none"
                      />
                    </div>
                  </div>

                  <input
                    placeholder="ZIP code"
                    className="w-full h-14 px-4 mt-3 rounded-xl border border-gray-400 outline-none"
                  />

                  <div className="mt-3 rounded-xl border border-gray-400 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Country/region</p>
                      <p>Saudi Arabia</p>
                    </div>

                    <ChevronDown size={20} />
                  </div>
                </>
              )}

              <div className="mt-5 border-t">
                <PaymentOption
                  name="PayPal"
                  logo="P"
                  active={paymentMethod === "paypal"}
                  onClick={() => setPaymentMethod("paypal")}
                />

                <PaymentOption
                  name="Google Pay"
                  logo="G Pay"
                  active={paymentMethod === "googlepay"}
                  onClick={() => setPaymentMethod("googlepay")}
                />

                <PaymentOption
                  name="Cash on place"
                  icon={<Banknote size={22} className="text-green-700" />}
                  active={paymentMethod === "cash"}
                  onClick={() => setPaymentMethod("cash")}
                />
              </div>

              {paymentMethod === "cash" && (
                <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                  You can pay directly at the property during check-in.
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleBooking}
                  className="px-10 h-12 rounded-xl bg-[#222] text-white font-bold hover:bg-black transition"
                >
                  Next
                </button>
              </div>
            </div>

            <StepBox title="2. Write a message to the host" />
            <StepBox title="3. Review your request" />
          </div>

          <div>
            <div className="sticky top-8 rounded-3xl border border-gray-300 p-6 bg-white">
              <div className="flex gap-4">
                <img
                  src={
                    property?.image ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80"
                  }
                  alt={property?.title || "Luxury apartment"}
                  className="w-24 h-24 rounded-xl object-cover"
                />

                <div>
                  <h3 className="font-bold leading-snug">
                    {property?.title ||
                      "Luxury aparthotel near Riyadh season events"}
                  </h3>

                  <p className="text-sm mt-1">
                    ★ {property?.rating || "4.98"} · Guest favorite
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-bold text-sm">Free cancellation</h4>
                <p className="text-sm mt-1">
                  Cancel before 4:00PM on June 11 for a full refund.
                </p>
                <button className="text-sm font-semibold underline">
                  Full policy
                </button>
              </div>

              <Divider />

              <InfoRow title="Dates" desc="Jun 12 – 14, 2026" button="Change" />

              <Divider />

              <InfoRow
                title="Guests"
                desc={`${guests} ${guests === 1 ? "adult" : "adults"}`}
                button="Change"
              />

              <Divider />

              <div>
                <h4 className="font-bold text-sm mb-3">Price details</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {nights} nights x ${price}
                    </span>
                    <span>${subtotal}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span>${taxes}</span>
                  </div>
                </div>
              </div>

              <Divider />

              <div className="flex justify-between font-bold">
                <span>
                  Total <u>USD</u>
                </span>
                <span>${total}</span>
              </div>

              <button className="mt-2 text-sm font-semibold underline">
                Price breakdown
              </button>
            </div>

            <div className="mt-6 rounded-xl bg-green-100 px-5 py-4 flex items-center gap-3">
              <Tag size={22} className="text-green-700" />
              <p className="text-sm font-medium">
                Price is below the 60-day average
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PaymentOption({ name, logo, icon, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-5 border-b cursor-pointer"
    >
      <div className="flex items-center gap-5">
        {icon ? (
          icon
        ) : (
          <span className="font-bold text-blue-700 w-10">{logo}</span>
        )}

        <span>{name}</span>
      </div>

      <Radio checked={active} />
    </div>
  );
}

function Radio({ checked }) {
  return (
    <div
      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
        checked ? "border-[#222]" : "border-gray-400"
      }`}
    >
      {checked && <div className="w-3 h-3 rounded-full bg-[#222]" />}
    </div>
  );
}

function StepBox({ title }) {
  return (
    <div className="rounded-3xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

function InfoRow({ title, desc, button }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-sm mt-2">{desc}</p>
      </div>

      <button className="px-4 py-2 rounded-lg bg-gray-100 text-xs font-bold hover:bg-gray-200">
        {button}
      </button>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-200 my-5" />;
}