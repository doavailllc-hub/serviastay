import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import api from "../../api/api";
import { getStoredUser } from "../../utils/resortUtils";

export default function ReviewsSection({ propertyId, reviews = [], onReviewAdded }) {
  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const user = getStoredUser();

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "New";

  const submitReview = async () => {
    if (!user?.id) {
      toast.error("Please login to write a review");
      navigate("/login");
      return;
    }

    if (!review.trim()) {
      toast.error("Please write your review before submitting");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/reviews", {
        property_id: propertyId,
        user_id: user.id,
        rating,
        review: review.trim(),
      });

      setReview("");
      setRating(5);

      if (onReviewAdded) {
        await onReviewAdded();
      }

      toast.success("Review submitted successfully");
    } catch (err) {
      console.error("Review submit failed:", err);
      toast.error(err?.response?.data?.message || "Review submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-8">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
        <Star size={20} fill="currentColor" />
        {avgRating} · {reviews.length} reviews
      </h2>

      {!user ? (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-base font-semibold">Want to write a review?</h3>

          <p className="mt-2 text-sm text-gray-500">
            Please log in to review this stay.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-4 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            Log in to review
          </button>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold">Write a review</h3>

          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-[#3b71e6]"
                aria-label={`Rate ${star} star`}
              >
                <Star
                  size={24}
                  fill={star <= rating ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Share your experience..."
            className="mt-4 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400">{review.length}/1000</p>

            <button
              type="button"
              onClick={submitReview}
              disabled={submitting}
              className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {reviews.map((item) => (
            <div key={item.id} className="border-b border-gray-200 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold">
                  {(item.guest_name || "G").charAt(0).toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-medium">
                    {item.guest_name || "Guest"}
                  </p>

                  <div className="mt-1 flex text-[#3b71e6]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        fill={
                          star <= Number(item.rating) ? "currentColor" : "none"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600">
                {item.review || "No written review."}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}