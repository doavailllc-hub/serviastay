import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/api";
import Navbar from "../components/Navbar";

export default function RefundRequest() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/trip/${bookingId}`);
      setBooking(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Booking load failed");
    } finally {
      setLoading(false);
    }
  };

  const submitRefund = async () => {
    if (!reason.trim()) {
      toast.error("Please enter refund reason");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/refunds/request", {
        booking_id: bookingId,
        reason,
      });

      toast.success("Refund request submitted");
      navigate("/trips");
    } catch (err) {
      toast.error(err.response?.data?.message || "Refund request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#3b71e6]"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
              <RotateCcw size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Request Refund
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Submit your refund request. Our support team will review it.
              </p>
            </div>
          </div>

          {booking && (
            <div className="mt-6 rounded-2xl bg-gray-50 p-4">
              <p className="font-semibold">{booking.title}</p>
              <p className="mt-1 text-sm text-gray-500">{booking.location}</p>
              <p className="mt-2 text-sm text-gray-600">
                {booking.checkin} → {booking.checkout}
              </p>
              <p className="mt-2 text-lg font-semibold">
                ₹{Number(booking.total || 0).toLocaleString("en-IN")}
              </p>
            </div>
          )}

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">
              Refund reason
            </span>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              placeholder="Explain why you are requesting a refund..."
              className="w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </label>

          <button
            onClick={submitRefund}
            disabled={submitting}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting && <Loader2 className="animate-spin" size={17} />}
            Submit Refund Request
          </button>
        </section>
      </main>
    </>
  );
}