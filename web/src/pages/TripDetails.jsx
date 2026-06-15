import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Star,
  User,
  Users,
  XCircle,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function TripDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getUser = () =>
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const loadTrip = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trip/${id}`);
      setTrip(res.data);
    } catch (err) {
      console.log("Trip details failed:", err);
      alert("Trip details failed to load");
      navigate("/trips");
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmCancel) return;

    try {
      setCancelling(true);

      await api.put(`/bookings/${id}/cancel`, {
        reason: "Cancelled by guest",
      });

      alert("Booking cancelled successfully");
      loadTrip();
    } catch (err) {
      console.log("Cancel failed:", err);
      alert(err.response?.data?.message || "Cancel booking failed");
    } finally {
      setCancelling(false);
    }
  };

  const downloadInvoice = () => {
    const invoiceWindow = window.open("", "_blank");

    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Servia Stay Invoice #${trip.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #222;
              padding: 40px;
              background: #fff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #eee;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .brand {
              font-size: 30px;
              font-weight: 800;
              color: #8363F5;
            }
            .muted {
              color: #666;
              font-size: 14px;
            }
            .box {
              border: 1px solid #eee;
              border-radius: 16px;
              padding: 22px;
              margin-bottom: 20px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 12px 0;
              gap: 20px;
            }
            .total {
              border-top: 1px solid #eee;
              padding-top: 16px;
              margin-top: 16px;
              font-size: 22px;
              font-weight: 800;
              color: #8363F5;
            }
            .badge {
              display: inline-block;
              padding: 7px 14px;
              border-radius: 999px;
              background: #ecfdf5;
              color: #047857;
              font-weight: 700;
              font-size: 12px;
            }
            button {
              margin-top: 24px;
              padding: 12px 18px;
              border: none;
              border-radius: 10px;
              background: #8363F5;
              color: #fff;
              font-weight: 700;
              cursor: pointer;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              <div class="brand">Servia Stay</div>
              <p class="muted">Booking Invoice</p>
            </div>

            <div>
              <p><strong>Invoice:</strong> #${trip.id}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="box">
            <h2>${trip.title || "Property Booking"}</h2>
            <p class="muted">${trip.location || ""}</p>
            <span class="badge">${trip.status || "Confirmed"}</span>
          </div>

          <div class="box">
            <h3>Reservation Details</h3>
            <div class="row"><span>Booking ID</span><strong>#${trip.id}</strong></div>
            <div class="row"><span>Check-in</span><strong>${trip.checkin}</strong></div>
            <div class="row"><span>Check-out</span><strong>${trip.checkout}</strong></div>
            <div class="row"><span>Guests</span><strong>${trip.guests || 1}</strong></div>
            <div class="row"><span>Payment Method</span><strong>${trip.payment_method || "cash"}</strong></div>
          </div>

          <div class="box">
            <h3>Host Details</h3>
            <div class="row"><span>Host</span><strong>${trip.host_name || "Host"}</strong></div>
            <div class="row"><span>Email</span><strong>${trip.host_email || "Unavailable"}</strong></div>
            <div class="row"><span>Phone</span><strong>${trip.host_phone || "Unavailable"}</strong></div>
          </div>

          <div class="box">
            <h3>Payment Summary</h3>
            <div class="row"><span>Booking Total</span><strong>${formatINR(trip.total)}</strong></div>
            <div class="row total"><span>Total Paid</span><span>${formatINR(trip.total)}</span></div>
          </div>

          <p class="muted">
            Thank you for booking with Servia Stay. This invoice is computer generated.
          </p>

          <button onclick="window.print()">Download / Print Invoice</button>
        </body>
      </html>
    `);

    invoiceWindow.document.close();
  };

  const contactHost = async () => {
    try {
      const user = getUser();

      if (!user) {
        navigate("/");
        return;
      }

      await api.post("/messages", {
        sender_id: user.id,
        receiver_id: trip.host_id,
        property_id: trip.property_id,
        message: `Hi, I need help with my booking #${trip.id} for ${trip.title}`,
      });

      navigate("/messages");
    } catch (err) {
      console.log("Chat host failed:", err);
      alert("Unable to contact host");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />

        <main className="mx-auto max-w-6xl px-4 py-20">
          Loading trip details...
        </main>
      </div>
    );
  }

  if (!trip) return null;

  const status = trip.status || "Confirmed";
  const canCancel = status !== "Cancelled" && status !== "Completed";
  const canReview = status === "Completed";

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center gap-5">
          <button
            onClick={() => navigate("/trips")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Trip Details
            </h1>

            <p className="mt-1 text-gray-500">
              Booking #{trip.id}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-8">
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <img
                src={
                  trip.image ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
                }
                alt={trip.title || "Trip"}
                className="h-80 w-full object-cover"
              />

              <div className="p-6">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      {trip.title || "Property Booking"}
                    </h2>

                    <p className="mt-2 text-gray-500">
                      {trip.location || "Location unavailable"}
                    </p>
                  </div>

                  <StatusBadge status={status} />
                </div>

                <p className="leading-7 text-gray-600">
                  {trip.description ||
                    "Your stay is confirmed. Please check your booking details and contact the host if needed."}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">
                Reservation Details
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <InfoBox
                  icon={<CalendarDays />}
                  label="Check-in"
                  value={trip.checkin}
                />

                <InfoBox
                  icon={<CalendarDays />}
                  label="Check-out"
                  value={trip.checkout}
                />

                <InfoBox
                  icon={<Users />}
                  label="Guests"
                  value={`${trip.guests || 1} ${
                    trip.guests > 1 ? "guests" : "guest"
                  }`}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">
                Property Information
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <SimpleInfo label="Property ID" value={`#${trip.property_id}`} />
                <SimpleInfo label="Booking ID" value={`#${trip.id}`} />
                <SimpleInfo label="Location" value={trip.location} />
                <SimpleInfo label="Payment" value={trip.payment_method || "cash"} />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">Host Details</h2>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8363F5] text-2xl font-bold text-white">
                  {trip.host_name?.charAt(0)?.toUpperCase() || "H"}
                </div>

                <div>
                  <h3 className="text-lg font-bold">
                    {trip.host_name || "Host"}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {trip.host_email || "Email unavailable"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {trip.host_phone || "Phone unavailable"}
                  </p>
                </div>
              </div>

              <button
                onClick={contactHost}
                className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 font-semibold hover:bg-gray-50"
              >
                <MessageCircle size={18} />
                Contact Host
              </button>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">
                Booking Timeline
              </h2>

              <Timeline status={status} />
            </div>

            <div className="rounded-3xl bg-[#FFF8E8] p-6">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="text-yellow-700" />
                <h3 className="text-xl font-bold">Refund Policy</h3>
              </div>

              <p className="text-sm text-gray-700">
                • Cancel within 24 hours of booking: full refund where applicable.
              </p>

              <p className="mt-2 text-sm text-gray-700">
                • Cancel before check-in: refund depends on the host policy.
              </p>

              <p className="mt-2 text-sm text-gray-700">
                • After check-in: refund is normally not available.
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="sticky top-24 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold">
                Payment Summary
              </h2>

              <SummaryRow label="Booking total" value={formatINR(trip.total)} />
              <SummaryRow
                label="Payment method"
                value={trip.payment_method || "cash"}
              />
              <SummaryRow label="Status" value={status} />

              <div className="my-5 border-t" />

              <div className="flex justify-between text-xl font-bold">
                <span>Total paid</span>
                <span className="text-[#8363F5]">
                  {formatINR(trip.total)}
                </span>
              </div>

              <div className="mt-6 space-y-3">
              <button
  onClick={() => navigate(`/receipt/${trip.id}`)}
  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
>
  <ReceiptText size={18} />
  View Receipt
</button>

                <button
                  onClick={contactHost}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                >
                  <MessageCircle size={18} />
                  Chat Host
                </button>

                {canReview && (
                  <button
                    onClick={() => navigate(`/review/${trip.id}`)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-yellow-300 font-semibold text-yellow-700 hover:bg-yellow-50"
                  >
                    <Star size={18} />
                    Write Review
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={cancelBooking}
                    disabled={cancelling}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <XCircle size={18} />
                    {cancelling ? "Cancelling..." : "Cancel Booking"}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] p-6 text-white shadow-xl">
              <ReceiptText className="mb-3" />

              <h3 className="text-xl font-bold">Need help?</h3>

              <p className="mt-2 text-white/90">
                Contact the host or support team for booking changes,
                cancellations, and payment questions.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-5">
      <div className="mb-3 text-[#8363F5]">{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-1 font-bold text-gray-900">{value}</h3>
    </div>
  );
}

function SimpleInfo({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-1 font-bold text-gray-900 capitalize">
        {value || "-"}
      </h3>
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
      : status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  return (
    <span className={`rounded-full px-4 py-2 text-sm font-bold ${style}`}>
      {status}
    </span>
  );
}

function Timeline({ status }) {
  const steps = [
    { label: "Booking created", active: true },
    {
      label: "Payment recorded",
      active: ["Pending", "Confirmed", "Completed"].includes(status),
    },
    {
      label: "Host confirmed",
      active: ["Confirmed", "Completed"].includes(status),
    },
    {
      label: "Stay completed",
      active: status === "Completed",
    },
  ];

  if (status === "Cancelled") {
    steps.push({
      label: "Booking cancelled",
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
                ? "bg-[#8363F5] text-white"
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