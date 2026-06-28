import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Trash2 } from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

export default function HostListings() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadListings();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadListings = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "null");
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
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Your listings
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Manage the homes you host and keep your property details updated.
            </p>
          </div>

          <button
            onClick={() => navigate("/become-a-host")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            <Plus size={17} />
            Add listing
          </button>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState navigate={navigate} />
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:bg-gray-50"
              >
                <div className="flex flex-col md:flex-row">
                  <img
                    src={
                      listing.image ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={listing.title || "Listing"}
                    className="h-56 w-full object-cover md:h-auto md:w-64"
                  />

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                            {listing.title || "Untitled listing"}
                          </h2>

                          <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                            <MapPin size={15} />
                            {listing.location || "Location unavailable"}
                          </p>

                          <p className="mt-2 text-sm text-gray-500">
                            {listing.guests || 1} guests ·{" "}
                            {listing.bedrooms || 1} bedroom ·{" "}
                            {listing.bathrooms || 1} bath
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          Active
                        </span>
                      </div>

                      <p className="mt-5 text-lg font-semibold text-gray-950">
                        {formatINR(listing.price)}{" "}
                        <span className="text-sm font-normal text-gray-500">
                          / night
                        </span>
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate(`/edit-listing/${listing.id}`)}
                        className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => navigate(`/reserve/${listing.id}`)}
                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
                      >
                        View
                      </button>

                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && listings.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-semibold text-gray-950">
              Hosting tip
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Keep photos, pricing and descriptions accurate to improve guest
              trust and booking quality.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function EmptyState({ navigate }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
          No listings yet
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
          Add your first property and start hosting.
        </p>

        <button
          onClick={() => navigate("/become-a-host")}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
        >
          <Plus size={17} />
          Add listing
        </button>
      </div>
    </div>
  );
}