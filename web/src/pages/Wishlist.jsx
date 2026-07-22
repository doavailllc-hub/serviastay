import { useEffect, useState } from "react";
import { Heart, Star, MapPin, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import api from "../api/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

export default function Wishlist() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadWishlist = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/wishlist/${user.id}`);
      setItems(res.data || []);
    } catch (err) {
      console.log("Wishlist load failed:", err);

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      navigate("/");
    } finally {
      setLoading(false);
    }
  };

const removeWishlist = async (wishlistId) => {
  try {
    setRemovingId(wishlistId);

    await api.delete(`/wishlist/${wishlistId}`);

    setItems((prev) =>
      prev.filter(
        (item) => Number(item.wishlist_id) !== Number(wishlistId)
      )
    );
  } catch (err) {
    console.log("Remove wishlist failed:", err);
    window.alert(
      err.response?.data?.message || "Failed to remove wishlist item"
    );
  } finally {
    setRemovingId(null);
  }
};
  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-24 md:px-8">
        <section className="mb-8 flex flex-col gap-3 border-b border-gray-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Wishlists
            </h1>
            <p className="mt-2 text-sm text-gray-500 md:text-base">
              Homes you have saved for your next stay.
            </p>
          </div>

          {!loading && items.length > 0 && (
            <p className="text-sm font-medium text-gray-500">
              {items.length} saved {items.length === 1 ? "home" : "homes"}
            </p>
          )}
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm font-medium">Loading wishlists...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <EmptyWishlist navigate={navigate} />
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/reserve/${item.id}`)}
              >
                <div className="relative overflow-hidden rounded-3xl bg-gray-100">
                  <img
                    src={item.image || FALLBACK_IMAGE}
                    alt={item.title || "Saved property"}
                    className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                    removeWishlist(item.wishlist_id);
                    }}
               removingId === item.wishlist_id
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#3b71e6] shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {removingId === item.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Heart size={20} fill="currentColor" />
                    )}
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-1 text-[15px] font-semibold text-gray-950">
                      {item.title || "Beautiful stay"}
                    </h2>

                    <div className="flex shrink-0 items-center gap-1 text-sm font-medium">
                      <Star size={14} fill="currentColor" />
                      <span>{item.rating || "New"}</span>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={14} />
                    <p className="line-clamp-1">
                      {item.location || "Location unavailable"}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Saved to your wishlist
                  </p>

                  <p className="mt-2 text-[15px]">
                    <span className="font-bold">
                      {formatINR(item.price)}
                    </span>{" "}
                    <span className="text-gray-500">night</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyWishlist({ navigate }) {
  return (
    <div className="mx-auto flex min-h-[480px] max-w-xl items-center justify-center text-center">
      <div>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F4F0FF] text-[#3b71e6]">
          <Heart size={34} />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-950">
          Create your first wishlist
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
          Save homes you love and come back to them anytime when planning your
          next trip.
        </p>

        <button
          onClick={() => navigate("/home")}
          className="mt-7 rounded-full bg-[#3b71e6] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#6F42EA]"
        >
          Start exploring
        </button>
      </div>
    </div>
  );
}