import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function Wishlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
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
    }
  };

  const removeWishlist = async (id) => {
    try {
      await api.delete(`/wishlist/${id}`);
      loadWishlist();
    } catch (err) {
      console.log("Remove wishlist failed:", err);
      alert("Failed to remove wishlist item");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold">Wishlists ❤️</h1>

          <p className="text-gray-500 mt-2">
            Homes you've saved.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-2xl font-bold">No saved homes yet</h2>
            <p className="text-gray-500 mt-2">
              Tap the heart icon on any property to save it here.
            </p>

            <button
              onClick={() => navigate("/home")}
              className="mt-6 px-6 py-3 rounded-xl bg-[#8363F5] text-white font-semibold hover:bg-[#7152E8]"
            >
              Explore homes
            </button>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition"
              >
                <div className="relative">
                  <img
                    src={
                      item.image ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={item.title}
                    className="w-full h-64 object-cover"
                  />

                  <button
                    onClick={() => removeWishlist(item.id)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow hover:scale-110 transition"
                  >
                    ❤️
                  </button>
                </div>

                <div className="p-6">
                  <div className="flex justify-between gap-4">
                    <h2 className="text-xl font-bold line-clamp-1">
                      {item.title}
                    </h2>

                    <span className="whitespace-nowrap">
                      ⭐ {item.rating}
                    </span>
                  </div>

                  <p className="text-gray-500 mt-2 line-clamp-1">
                    {item.location}
                  </p>

                  <p className="mt-4 font-bold text-[#8363F5]">
                    ₹{Number(item.price || 0).toLocaleString("en-IN")} / night
                  </p>

                  <button
                    onClick={() => navigate(`/reserve/${item.id}`)}
                    className="w-full mt-6 h-12 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold transition"
                  >
                    View Property
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