import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  IndianRupee,
  Loader2,
  MapPin,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api/api";
import Navbar from "../components/Navbar";
import { formatINR, getStoredUser } from "../utils/resortUtils";

function formatDate(value) {
  if (!value) return "Not selected";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not selected";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function canRequestRefund(status) {
  const normalized = String(status || "").toLowerCase();

  return ![
    "cancelled",
    "refunded",
    "refund requested",
    "refund_requested",
    "pending",
  ].includes(normalized);
}

export default function RefundRequest() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadBooking = async () => {
    try {
      const user = getStoredUser();

      if (!user?.id) {
        navigate("/login");
        return;
      }

      setLoading(true);

      const { data } = await api.get(`/trip/${bookingId}`);
      setBooking(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Booking load failed");
      navigate("/trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const submitRefund = async () => {
    const cleanedReason = reason.trim();

    if (!cleanedReason) {
      toast.error("Please enter refund reason");
      return;
    }

    if (cleanedReason.length < 20) {
      toast.error("Please explain your reason in at least 20 characters");
      return;
    }

    if (cleanedReason.length > 1000) {
      toast.error("Refund reason must be under 1000 characters");
      return;
    }

    if (!booking || !canRequestRefund(booking.status)) {
      toast.error("Refund is not available for this booking");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/refunds/request", {
        booking_id: bookingId,
        reason: cleanedReason,
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

  const refundAvailable = canRequestRefund(booking?.status);

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-24">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#3b71e6]"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
              <RotateCcw size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Request refund
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Submit your refund request. Our support team will review it
                according to the booking and host cancellation policy.
              </p>
            </div>
          </div>

          {booking && (
            <div className="mt-6 rounded-2xl bg-gray-50 p-4">
              <p className="font-semibold">{booking.title}</p>

              <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={15} />
                {booking.location || "Location unavailable"}
              </p>

              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays size={15} />
                {formatDate(booking.checkin)} → {formatDate(booking.checkout)}
              </p>

              <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                <IndianRupee size={18} />
                {formatINR(booking.total).replace("₹", "")}
              </p>

              <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                Status: {booking.status || "Confirmed"}
              </span>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 text-yellow-700" size={20} />

              <p className="text-sm leading-6 text-gray-700">
                Refunds are reviewed by support. Submission does not guarantee
                approval. If approved, the amount will be processed according to
                payment gateway timelines.
              </p>
            </div>
          </div>

          {!refundAvailable && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
              Refund is not available for this booking status.
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
              maxLength={1000}
              disabled={!refundAvailable}
              placeholder="Explain why you are requesting a refund..."
              className="w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none transition focus:border-[#3b71e6] disabled:bg-gray-50"
            />

            <p className="mt-2 text-xs text-gray-400">
              {reason.length}/1000 characters
            </p>
          </label>

          <button
            type="button"
            onClick={submitRefund}
            disabled={submitting || !refundAvailable}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] text-sm font-semibold text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting && <Loader2 className="animate-spin" size={17} />}
            Submit refund request
          </button>
        </section>
      </main>
    </>
  );
}