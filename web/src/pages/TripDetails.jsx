import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Star,
  Users,
  XCircle,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

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

function safeStorage(key) {
  try {
    return (
      JSON.parse(localStorage.getItem(key) || "null") ||
      JSON.parse(sessionStorage.getItem(key) || "null")
    );
  } catch {
    return null;
  }
}

function getValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }
  return fallback;
}

export default function TripDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const loadTrip = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/trip/${id}`);
      setTrip(data);
    } catch (err) {
      console.error("Trip details failed:", err);
      navigate("/trips");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  const data = useMemo(() => {
    if (!trip) return null;

    return {
      id: trip.id,
      title: getValue(trip, ["property_title", "title"], "Property booking"),
      location: getValue(trip, ["location", "address"], "Location unavailable"),
      image: getValue(
        trip,
        ["image", "image_url", "property_image", "cover_image"],
        FALLBACK_IMAGE
      ),
      checkin: getValue(trip, ["checkin", "check_in", "check_in_date"]),
      checkout: getValue(trip, ["checkout", "check_out", "check_out_date"]),
      guests: Number(getValue(trip, ["guests", "guest_count"], 1)),
      total: getValue(trip, ["total", "total_amount", "amount"], 0),
      status: getValue(trip, ["status"], "Confirmed"),
      paymentMethod: getValue(trip, ["payment_method"], "razorpay"),
      description: getValue(
        trip,
        ["description"],
        "Your stay is confirmed. Please check your booking details and contact the host if needed."
      ),
      propertyId: getValue(trip, ["property_id"], "-"),
      hostId: getValue(trip, ["host_id"], null),
      hostName: getValue(trip, ["host_name"], "Host"),
      hostEmail: getValue(trip, ["host_email"], "Email unavailable"),
      hostPhone: getValue(trip, ["host_phone"], "Phone unavailable"),
    };
  }, [trip]);

  const cancelBooking = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      setCancelling(true);

      await api.put(`/bookings/${id}/cancel`, {
        reason: "Cancelled by guest",
      });

      await loadTrip();
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err.response?.data?.message || "Cancel booking failed");
    } finally {
      setCancelling(false);
    }
  };

  const downloadInvoice = () => {
    if (!data) return;

    const win = window.open("", "_blank");

    if (!win) {
      alert("Please allow popups to download invoice.");
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Dovail Stay Invoice #${data.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111827; background: #fff; }
            .invoice { max-width: 850px; margin: auto; border: 1px solid #e5e7eb; border-radius: 22px; overflow: hidden; }
            .header { background: #3b71e6; color: white; padding: 30px; display: flex; justify-content: space-between; gap: 20px; }
            .content { padding: 30px; }
            .muted { color: #6b7280; }
            .box { border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-top: 20px; }
            .row { display: flex; justify-content: space-between; gap: 20px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .total { font-size: 28px; font-weight: 800; color: #3b71e6; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div>
                <h1>Dovail Stay</h1>
                <p>Booking Invoice</p>
              </div>
              <div>
                <h2>INVOICE</h2>
                <p>#${data.id}</p>
              </div>
            </div>

            <div class="content">
              <h2>${data.title}</h2>
              <p class="muted">${data.location}</p>

              <div class="box">
                <div class="row"><span>Check-in</span><strong>${formatDate(data.checkin)}</strong></div>
                <div class="row"><span>Check-out</span><strong>${formatDate(data.checkout)}</strong></div>
                <div class="row"><span>Guests</span><strong>${data.guests}</strong></div>
                <div class="row"><span>Payment Method</span><strong>${data.paymentMethod}</strong></div>
                <div class="row"><span>Status</span><strong>${data.status}</strong></div>
              </div>

              <div class="box">
                <div class="row">
                  <span>Total Paid</span>
                  <span class="total">${formatINR(data.total)}</span>
                </div>
              </div>

              <p class="muted" style="margin-top:30px;">Thank you for booking with Dovail Stay.</p>
              <button onclick="window.print()">Print invoice</button>
            </div>
          </div>
        </body>
      </html>
    `);

    win.document.close();
  };

  const contactHost = async () => {
    try {
      const user = safeStorage("user");

      if (!user?.id) {
        navigate("/login");
        return;
      }

      if (!data?.hostId) {
        alert("Host details unavailable.");
        return;
      }

      await api.post("/messages", {
        sender_id: user.id,
        receiver_id: data.hostId,
        property_id: data.propertyId,
        message: `Hi, I need help with my booking #${data.id} for ${data.title}`,
      });

      navigate("/messages");
    } catch (err) {
      console.error("Chat host failed:", err);
      alert("Unable to contact host");
    }
  };

  if (loading) return <TripDetailsSkeleton />;

  if (!data) return null;

  const normalizedStatus = String(data.status).toLowerCase();
  const canCancel =
    normalizedStatus !== "cancelled" && normalizedStatus !== "completed";
  const canReview = normalizedStatus === "completed";

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 md:px-8">
        <header className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/trips")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-50"
          >
            <ArrowLeft size={21} />
          </button>

          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">Booking #{data.id}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
              Trip details
            </h1>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              <img
                src={data.image}
                alt={data.title}
                className="h-80 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <div className="p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                      {data.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">{data.location}</p>
                  </div>

                  <StatusBadge status={data.status} />
                </div>

                <p className="mt-5 text-sm leading-7 text-gray-600">
                  {data.description}
                </p>
              </div>
            </article>

            <Card title="Reservation details">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoBox
                  icon={<CalendarDays size={20} />}
                  label="Check-in"
                  value={formatDate(data.checkin)}
                />
                <InfoBox
                  icon={<CalendarDays size={20} />}
                  label="Check-out"
                  value={formatDate(data.checkout)}
                />
                <InfoBox
                  icon={<Users size={20} />}
                  label="Guests"
                  value={`${data.guests} ${data.guests > 1 ? "guests" : "guest"}`}
                />
              </div>
            </Card>

            <Card title="Property information">
              <div className="grid gap-4 md:grid-cols-2">
                <SimpleInfo label="Property ID" value={`#${data.propertyId}`} />
                <SimpleInfo label="Booking ID" value={`#${data.id}`} />
                <SimpleInfo label="Location" value={data.location} />
                <SimpleInfo label="Payment" value={data.paymentMethod} />
              </div>
            </Card>

            <Card title="Host details">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-xl font-semibold text-[#3b71e6]">
                  {data.hostName?.charAt(0)?.toUpperCase() || "H"}
                </div>

                <div>
                  <h3 className="font-semibold">{data.hostName}</h3>
                  <p className="mt-1 text-sm text-gray-500">{data.hostEmail}</p>
                  <p className="text-sm text-gray-500">{data.hostPhone}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={contactHost}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 text-sm font-semibold transition hover:bg-gray-50"
              >
                <MessageCircle size={17} />
                Contact host
              </button>
            </Card>

            <Card title="Booking timeline">
              <Timeline status={data.status} />
            </Card>

            <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-6">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="text-yellow-700" size={21} />
                <h3 className="text-lg font-semibold">Refund policy</h3>
              </div>

              <p className="text-sm leading-7 text-gray-700">
                Cancel within 24 hours of booking for full refund where applicable.
                After that, refund depends on the host policy and check-in time.
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="sticky top-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold tracking-tight">
                Payment summary
              </h2>

              <SummaryRow label="Booking total" value={formatINR(data.total)} />
              <SummaryRow label="Payment method" value={data.paymentMethod} />
              <SummaryRow label="Status" value={data.status} />

              <div className="my-5 border-t border-gray-200" />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total paid</span>
                <span className="text-[#3b71e6]">{formatINR(data.total)}</span>
              </div>

              <div className="mt-6 space-y-3">
                <ActionButton onClick={downloadInvoice} icon={<ReceiptText size={17} />}>
                  Download invoice
                </ActionButton>

                <ActionButton onClick={contactHost} icon={<MessageCircle size={17} />}>
                  Chat host
                </ActionButton>

                {canReview && (
                  <ActionButton
                    onClick={() => navigate(`/review/${data.id}`)}
                    icon={<Star size={17} />}
                    tone="yellow"
                  >
                    Write review
                  </ActionButton>
                )}

                {canCancel && (
                  <ActionButton
                    onClick={cancelBooking}
                    disabled={cancelling}
                    icon={<XCircle size={17} />}
                    tone="red"
                  >
                    {cancelling ? "Cancelling..." : "Cancel booking"}
                  </ActionButton>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-[#3b71e6] p-6 text-white">
              <ReceiptText className="mb-3" />
              <h3 className="text-lg font-semibold">Need help?</h3>
              <p className="mt-2 text-sm leading-6 text-white/90">
                Contact your host or support for booking changes, cancellations,
                and payment questions.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-5">
      <div className="mb-3 text-[#3b71e6]">{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-1 text-sm font-semibold text-gray-950">{value}</h3>
    </div>
  );
}

function SimpleInfo({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="mt-1 text-sm font-semibold capitalize text-gray-950">
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

function ActionButton({ children, icon, onClick, disabled, tone = "default" }) {
  const styles = {
    default: "border-gray-200 text-gray-800 hover:bg-gray-50",
    red: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const style =
    normalized === "cancelled"
      ? "border-red-200 bg-red-50 text-red-700"
      : normalized === "completed"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : normalized === "pending"
      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
      : "border-green-200 bg-green-50 text-green-700";

  return (
    <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${style}`}>
      {status || "Confirmed"}
    </span>
  );
}

function Timeline({ status }) {
  const normalized = String(status || "").toLowerCase();

  const steps = [
    { label: "Booking created", active: true },
    {
      label: "Payment recorded",
      active: ["pending", "confirmed", "completed"].includes(normalized),
    },
    {
      label: "Host confirmed",
      active: ["confirmed", "completed"].includes(normalized),
    },
    {
      label: "Stay completed",
      active: normalized === "completed",
    },
  ];

  if (normalized === "cancelled") {
    steps.push({
      label: "Booking cancelled",
      active: true,
      cancelled: true,
    });
  }

  return (
    <div className="space-y-5">
      {steps.map((step, index) => (
        <div key={step.label} className="flex gap-4">
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
            <h4 className="text-sm font-semibold">{step.label}</h4>
            <p className="text-sm text-gray-500">
              {step.active ? "Completed" : "Pending"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TripDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 md:px-8">
        <div className="mb-8 h-12 w-72 animate-pulse rounded-2xl bg-gray-100" />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="h-[430px] animate-pulse rounded-3xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
          </div>

          <div className="h-96 animate-pulse rounded-3xl bg-gray-100" />
        </div>
      </main>
    </div>
  );
}