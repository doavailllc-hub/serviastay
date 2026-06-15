import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function HostCalendar() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadBookings();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadBookings = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/bookings/${user.id}`);
      setBookings(res.data || []);
    } catch (err) {
      console.log("Calendar load failed:", err);

      localStorage.removeItem("user");
      localStorage.removeItem("token");

      navigate("/");
    }
  };

  const confirmedBookings = bookings.filter(
    (booking) => booking.status !== "Cancelled"
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "Cancelled"
  );

  const bookedCount = confirmedBookings.length;
  const cancelledCount = cancelledBookings.length;
  const availableCount = Math.max(30 - bookedCount, 0);

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">Calendar</h1>

          <p className="text-gray-500 mt-2">
            Manage your property's availability and booked dates.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-10">
          <Stat
            title="Available Days"
            value={availableCount}
            color="text-[#8363F5]"
          />

          <Stat
            title="Booked Dates"
            value={bookedCount}
            color="text-green-600"
          />

          <Stat
            title="Cancelled"
            value={cancelledCount}
            color="text-red-500"
          />

          <Stat
            title="Monthly Window"
            value="30"
            color="text-gray-900"
          />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-semibold">
                Booked Reservations
              </h2>

              <p className="text-gray-500 mt-1">
                Confirmed and cancelled reservations for your listings.
              </p>
            </div>

            <button
              onClick={() => navigate("/host-listings")}
              className="px-5 py-2 rounded-xl bg-[#8363F5] text-white hover:bg-[#7152E8] transition"
            >
              Manage Listings
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-6xl mb-4">📅</div>

              <h3 className="text-xl font-bold">
                No bookings yet
              </h3>

              <p className="text-gray-500 mt-2">
                Guest booking dates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5 hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex gap-4">
                      <img
                        src={
                          booking.image ||
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                        }
                        alt={booking.title}
                        className="w-20 h-20 rounded-2xl object-cover"
                      />

                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {booking.title || "Property booking"}
                        </h3>

                        <p className="text-gray-500 mt-1">
                          📅 {booking.checkin} - {booking.checkout}
                        </p>

                        <p className="text-gray-500 mt-1">
                          👥 {booking.guests}{" "}
                          {booking.guests > 1 ? "guests" : "guest"} · 💳{" "}
                          {booking.payment_method || "cash"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <StatusBadge status={booking.status} />

                      <span className="font-bold text-[#8363F5]">
                        {formatINR(booking.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-6 text-sm">
          <Legend color="bg-green-500" text="Confirmed / Booked" />
          <Legend color="bg-red-500" text="Cancelled" />
          <Legend color="bg-[#8363F5]" text="Available" />
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = status || "Confirmed";

  const style =
    value === "Cancelled"
      ? "bg-red-100 text-red-600"
      : value === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  return (
    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${style}`}>
      {value}
    </span>
  );
}

function Stat({ title, value, color }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className={`text-4xl font-bold mt-2 ${color}`}>{value}</h2>
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full ${color}`}></div>
      <span>{text}</span>
    </div>
  );
}