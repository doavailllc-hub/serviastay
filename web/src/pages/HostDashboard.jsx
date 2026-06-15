import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function HostDashboard() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadDashboard = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const listingsRes = await api.get(`/my-properties/${user.id}`);
      const bookingsRes = await api.get(`/bookings/${user.id}`);

      setListings(listingsRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (err) {
      console.log("Dashboard load failed:", err);

      localStorage.removeItem("user");
      localStorage.removeItem("token");

      navigate("/");
    }
  };

  const confirmedBookings = bookings.filter(
    (item) => item.status !== "Cancelled"
  );

  const totalEarnings = confirmedBookings.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Host Dashboard
            </h1>

            <p className="text-gray-500 mt-2">
              Manage your listings, bookings and earnings.
            </p>
          </div>

          <button
            onClick={() => navigate("/become-a-host")}
            className="mt-5 md:mt-0 px-6 py-3 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold shadow-lg transition"
          >
            + Add Listing
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            title="Total Earnings"
            value={formatINR(totalEarnings)}
            subtitle="Total confirmed revenue"
            highlight
          />

          <StatCard
            title="Active Listings"
            value={listings.length}
            subtitle="Properties you host"
          />

          <StatCard
            title="Bookings"
            value={bookings.length}
            subtitle="Guest reservations"
          />
        </div>

        <div className="mt-10 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Your Listings</h2>

            <button
              onClick={() => navigate("/host-listings")}
              className="text-[#8363F5] font-semibold hover:underline"
            >
              View all
            </button>
          </div>

          {listings.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-xl font-bold">No listings yet</h3>
              <p className="text-gray-500 mt-2">
                Add your first property to start hosting.
              </p>

              <button
                onClick={() => navigate("/become-a-host")}
                className="mt-5 px-6 py-3 rounded-xl bg-[#8363F5] text-white font-semibold"
              >
                Add Listing
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {listings.slice(0, 3).map((listing) => (
                <div
                  key={listing.id}
                  className="flex flex-col md:flex-row justify-between items-center gap-5 p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        listing.image ||
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                      }
                      alt={listing.title}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />

                    <div>
                      <h3 className="font-semibold text-lg">
                        {listing.title}
                      </h3>

                      <p className="text-gray-500 mt-1">
                        📍 {listing.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-4 md:mt-0">
                    <span className="font-bold text-[#8363F5]">
                      {formatINR(listing.price)} / night
                    </span>

                    <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                      Active
                    </span>

                    <button
                      onClick={() => navigate(`/edit-listing/${listing.id}`)}
                      className="px-5 py-2 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      <div className="mt-10 grid gap-6 md:grid-cols-5">
  <QuickAction
    icon="🏠"
    title="Listings"
    desc="Manage properties"
    onClick={() => navigate("/host-listings")}
  />

  <QuickAction
    icon="📋"
    title="Reservations"
    desc="Manage bookings"
    onClick={() => navigate("/host-reservations")}
  />

  <QuickAction
    icon="📅"
    title="Calendar"
    desc="Manage availability"
    onClick={() => navigate("/host-calendar")}
  />

  <QuickAction
    icon="💰"
    title="Earnings"
    desc="View payouts"
    onClick={() => navigate("/earnings")}
  />

 <QuickAction
  icon="⭐"
  title="Reviews"
  desc="Guest feedback"
  onClick={() => navigate("/host-reviews")}
/>
</div>

        <div className="mt-10 rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] p-8 text-white shadow-xl">
          <h2 className="text-2xl font-bold">
            You're doing great! 🎉
          </h2>

          <p className="mt-3 text-white/90 max-w-2xl">
            Keep your listings updated with quality photos, competitive pricing,
            and quick responses to maximize your bookings and earnings.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, highlight }) {
  return (
    <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
      <p className="text-gray-500">{title}</p>

      <h2
        className={`text-4xl font-bold mt-3 ${
          highlight ? "text-[#8363F5]" : "text-gray-900"
        }`}
      >
        {value}
      </h2>

      <p className="text-gray-500 mt-4">{subtitle}</p>
    </div>
  );
}

function QuickAction({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition text-left"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-gray-500 text-sm mt-2">{desc}</p>
    </button>
  );
}