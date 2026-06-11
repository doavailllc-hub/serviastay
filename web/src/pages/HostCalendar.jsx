import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function HostCalendar() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) return;

      const res = await axios.get(
        `http://localhost:5000/api/bookings/${user.id}`
      );

      setBookings(res.data);
    } catch (err) {
      console.log("Calendar load failed:", err);
    }
  };

  const bookedCount = bookings.length;
  const availableCount = Math.max(30 - bookedCount, 0);

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Calendar
          </h1>

          <p className="text-gray-500 mt-2">
            Manage your property's availability and booked dates.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <Stat title="Available Days" value={availableCount} color="text-[#8363F5]" />
          <Stat title="Booked Days" value={bookedCount} color="text-green-600" />
          <Stat title="Blocked Days" value="0" color="text-red-500" />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold">
              Booked Reservations
            </h2>

            <button className="px-5 py-2 rounded-xl bg-[#8363F5] text-white hover:bg-[#7152E8] transition">
              Block Dates
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-bold">No bookings yet</h3>
              <p className="text-gray-500 mt-2">
                Your booking dates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5 hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {booking.title}
                      </h3>

                      <p className="text-gray-500 mt-1">
                        📅 {booking.checkin} - {booking.checkout}
                      </p>

                      <p className="text-gray-500 mt-1">
                        👥 {booking.guests} guests · 💳 {booking.payment_method}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="px-4 py-2 rounded-full bg-[#F4F1FF] text-[#8363F5] text-sm font-semibold">
                        {booking.status}
                      </span>

                      <span className="font-bold text-[#8363F5]">
                        ${booking.total}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-6 text-sm">
          <Legend color="bg-green-500" text="Booked" />
          <Legend color="bg-[#8363F5]" text="Available" />
          <Legend color="bg-red-500" text="Blocked" />
        </div>
      </main>
    </div>
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