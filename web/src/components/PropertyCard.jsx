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

  if (image.startsWith("/uploads/")) {
    return `https://stay.dovail.com${image}`;
  }

  if (image.startsWith("uploads/")) {
    return `https://stay.dovail.com/${image}`;
  }

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

      alert("Added to wishlist ❤️");
    } catch (err) {
      console.log(err);
      alert(err?.response?.data?.message || "Already added or failed");
    }
  };

  return (
    <Link
      to={`/reserve/${property.id}`}
      className="group block no-underline text-inherit"
    >
      <article className="card-airbnb">
        <div className="relative aspect-[1.04/1] overflow-hidden rounded-[28px] bg-gray-100">
          <img
            src={imageUrl}
            alt={property.title || "Stay"}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.045]"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

          <button
            type="button"
            onClick={addToWishlist}
            aria-label="Add to wishlist"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-950 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur transition hover:scale-105 hover:text-[var(--primary)]"
          >
            <Heart size={20} strokeWidth={2.2} />
          </button>

          <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-gray-950 shadow-sm backdrop-blur">
            {property.category || "Guest favorite"}
          </div>
        </div>

        <div className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading line-clamp-1 text-[17px] font-black tracking-[-0.03em] text-[var(--text-main)]">
              {property.title || "Untitled stay"}
            </h3>

            <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#fff8db] px-2 py-1 text-[13px] font-black text-gray-950">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              <span>{property.rating || "5.0"}</span>
            </div>
          </div>

          <p className="mt-1.5 line-clamp-1 text-[14px] font-medium text-[var(--text-secondary)]">
            {property.location || "Location not specified"}
          </p>

          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-[15px] text-[var(--text-secondary)]">
              <span className="text-[19px] font-black tracking-[-0.02em] text-[var(--text-main)]">
                ₹{Number(property.price || 0).toLocaleString("en-IN")}
              </span>{" "}
              / night
            </p>

            <span className="hidden rounded-full bg-[var(--primary-light)] px-3 py-1 text-[11px] font-black text-[var(--primary)] sm:inline-flex">
              View stay
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}