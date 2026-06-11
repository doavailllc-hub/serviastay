import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("about");
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const menuItems = [
    { id: "about", label: "About me", icon: "👤" },
    { id: "trips", label: "Past trips", icon: "🧳" },
    { id: "connections", label: "Connections", icon: "👥" },
    { id: "reviews", label: "Reviews", icon: "⭐" },
    { id: "wishlist", label: "Wishlist", icon: "❤️" },
  ];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      navigate("/");
      return;
    }

    setUser(storedUser);
    loadTrips(storedUser.id);
    loadWishlist(storedUser.id);
  }, []);

  const loadTrips = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/bookings/${userId}`);
      setTrips(res.data);
    } catch (err) {
      console.log("Trips load failed:", err);
    }
  };

  const loadWishlist = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/wishlist/${userId}`);
      setWishlist(res.data);
    } catch (err) {
      console.log("Wishlist load failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <aside className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-fit">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Profile
            </h1>

            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left font-semibold transition ${
                    tab === item.id
                      ? "bg-[#8363F5] text-white shadow-md"
                      : "text-gray-700 hover:bg-[#F4F1FF]"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 min-h-[500px]">
            {tab === "about" && (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  About me
                </h2>

                <div className="max-w-md rounded-3xl border border-gray-100 shadow-lg p-8 text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-[#8363F5] text-white flex items-center justify-center text-4xl font-bold mb-5">
                    {user?.fullname?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900">
                    {user?.fullname || "Guest User"}
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {user?.email}
                  </p>

                  <p className="text-sm text-[#8363F5] font-semibold mt-3 capitalize">
                    {user?.role || "guest"}
                  </p>

                  <button className="w-full mt-6 h-12 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold transition">
                    Edit profile
                  </button>
                </div>
              </>
            )}

            {tab === "trips" && (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Past trips
                </h2>

                {trips.length === 0 ? (
                  <Empty icon="🧳" text="No trips yet." />
                ) : (
                  <div className="space-y-4">
                    {trips.map((trip) => (
                      <div
                        key={trip.id}
                        className="rounded-2xl border border-gray-100 p-5 hover:shadow-md transition"
                      >
                        <h3 className="font-semibold text-lg">
                          {trip.title}
                        </h3>

                        <p className="text-gray-500 mt-1">
                          {trip.checkin} to {trip.checkout}
                        </p>

                        <p className="text-[#8363F5] font-bold mt-2">
                          ${trip.total}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "connections" && (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Connections
                </h2>

                <Empty icon="👥" text="No connections yet." />
              </>
            )}

            {tab === "reviews" && (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Reviews
                </h2>

                <Empty icon="⭐" text="No reviews yet." />
              </>
            )}

            {tab === "wishlist" && (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Wishlist
                </h2>

                {wishlist.length === 0 ? (
                  <Empty icon="❤️" text="No saved homes yet." />
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {wishlist.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-44 w-full object-cover"
                        />

                        <div className="p-4">
                          <h3 className="font-bold">
                            {item.title}
                          </h3>

                          <p className="text-gray-500 text-sm mt-1">
                            {item.location}
                          </p>

                          <button
                            onClick={() => navigate(`/reserve/${item.id}`)}
                            className="mt-4 w-full h-11 rounded-xl bg-[#8363F5] text-white font-semibold"
                          >
                            View Property
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">{icon}</div>
      <p className="text-gray-500">{text}</p>
    </div>
  );
}