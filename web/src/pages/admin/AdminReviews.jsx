import { useEffect, useState } from "react";
import { Star, RefreshCw, EyeOff, Flag, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/api";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/reviews");
      setReviews(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Reviews load failed");
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (id, status) => {
    try {
      await api.put(`/admin/reviews/${id}/status`, {
        status,
        admin_note: notes[id] || "",
      });

      toast.success(`Review marked as ${status}`);
      loadReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Review update failed");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Moderation</h1>
          <p className="mt-2 text-gray-500">
            Approve, hide, or flag guest reviews.
          </p>
        </div>

        <button
          onClick={loadReviews}
          className="flex items-center gap-2 rounded-xl bg-[3b71e6] px-5 py-3 font-bold text-white hover:bg-[#6f43e4]"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-10 text-center text-gray-500">
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center text-gray-500">
          No reviews found.
        </div>
      ) : (
        <div className="grid gap-5">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <h3 className="text-xl font-bold">
                    {review.property_title || "Property"}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    By {review.guest_name || "Guest"} · {review.guest_email}
                  </p>

                  <div className="mt-3 flex text-[3b71e6]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={18}
                        fill={
                          star <= Number(review.rating)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    ))}
                  </div>
                </div>

                <StatusBadge status={review.status || "Approved"} />
              </div>

              <p className="mt-5 leading-7 text-gray-700">
                {review.review || "No written review."}
              </p>

              {review.host_reply && (
                <div className="mt-4 rounded-2xl bg-[#f7f4ff] p-4 text-sm text-gray-700">
                  <b>Host reply:</b> {review.host_reply}
                </div>
              )}

              <textarea
                value={notes[review.id] ?? review.admin_note ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    [review.id]: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Admin note..."
                className="mt-5 w-full resize-none rounded-2xl border border-gray-300 p-4 text-sm outline-none focus:border-[3b71e6] focus:ring-2 focus:ring-[3b71e6]/20"
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <ActionButton
                  icon={<CheckCircle size={16} />}
                  label="Approve"
                  onClick={() => updateReview(review.id, "Approved")}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                />

                <ActionButton
                  icon={<EyeOff size={16} />}
                  label="Hide"
                  onClick={() => updateReview(review.id, "Hidden")}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                />

                <ActionButton
                  icon={<Flag size={16} />}
                  label="Flag"
                  onClick={() => updateReview(review.id, "Flagged")}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Hidden"
      ? "bg-gray-200 text-gray-700"
      : status === "Flagged"
      ? "bg-red-100 text-red-600"
      : "bg-green-100 text-green-700";

  return (
    <span className={`h-fit rounded-full px-4 py-2 text-sm font-bold ${style}`}>
      {status}
    </span>
  );
}

function ActionButton({ icon, label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}