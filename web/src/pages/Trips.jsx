import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function Trips() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) return;

      const res = await axios.get(
        `http://localhost:5000/api/bookings/${user.id}`
      );

      setTrips(res.data);
    } catch (err) {
      console.log("Trips load failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            My Trips
          </h1>

          <p className="text-gray-500 mt-2">
            View your upcoming and past reservations.
          </p>
        </div>

        {trips.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
            <h2 className="text-2xl font-bold">No trips yet</h2>
            <p className="text-gray-500 mt-2">
              Your bookings will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  <img
                    src={trip.image}
                    alt={trip.title}
                    className="w-full md:w-72 h-56 object-cover"
                  />

                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-2xl font-semibold">
                            {trip.title}
                          </h2>

                          <p className="text-gray-500 mt-1">
                            {trip.location}
                          </p>
                        </div>

                        <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                          {trip.status}
                        </span>
                      </div>

                      <div className="mt-6 space-y-2 text-gray-600">
                        <p>
                          📅 {trip.checkin} - {trip.checkout}
                        </p>

                        <p>
                          👥 {trip.guests} guest
                        </p>

                        <p>
                          💳 Payment:{" "}
                          <span className="font-medium">
                            {trip.payment_method}
                          </span>
                        </p>

                        <p>
                          Total Paid:{" "}
                          <span className="font-bold text-[#8363F5]">
                            ${trip.total}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-8">
                      <button className="px-6 py-3 rounded-xl bg-[#8363F5] text-white font-semibold hover:bg-[#7152E8] transition">
                        View Details
                      </button>

                      <button className="px-6 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition">
                        Download Receipt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}