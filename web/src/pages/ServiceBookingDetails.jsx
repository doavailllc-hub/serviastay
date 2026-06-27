import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

export default function ServiceBookingDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const formatUSD = (amount) => `$${Number(amount || 0).toLocaleString()}`;

  const loadBooking = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/service-booking/${id}`);
      setBooking(res.data);
    } catch (err) {
      console.log("Service booking details failed:", err);
      alert("Service booking details failed to load");
      navigate("/trips");
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this service booking?"
    );

    if (!confirmCancel) return;

    try {
      setCancelling(true);

      await api.put(`/service-booking/${id}/cancel`, {
        reason: "Cancelled by user",
      });

      alert("Service booking cancelled successfully");
      loadBooking();
    } catch (err) {
      console.log("Service booking cancel failed:", err);
      alert(err.response?.data?.message || "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          Loading service booking...
        </main>
      </div>
    );
  }

  if (!booking) return null;

  const status = booking.status || "Confirmed";
  const canCancel = status !== "Cancelled" && status !== "Completed";

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center justify-between gap-5 print:hidden">
          <button
            onClick={() => navigate("/trips")}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Back to trips
          </button>

          <button
            onClick={printReceipt}
            className="flex items-center gap-2 rounded-xl bg-[#3b71e6] px-5 py-3 font-semibold text-white hover:bg-[#7152E8]"
          >
            <Download size={18} />
            Print / Download
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Service Booking Details
          </h1>

          <p className="mt-2 text-gray-500">
            Booking #{booking.id}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-8">
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {booking.service_title || "Service Booking"}
                  </h2>

                  <p className="mt-2 text-gray-500">
                    Provider: {booking.provider || "Service Provider"}
                  </p>
                </div>

                <StatusBadge status={status} />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">
                Service Details
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <InfoBox
                  icon={<CalendarDays />}
                  label="Service Date"
                  value={booking.service_date}
                />

                <InfoBox
                  icon={<Users />}
                  label="People"
                  value={`${booking.people || 1} ${
                    booking.people > 1 ? "people" : "person"
                  }`}
                />

                <InfoBox
                  icon={<ReceiptText />}
                  label="Booking ID"
                  value={`#${booking.id}`}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">
                Booking Timeline
              </h2>

              <Timeline status={status} />
            </div>

            <div className="rounded-3xl bg-[#F4F1FF] p-6">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="text-[#3b71e6]" />
                <h3 className="text-xl font-bold">Service Protection</h3>
              </div>

              <p className="text-sm leading-6 text-gray-600">
                If the service provider is unavailable or there is a service issue,
                contact support from the Support Center. Our team will help you
                with booking changes or refunds where applicable.
              </p>
            </div>
          </section>

          <aside>
            <div className="sticky top-24 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">
                Payment Summary
              </h2>

              <SummaryRow
                label="Service total"
                value={formatUSD(booking.total)}
              />

              <SummaryRow label="Status" value={status} />

              <div className="my-5 border-t" />

              <div className="flex justify-between text-xl font-bold">
                <span>Total paid</span>
                <span className="text-[#3b71e6]">
                  {formatUSD(booking.total)}
                </span>
              </div>

              <div className="mt-6 space-y-3 print:hidden">
                <button
                  onClick={printReceipt}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] font-semibold text-white hover:bg-[#7152E8]"
                >
                  <Download size={18} />
                  Download Receipt
                </button>

                <button
                  onClick={() => navigate("/support")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                >
                  <MessageCircle size={18} />
                  Contact Support
                </button>

                {canCancel && (
                  <button
                    onClick={cancelBooking}
                    disabled={cancelling}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <XCircle size={18} />
                    {cancelling ? "Cancelling..." : "Cancel Service"}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-5">
      <div className="mb-3 text-[#3b71e6]">{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-1 font-bold text-gray-900">{value || "-"}</h3>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="mb-3 flex justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Cancelled"
      ? "bg-red-100 text-red-600"
      : status === "Completed"
      ? "bg-blue-100 text-blue-700"
      : "bg-green-100 text-green-700";

  return (
    <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${style}`}>
      {status}
    </span>
  );
}

function Timeline({ status }) {
  const steps = [
    { label: "Service booked", active: true },
    { label: "Provider confirmed", active: status !== "Cancelled" },
    { label: "Service completed", active: status === "Completed" },
  ];

  if (status === "Cancelled") {
    steps.push({
      label: "Service cancelled",
      active: true,
      cancelled: true,
    });
  }

  return (
    <div className="space-y-5">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div
            className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step.cancelled
                ? "bg-red-500 text-white"
                : step.active
                ? "bg-[#3b71e6] text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {index + 1}
          </div>

          <div>
            <h4 className="font-bold">{step.label}</h4>

            <p className="text-sm text-gray-500">
              {step.active ? "Completed" : "Pending"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}