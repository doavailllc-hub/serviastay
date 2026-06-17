import { Link } from "react-router-dom";
import axios from "axios";

export default function PropertyCard({ property }) {
  const addToWishlist = async (e) => {
    e.preventDefault();

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        alert("Please login first");
        return;
      }

      await axios.post("http://http://44.212.49.157:5000/api/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });

      alert("Added to wishlist ❤️");
    } catch (err) {
      console.log(err);
      alert("Already added or failed");
    }
  };

  return (
    <Link
      to={`/reserve/${property.id}`}
      className="block no-underline text-inherit"
    >
      <div className="group cursor-pointer">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-gray-100">
          <img
            src={property.image}
            alt={property.title}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
          />

          <button
            onClick={addToWishlist}
            className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md text-xl hover:scale-110 transition"
          >
            ♡
          </button>
        </div>

        <div className="pt-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[16px] font-semibold text-[#222] line-clamp-1">
              {property.title}
            </h3>

            <span className="text-sm font-medium whitespace-nowrap">
              ⭐ {property.rating}
            </span>
          </div>

          <p className="mt-1 text-sm text-[#717171] line-clamp-1">
            {property.location}
          </p>

          <p className="mt-2 text-[15px]">
            <span className="font-bold">
              ₹{Number(property.price).toLocaleString("en-IN")}
            </span>
            <span className="text-[#717171]"> / night</span>
          </p>
        </div>
      </div>
    </Link>
  );
}