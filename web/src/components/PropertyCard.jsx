import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import api from "../api/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80";

function getImageUrl(property) {
  const image =
    property?.image ||
    property?.image_url ||
    property?.cover_image ||
    property?.thumbnail ||
    "";

  if (!image) return FALLBACK_IMAGE;
  if (image.startsWith("https://")) return image;

  if (image.startsWith("http://44.212.49.157:5000")) {
    return image.replace("http://44.212.49.157:5000", "https://stay.dovail.com");
  }

  if (image.startsWith("https://44.212.49.157:5000")) {
    return image.replace("https://44.212.49.157:5000", "https://stay.dovail.com");
  }

  if (image.startsWith("/uploads/")) return `https://stay.dovail.com${image}`;
  if (image.startsWith("uploads/")) return `https://stay.dovail.com/${image}`;

  return image;
}

export default function PropertyCard({ property }) {
  const imageUrl = getImageUrl(property);

  const addToWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const user =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");

      if (!user) {
        alert("Please login first");
        return;
      }

      await api.post("/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });

      alert("Added to wishlist");
    } catch (err) {
      alert(err?.response?.data?.message || "Already added or failed");
    }
  };

  return (
    <Link
      to={`/reserve/${property.id}`}
      className="group block no-underline text-inherit"
    >
      <article className="w-full">
        <div className="relative aspect-square overflow-hidden rounded-[22px] bg-gray-100">
          <img
            src={imageUrl}
            alt={property.title || "Stay"}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />

          <button
            type="button"
            onClick={addToWishlist}
            aria-label="Add to wishlist"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-sm transition hover:scale-105"
          >
            <Heart size={19} strokeWidth={2.1} />
          </button>
        </div>

        <div className="pt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-[15.5px] font-semibold leading-5 text-[#222222]">
              {property.title || "Untitled stay"}
            </h3>

           <div className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#222222]">
  <Star
    size={10}
    color="#717171"
    fill="#717171"
    strokeWidth={0}
  />
  <span>{property.rating || "5.0"}</span>
</div>
          </div>

          <p className="mt-1 line-clamp-1 text-[14px] font-normal leading-5 text-[#717171]">
            {property.location || "Location not specified"}
          </p>

          <p className="mt-2 text-[15px] leading-5 text-[#717171]">
            <span className="font-semibold text-[#222222]">
              ₹{Number(property.price || 0).toLocaleString("en-IN")}
            </span>{" "}
            / night
          </p>
        </div>
      </article>
    </Link>
  );
}