import { useState } from "react";
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
  const [liked, setLiked] = useState(false);

  const addToWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setLiked(true);

    try {
      const user =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");

      if (!user) {
        setLiked(false);
        return;
      }

      await api.post("/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });
    } catch (err) {
      setLiked(true);
    }
  };

  return (
    <Link
      to={`/reserve/${property.id}`}
      className="group block text-inherit no-underline"
    >
      <article className="w-full">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
          <img
            src={imageUrl}
            alt={property.title || "Stay"}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
          />

          <button
            type="button"
            onClick={addToWishlist}
            aria-label="Add to wishlist"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 transition hover:bg-white"
          >
            <Heart
              size={18}
              strokeWidth={2}
              className={liked ? "text-red-500" : "text-gray-700"}
              fill={liked ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="pt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-sm font-semibold leading-5 text-gray-950">
              {property.title || "Untitled stay"}
            </h3>

            <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-700">
              <Star size={11} fill="currentColor" strokeWidth={0} />
              <span>{property.rating || "5.0"}</span>
            </div>
          </div>

          <p className="mt-1 line-clamp-1 text-sm leading-5 text-gray-500">
            {property.location || "Location not specified"}
          </p>

          <p className="mt-2 text-sm leading-5 text-gray-500">
            <span className="font-semibold text-gray-950">
              ₹{Number(property.price || 0).toLocaleString("en-IN")}
            </span>{" "}
            / night
          </p>
        </div>
      </article>
    </Link>
  );
}