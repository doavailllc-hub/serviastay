import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Star } from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function WriteReview() {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviewAccess();
  }, [bookingId]);

  const loadReviewAccess = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/reviews/can-review/${bookingId}`);
      setCanReview(res.data.canReview);
      setBooking(res.data.booking);
    } catch (err) {
      console.log("Review access failed:", err);
      alert("Unable to open review page");
      navigate("/trips");
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    try {
      const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      if (!user) {
        navigate("/");
        return;
      }

      if (!review.trim()) {
        alert("Please write your review");
        return;
      }

      setSubmitting(true);

      await api.post("/reviews", {
        property_id: booking.property_id,
        user_id: user.id,
        rating,
        review: review.trim(),
      });

      alert("Review submitted successfully");
      navigate(`/trip/${bookingId}`);
    } catch (err) {
      console.log("Review submit failed:", err);
      alert("Review submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-20">
          Loading review page...
        </main>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />

        <main className="mx-auto max-w-4xl px-4 py-20">
          <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mb-4 text-6xl">⭐</div>

            <h1 className="text-3xl font-bold text-gray-900">
              Review not available
            </h1>

            <p className="mt-3 text-gray-500">
              You can write a review only after your trip is completed and only once per stay.
            </p>

            <button
              onClick={() => navigate(`/trip/${bookingId}`)}
              className="mt-8 rounded-xl bg-[3b71e6] px-6 py-3 font-semibold text-white hover:bg-[#7152E8]"
            >
              Back to Trip
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center gap-5">
          <button
            onClick={() => navigate(`/trip/${bookingId}`)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Write a Review
            </h1>

            <p className="mt-1 text-gray-500">
              Share your stay experience with future guests.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              How was your stay?
            </h2>

            <p className="mt-2 text-gray-500">
              Rate your overall experience.
            </p>

            <div className="mt-5 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="transition hover:scale-110"
                >
                  <Star
                    size={38}
                    className={
                      value <= rating ? "text-yellow-400" : "text-gray-300"
                    }
                    fill={value <= rating ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>

            <p className="mt-3 text-sm font-semibold text-[3b71e6]">
              {rating} out of 5 stars
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Your review
            </label>

            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell guests what you liked about the stay, location, host communication, cleanliness, and comfort..."
              className="min-h-44 w-full resize-none rounded-2xl border border-gray-300 bg-white p-4 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[3b71e6]"
            />
          </div>

          <div className="mt-8 flex flex-col justify-end gap-3 sm:flex-row">
            <button
              onClick={() => navigate(`/trip/${bookingId}`)}
              className="h-12 rounded-xl border border-gray-300 px-6 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={submitReview}
              disabled={submitting}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[3b71e6] px-6 font-semibold text-white hover:bg-[#7152E8] disabled:opacity-60"
            >
              <Send size={18} />
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}