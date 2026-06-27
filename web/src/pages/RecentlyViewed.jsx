import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Star, Trash2 } from "lucide-react";

import Navbar from "../components/Navbar";

export default function RecentlyViewed() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = () => {
    const saved =
      JSON.parse(localStorage.getItem("recentlyViewedProperties")) || [];

    setItems(saved);
  };

  const clearAll = () => {
    const confirmClear = window.confirm(
      "Clear all recently viewed properties?"
    );

    if (!confirmClear) return;

    localStorage.removeItem("recentlyViewedProperties");
    setItems([]);
  };

  const removeItem = (id) => {
    const updated = items.filter((item) => Number(item.id) !== Number(id));
    localStorage.setItem("recentlyViewedProperties", JSON.stringify(updated));
    setItems(updated);
  };

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Recently Viewed
            </h1>

            <p className="mt-2 text-gray-500">
              Homes and stays you opened recently.
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={18} />
              Clear All
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-14 text-center">
            <div className="mb-4 text-6xl">🏡</div>

            <h2 className="text-2xl font-bold text-gray-900">
              No recently viewed properties
            </h2>

            <p className="mt-2 text-gray-500">
              Properties you view will appear here.
            </p>

            <button
              onClick={() => navigate("/home")}
              className="mt-6 rounded-xl bg-[3b71e6] px-6 py-3 font-semibold text-white hover:bg-[#7152E8]"
            >
              Explore stays
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg"
              >
                <div className="relative">
                  <img
                    src={
                      item.image ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={item.title}
                    className="h-60 w-full object-cover"
                  />

                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="line-clamp-2 text-lg font-bold text-gray-900">
                      {item.title || "Property"}
                    </h3>

                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Star size={15} fill="black" />
                      {item.rating || "5.0"}
                    </span>
                  </div>

                  <p className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={15} />
                    {item.location || "Location unavailable"}
                  </p>

                  <p className="mt-3 text-sm text-gray-500">
                    {item.guests || 1} guests · {item.bedrooms || 1} bedroom ·{" "}
                    {item.bathrooms || 1} bath
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="font-bold text-gray-900">
                      {formatINR(item.price)}{" "}
                      <span className="font-normal text-gray-500">
                        / night
                      </span>
                    </p>

                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={14} />
                      Recently
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/reserve/${item.id}`)}
                    className="mt-5 h-12 w-full rounded-xl bg-[3b71e6] font-semibold text-white hover:bg-[#7152E8]"
                  >
                    View Again
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}