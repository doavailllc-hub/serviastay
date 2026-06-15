import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer } from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

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

  const loadReceipt = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trip/${id}`);
      setTrip(res.data);
    } catch (err) {
      console.log("Receipt load failed:", err);
      alert("Receipt failed to load");
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
        <main className="mx-auto max-w-5xl px-4 py-20">
          Loading receipt...
        </main>
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate(`/trip/${id}`)}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <button
            onClick={printReceipt}
            className="flex items-center gap-2 rounded-xl bg-[#8363F5] px-5 py-3 font-semibold text-white hover:bg-[#7152E8]"
          >
            <Printer size={18} />
            Print / Download
          </button>
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
          <div className="mb-10 flex flex-col justify-between gap-6 border-b pb-8 md:flex-row md:items-start">
            <div>
              <h1 className="text-4xl font-black text-[#8363F5]">
                Servia Stay
              </h1>
              <p className="mt-2 text-gray-500">Official Booking Receipt</p>
            </div>

            <div className="text-left md:text-right">
              <h2 className="text-2xl font-bold text-gray-900">
                Receipt #{trip.id}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Issued: {new Date().toLocaleDateString("en-IN")}
              </p>

              <span className="mt-4 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                {trip.status || "Confirmed"}
              </span>
            </div>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <ReceiptBox title="Property">
              <h3 className="text-xl font-bold text-gray-900">
                {trip.title || "Property Booking"}
              </h3>
              <p className="mt-2 text-gray-500">{trip.location}</p>
              <p className="mt-2 text-sm text-gray-500">
                Property ID: #{trip.property_id}
              </p>
            </ReceiptBox>

            <ReceiptBox title="Host">
              <h3 className="text-xl font-bold text-gray-900">
                {trip.host_name || "Host"}
              </h3>
              <p className="mt-2 text-gray-500">
                {trip.host_email || "Email unavailable"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {trip.host_phone || "Phone unavailable"}
              </p>
            </ReceiptBox>
          </div>

          <ReceiptBox title="Reservation Details">
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="Check-in" value={trip.checkin} />
              <Info label="Check-out" value={trip.checkout} />
              <Info
                label="Guests"
                value={`${trip.guests || 1} ${
                  trip.guests > 1 ? "guests" : "guest"
                }`}
              />
            </div>
          </ReceiptBox>

          <div className="mt-8">
            <ReceiptBox title="Payment Summary">
              <SummaryRow label="Booking amount" value={formatINR(trip.total)} />
              <SummaryRow
                label="Payment method"
                value={trip.payment_method || "cash"}
              />
              <SummaryRow label="Booking status" value={trip.status} />

              <div className="my-5 border-t" />

              <div className="flex justify-between text-2xl font-black">
                <span>Total Paid</span>
                <span className="text-[#8363F5]">{formatINR(trip.total)}</span>
              </div>
            </ReceiptBox>
          </div>

          <div className="mt-10 rounded-2xl bg-[#FAFAFC] p-5 text-sm text-gray-500">
            This is a computer-generated receipt. For any booking changes,
            refunds, or cancellation queries, please contact Servia Stay support
            or the property host.
          </div>
        </section>
      </main>
    </div>
  );
}

function ReceiptBox({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-1 font-bold text-gray-900">{value || "-"}</h3>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="mb-3 flex justify-between gap-5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold capitalize text-gray-900">
        {value || "-"}
      </span>
    </div>
  );
}