import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Download,
  Home,
  MapPin,
  Printer,
  ReceiptText,
  ShieldCheck,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

export default function Receipt() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipt();
  }, [id]);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) => {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(String(date).slice(0, 10)));
  };

  const nights = useMemo(() => {
    if (!trip?.checkin || !trip?.checkout) return 1;

    const start = new Date(`${String(trip.checkin).slice(0, 10)}T00:00:00`);
    const end = new Date(`${String(trip.checkout).slice(0, 10)}T00:00:00`);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));

    return diff > 0 ? diff : 1;
  }, [trip]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trip/${id}`);
      setTrip(res.data);
    } catch (err) {
      console.log("Receipt load failed:", err);
      toast.error("Receipt failed to load");
      navigate("/trips");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-20 text-gray-500">
          Loading receipt...
        </main>
      </div>
    );
  }

  if (!trip) return null;

  const paymentStatus = trip.payment_status || trip.status || "Confirmed";

  return (
    <div className="min-h-screen bg-[#FAFAFC] print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 print:max-w-none print:px-0 print:py-0">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={() => navigate(`/trip/${id}`)}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <button
            type="button"
            onClick={printReceipt}
            className="flex items-center gap-2 rounded-xl bg-[#3b71e6] px-5 py-3 font-semibold text-white hover:bg-[#2f5fc2]"
          >
            <Printer size={18} />
            Print / Download
          </button>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-gradient-to-r from-[#3b71e6] to-[#2f5fc2] p-8 text-white print:bg-white print:text-gray-900">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 print:bg-[#f4f0ff]">
                    <ReceiptText size={28} />
                  </div>

                  <div>
                    <h1 className="text-4xl font-black">Dovail Stay</h1>
                    <p className="mt-1 text-white/80 print:text-gray-500">
                      Official Booking Receipt
                    </p>
                  </div>
                </div>

                <p className="mt-6 max-w-xl text-sm leading-6 text-white/85 print:text-gray-600">
                  Thank you for booking with Dovail Stay. This receipt confirms
                  your reservation and payment details.
                </p>
              </div>

              <div className="rounded-3xl bg-white/15 p-5 text-left backdrop-blur print:border print:border-gray-200 print:bg-white md:text-right">
                <p className="text-sm text-white/80 print:text-gray-500">
                  Receipt Number
                </p>
                <h2 className="mt-1 text-2xl font-black">#{trip.id}</h2>

                <p className="mt-4 text-sm text-white/80 print:text-gray-500">
                  Issued
                </p>
                <p className="mt-1 font-bold">
                  {new Date().toLocaleDateString("en-IN")}
                </p>

                <StatusBadge status={paymentStatus} />
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-8 grid gap-6 md:grid-cols-2">
              <ReceiptBox
                icon={<Home size={20} />}
                title="Property Details"
              >
                <h3 className="text-xl font-black text-gray-900">
                  {trip.title || "Property Booking"}
                </h3>

                <p className="mt-3 flex items-center gap-2 text-gray-500">
                  <MapPin size={16} />
                  {trip.location || "Location unavailable"}
                </p>

                <p className="mt-3 text-sm text-gray-500">
                  Property ID: #{trip.property_id || "-"}
                </p>
              </ReceiptBox>

              <ReceiptBox icon={<User size={20} />} title="Guest Details">
                <h3 className="text-xl font-black text-gray-900">
                  {trip.guest_name || trip.fullname || "Guest"}
                </h3>

                <p className="mt-3 text-gray-500">
                  {trip.guest_email || trip.email || "Email unavailable"}
                </p>

                <p className="mt-3 text-sm text-gray-500">
                  Guest count: {trip.guests || 1}
                </p>
              </ReceiptBox>
            </div>

            <ReceiptBox
              icon={<CalendarDays size={20} />}
              title="Reservation Details"
            >
              <div className="grid gap-4 md:grid-cols-4">
                <Info label="Check-in" value={formatDate(trip.checkin)} />
                <Info label="Check-out" value={formatDate(trip.checkout)} />
                <Info
                  label="Duration"
                  value={`${nights} ${nights === 1 ? "night" : "nights"}`}
                />
                <Info
                  label="Guests"
                  value={`${trip.guests || 1} ${
                    Number(trip.guests || 1) > 1 ? "guests" : "guest"
                  }`}
                />
              </div>
            </ReceiptBox>

            <div className="mt-8 grid gap-6 md:grid-cols-[1fr_360px]">
              <ReceiptBox
                icon={<CreditCard size={20} />}
                title="Payment Summary"
              >
                <SummaryRow
                  label="Booking amount"
                  value={formatINR(trip.total)}
                />

                <SummaryRow
                  label="Payment method"
                  value={trip.payment_method || "cash"}
                  capitalize
                />

                <SummaryRow
                  label="Payment status"
                  value={trip.payment_status || trip.status || "Confirmed"}
                  capitalize
                />

                {trip.payment_id && (
                  <SummaryRow label="Payment ID" value={trip.payment_id} />
                )}

                <div className="my-5 border-t border-gray-200" />

                <div className="flex justify-between gap-5 text-2xl font-black">
                  <span>Total Paid</span>
                  <span className="text-[#3b71e6]">
                    {formatINR(trip.total)}
                  </span>
                </div>
              </ReceiptBox>

              <div className="rounded-3xl border border-[#e8e2ff] bg-[#f7f4ff] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#3b71e6]">
                  <ShieldCheck size={24} />
                </div>

                <h3 className="text-xl font-black text-gray-900">
                  Secure Booking
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Your booking is recorded securely in the Dovail Stay system.
                  Keep this receipt for future reference.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-2xl bg-[#FAFAFC] p-5 text-sm leading-6 text-gray-500 print:border print:border-gray-200">
              This is a computer-generated receipt. For booking changes,
              refunds, or cancellation queries, please contact Dovail Stay
              support or the property host.
            </div>

            <div className="mt-8 flex justify-center print:hidden">
              <button
                type="button"
                onClick={printReceipt}
                className="flex items-center gap-2 rounded-xl bg-[#3b71e6] px-6 py-3 font-bold text-white hover:bg-[#2f5fc2]"
              >
                <Download size={18} />
                Download Receipt
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ReceiptBox({ icon, title, children }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4f0ff] text-[#3b71e6]">
          {icon}
        </div>

        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>

      {children}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-1 font-bold text-gray-900">{value || "-"}</h3>
    </div>
  );
}

function SummaryRow({ label, value, capitalize }) {
  return (
    <div className="mb-3 flex justify-between gap-5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span
        className={`text-right font-semibold text-gray-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const style =
    normalized.includes("paid") || normalized.includes("confirmed")
      ? "bg-green-100 text-green-700"
      : normalized.includes("pending")
      ? "bg-yellow-100 text-yellow-700"
      : normalized.includes("cancelled") || normalized.includes("failed")
      ? "bg-red-100 text-red-600"
      : "bg-white/20 text-white print:bg-gray-100 print:text-gray-700";

  return (
    <span
      className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-black ${style}`}
    >
      {status || "Confirmed"}
    </span>
  );
}