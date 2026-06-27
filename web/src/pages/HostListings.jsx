import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function HostListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    loadListings();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadListings = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/my-properties/${user.id}`);
      setListings(res.data || []);
    } catch (err) {
      console.log("Listings load failed:", err);

      localStorage.removeItem("user");
      localStorage.removeItem("token");

      navigate("/");
    }
  };

  const deleteListing = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/properties/${id}`);
      loadListings();
    } catch (err) {
      console.log("Delete failed:", err);
      alert("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Your Listings
            </h1>

            <p className="text-gray-500 mt-2">
              Manage and monitor the homes you host.
            </p>
          </div>

          <button
            onClick={() => navigate("/become-a-host")}
            className="mt-5 md:mt-0 px-6 py-3 rounded-xl bg-[#3b71e6] hover:bg-[#7152E8] text-white font-semibold transition shadow-lg"
          >
            + Add New Listing
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              No listings yet
            </h2>

            <p className="text-gray-500 mt-2">
              Add your first property and start hosting.
            </p>

            <button
              onClick={() => navigate("/become-a-host")}
              className="mt-6 px-6 py-3 rounded-xl bg-[#3b71e6] text-white font-semibold"
            >
              Add Listing
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row">
                  <img
                    src={
                      listing.image ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={listing.title}
                    className="w-full lg:w-72 h-56 object-cover"
                  />

                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            {listing.title}
                          </h2>

                          <p className="text-gray-500 mt-2">
                            📍 {listing.location}
                          </p>

                          <p className="text-gray-500 mt-2">
                            {listing.guests} guests · {listing.bedrooms} bedroom ·{" "}
                            {listing.bathrooms} bath
                          </p>
                        </div>

                        <span className="px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                          Active
                        </span>
                      </div>

                      <div className="mt-6">
                        <span className="text-2xl font-bold text-[#3b71e6]">
                          {formatINR(listing.price)} / night
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-8">
                      <button
                        onClick={() => navigate(`/edit-listing/${listing.id}`)}
                        className="px-5 py-3 rounded-xl bg-[#3b71e6] text-white font-semibold hover:bg-[#7152E8] transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => navigate(`/reserve/${listing.id}`)}
                        className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition"
                      >
                        View
                      </button>

                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="px-5 py-3 rounded-xl border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-3xl bg-gradient-to-r from-[#3b71e6] to-[#6D4EEB] p-8 text-white shadow-xl">
          <h2 className="text-2xl font-bold">
            You're doing great! 🎉
          </h2>

          <p className="mt-3 text-white/90 max-w-2xl">
            Keep your listings updated with attractive photos, accurate pricing,
            and detailed descriptions to increase bookings and earnings.
          </p>
        </div>
      </main>
    </div>
  );
}