import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import api from "../api/api";
import { formatCurrency } from "../utils/currency";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80";

const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://stay.dovail.com";

function getImageUrl(property) {
  const image =
    property?.image ||
    property?.image_url ||
    property?.cover_image ||
    property?.thumbnail ||
    "";

  if (!image) return FALLBACK_IMAGE;

  if (image.startsWith("https://")) return image;

  if (image.startsWith("http://")) {
    try {
      const url = new URL(image);
      return `${SITE_URL}${url.pathname}`;
    } catch {
      return FALLBACK_IMAGE;
    }
  }

  if (image.startsWith("/uploads/")) {
    return `${SITE_URL}${image}`;
  }

  if (image.startsWith("uploads/")) {
    return `${SITE_URL}/${image}`;
  }

  return image;
}

export default function PropertyCard({ property, priority = false }) {
  const navigate = useNavigate();

  const [liked, setLiked] = useState(Boolean(property?.is_wishlisted));
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const imageUrl = useMemo(() => getImageUrl(property), [property]);

  const ratingLabel =
    property?.rating && Number(property.rating) > 0
      ? Number(property.rating).toFixed(1)
      : "New";

  const priceLabel =
    property?.price && Number(property.price) > 0
      ? formatCurrency(property.price)
      : null;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (wishlistLoading) return;

    const user =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(sessionStorage.getItem("user") || "null");

    if (!user?.id) {
      navigate("/login");
      return;
    }

    if (!property?.id) return;

    const previousLiked = liked;

    try {
      setWishlistLoading(true);
      setLiked(true);

      await api.post("/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });
    } catch (err) {
      console.log("Wishlist failed:", err);
      setLiked(previousLiked);
    } finally {
      setWishlistLoading(false);
    }
  };

  if (!property?.id) return null;

  return (
    <article className="relative w-full">
      <Link
        to={`/reserve/${property.id}`}
        className="group block text-inherit no-underline"
        aria-label={`View ${property.title || "stay"}`}
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
          <img
            src={imageUrl}
            alt={property.title || "Stay property image"}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={(e) => {
              if (e.currentTarget.src !== FALLBACK_IMAGE) {
                e.currentTarget.src = FALLBACK_IMAGE;
              }
            }}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
          />

        </div>

        <div className="pt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-sm font-semibold leading-5 text-gray-950">
              {property.title || "Untitled stay"}
            </h3>

            <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-700">
              <Star size={11} fill="currentColor" strokeWidth={0} />
              <span>{ratingLabel}</span>
            </div>
          </div>

          <p className="mt-1 line-clamp-1 text-sm leading-5 text-gray-500">
            {property.location || property.city || "Location not specified"}
          </p>

          <p className="mt-2 text-sm leading-5 text-gray-500">
            {priceLabel ? (
              <>
                <span className="font-semibold text-gray-950">
                  {priceLabel}
                </span>{" "}
                / night
              </>
            ) : (
              <span className="font-medium text-gray-500">
                Price unavailable
              </span>
            )}
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleWishlist}
        disabled={wishlistLoading}
        aria-label={liked ? "Saved to wishlist" : "Add to wishlist"}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Heart
          size={18}
          strokeWidth={2}
          className={liked ? "text-red-500" : "text-gray-700"}
          fill={liked ? "currentColor" : "none"}
        />
      </button>
    </article>
  );
}
