import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  MessageSquare,
  Home,
  TrendingUp,
  Send,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND_COLOR = "#3b71e6";
const BRAND_HOVER = "#6f43e4";

export default function HostReviews() {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user?.id || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/host/reviews/${user.id}`);
      setReviews(res.data || []);
    } catch (err) {
      console.log("Host reviews load failed:", err);
      toast.error("Reviews load failed");
    } finally {
      setLoading(false);
    }
  };

  const replyToReview = async (reviewId) => {
    const reply = String(replyText[reviewId] || "").trim();

    if (!reply) {
      toast.error("Please write a reply");
      return;
    }

    try {
      setReplyingId(reviewId);

      await api.put(`/reviews/${reviewId}/reply`, {
        host_reply: reply,
      });

      toast.success("Reply added successfully");

      setReplyText((prev) => ({
        ...prev,
        [reviewId]: "",
      }));

      await loadReviews();
    } catch (err) {
      console.log("Reply failed:", err);
      toast.error(err.response?.data?.message || "Reply failed");
    } finally {
      setReplyingId(null);
    }
  };

  const avgRating =
    reviews.length === 0
      ? "0.0"
      : (
          reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          reviews.length
        ).toFixed(1);

  const fiveStarCount = reviews.filter(
    (item) => Number(item.rating) === 5
  ).length;

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Host Reviews</h1>

            <p className="mt-2 text-gray-500">
              Manage guest feedback, ratings, and public replies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/host-dashboard")}
            className="rounded-xl bg-[#3b71e6] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#6f43e4]"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-4">
          <StatCard
            icon={<Star />}
            title="Average Rating"
            value={avgRating}
            color="text-[#3b71e6]"
          />

          <StatCard
            icon={<MessageSquare />}
            title="Total Reviews"
            value={reviews.length}
            color="text-gray-900"
          />

          <StatCard
            icon={<TrendingUp />}
            title="5 Star Reviews"
            value={fiveStarCount}
            color="text-green-600"
          />

          <StatCard
            icon={<Home />}
            title="Reviewed Properties"
            value={new Set(reviews.map((item) => item.property_id)).size}
            color="text-gray-900"
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-2xl font-semibold">Guest Feedback</h2>
            <p className="mt-1 text-gray-500">
              Reviews left by guests for your properties.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mb-4 text-6xl">★</div>

              <h3 className="text-2xl font-bold">No reviews yet</h3>

              <p className="mt-2 text-gray-500">
                Guest reviews for your properties will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  replyValue={replyText[review.id] || ""}
                  replying={replyingId === review.id}
                  onReplyChange={(value) =>
                    setReplyText((prev) => ({
                      ...prev,
                      [review.id]: value,
                    }))
                  }
                  onReply={() => replyToReview(review.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ReviewCard({
  review,
  replyValue,
  replying,
  onReplyChange,
  onReply,
}) {
  return (
    <div className="p-6 transition hover:bg-gray-50">
      <div className="flex flex-col gap-5 md:flex-row">
        <img
          src={
            review.image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
          }
          alt={review.title || "Property"}
          className="h-28 w-full rounded-2xl object-cover md:w-36"
          onError={(event) => {
            event.currentTarget.src =
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
          }}
        />

        <div className="flex-1">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {review.title || "Property"}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Reviewed by {review.fullname || review.guest_name || "Guest"}
              </p>
            </div>

            <div className="rounded-full bg-[#F4F1FF] px-4 py-2 font-semibold text-[#3b71e6]">
              ★ {review.rating}
            </div>
          </div>

          <div className="mt-4 flex text-[#3b71e6]">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={17}
                fill={star <= Number(review.rating) ? "currentColor" : "none"}
              />
            ))}
          </div>

          <p className="mt-5 leading-7 text-gray-700">
            {review.review || "No written review."}
          </p>

          <p className="mt-4 text-xs text-gray-400">
            {review.created_at
              ? new Date(review.created_at).toLocaleString()
              : ""}
          </p>

          {review.host_reply ? (
            <div className="mt-5 rounded-2xl border border-[#e8e2ff] bg-[#f7f4ff] p-4">
              <div className="mb-2 flex items-center gap-2 font-bold text-[#3b71e6]">
                <CheckCircle2 size={18} />
                Your public reply
              </div>

              <p className="leading-6 text-gray-700">{review.host_reply}</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
              <label className="text-sm font-bold text-gray-900">
                Reply publicly
              </label>

              <textarea
                value={replyValue}
                onChange={(e) => onReplyChange(e.target.value)}
                rows={3}
                placeholder="Write a helpful public reply to this guest..."
                className="mt-3 w-full resize-none rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/20"
              />

              <button
                type="button"
                onClick={onReply}
                disabled={replying}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#3b71e6] px-5 py-2.5 font-bold text-white transition hover:bg-[#6f43e4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {replying ? "Replying..." : "Post reply"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#3b71e6]">
        {icon}
      </div>

      <p className="text-sm text-gray-500">{title}</p>

      <h2 className={`mt-2 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}