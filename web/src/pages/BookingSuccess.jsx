import { Link, useLocation } from "react-router-dom";

export default function BookingSuccess() {
  const location = useLocation();

  const property = location.state?.property;
  const guests = location.state?.guests || 1;
  const nights = location.state?.nights || 2;
  const total = location.state?.total || 0;
  const paymentMethod = location.state?.paymentMethod || "card";

  return (
    <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
        <div className="w-24 h-24 mx-auto rounded-full bg-[#8363F5]/10 flex items-center justify-center mb-6">
          <span className="text-5xl">🎉</span>
        </div>

        <h1 className="text-4xl font-bold text-gray-900">
          Booking Confirmed!
        </h1>

        <p className="mt-4 text-gray-500 leading-7">
          Your stay at{" "}
          <span className="font-semibold text-gray-800">
            {property?.title || "Luxury Beach Villa"}
          </span>{" "}
          has been successfully confirmed.
        </p>

        <div className="mt-8 bg-gray-50 rounded-2xl p-5 text-left">
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Property</span>
            <span className="font-medium text-right">
              {property?.title || "Luxury Beach Villa"}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-gray-500">Dates</span>
            <span className="font-medium">
              Jun 12 - Jun 14
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-gray-500">Guests</span>
            <span className="font-medium">
              {guests} {guests === 1 ? "Guest" : "Guests"}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-gray-500">Nights</span>
            <span className="font-medium">
              {nights}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-gray-500">Payment</span>
            <span className="font-medium capitalize">
              {paymentMethod}
            </span>
          </div>

          <div className="flex justify-between py-2 border-t mt-2 pt-4">
            <span className="font-semibold">
              Total
            </span>
            <span className="font-bold text-[#8363F5]">
              ${total}
            </span>
          </div>
        </div>

        <Link to="/trips">
          <button className="w-full mt-8 h-14 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold text-lg transition shadow-lg">
            View My Trips
          </button>
        </Link>

        <Link
          to="/home"
          className="block mt-5 text-[#8363F5] font-medium hover:underline"
        >
          Continue Exploring
        </Link>
      </div>
    </div>
  );
}