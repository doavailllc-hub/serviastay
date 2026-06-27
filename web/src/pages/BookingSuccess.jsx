import { Link, useLocation } from "react-router-dom";

export default function BookingSuccess() {
  const location = useLocation();

  const property = location.state?.property;
  const guests = location.state?.guests || 1;
  const nights = location.state?.nights || 2;
  const total = location.state?.total || 0;
  const paymentMethod = location.state?.paymentMethod || "cash";
  const checkin = location.state?.checkin || "2026-06-12";
  const checkout = location.state?.checkout || "2026-06-14";

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
        <div className="w-24 h-24 mx-auto rounded-full bg-[#3b71e6]/10 flex items-center justify-center mb-6">
          <span className="text-5xl">🎉</span>
        </div>

        <h1 className="text-4xl font-bold text-gray-900">
          Booking Confirmed!
        </h1>

        <p className="mt-4 text-gray-500 leading-7">
          Your stay at{" "}
          <span className="font-semibold text-gray-800">
            {property?.title || "Selected Stay"}
          </span>{" "}
          has been successfully confirmed.
        </p>

        <div className="mt-8 bg-gray-50 rounded-2xl p-5 text-left">
          <InfoRow label="Property" value={property?.title || "Selected Stay"} />
          <InfoRow label="Dates" value={`${checkin} - ${checkout}`} />
          <InfoRow
            label="Guests"
            value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`}
          />
          <InfoRow label="Nights" value={nights} />
          <InfoRow label="Payment" value={paymentMethod} capitalize />

          <div className="flex justify-between py-2 border-t mt-2 pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-[#3b71e6]">
              {formatINR(total)}
            </span>
          </div>
        </div>

        <Link to="/trips">
          <button className="w-full mt-8 h-14 rounded-xl bg-[#3b71e6] hover:bg-[#7152E8] text-white font-semibold text-lg transition shadow-lg">
            View My Trips
          </button>
        </Link>

        <Link
          to="/home"
          className="block mt-5 text-[#3b71e6] font-medium hover:underline"
        >
          Continue Exploring
        </Link>
      </div>
    </div>
  );
}

function InfoRow({ label, value, capitalize }) {
  return (
    <div className="flex justify-between py-2 gap-4">
      <span className="text-gray-500">{label}</span>
      <span
        className={`font-medium text-right ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}