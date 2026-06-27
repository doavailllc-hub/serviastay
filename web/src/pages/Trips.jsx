import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Download,
  Eye,
  MapPin,
  ReceiptText,
  RefreshCw,
  Users,
} from "lucide-react";

import api from "../api/api";
import Navbar from "../components/Navbar";

export default function Trips() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadTrips = async () => {
    try {
      setLoading(true);

      const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/bookings/${user.id}`);
      setTrips(res.data || []);
    } catch (err) {
      console.log("Trips load failed:", err);
      alert("Trips failed to load");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (trip) => {
    const invoiceWindow = window.open("", "_blank");
invoiceWindow.document.write(`
<html>
<head>
<title>Invoice #${trip.id}</title>
<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
  font-family:Inter,Arial,sans-serif;
}

body{
  background:#f8fafc;
  padding:40px;
  color:#111827;
}

.invoice{
  max-width:1000px;
  margin:auto;
  background:#fff;
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 10px 30px rgba(0,0,0,.08);
}

.header{
  background:linear-gradient(135deg,#8762f3,#6d4df0);
  color:#fff;
  padding:35px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.logo{
  font-size:38px;
  font-weight:800;
}

.subtitle{
  margin-top:6px;
  opacity:.9;
}

.invoiceNo{
  text-align:right;
}

.section{
  padding:30px;
}

.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:30px;
}

.card{
  border:1px solid #eee;
  border-radius:16px;
  padding:20px;
}

.title{
  font-size:14px;
  color:#8762f3;
  font-weight:700;
  margin-bottom:15px;
  text-transform:uppercase;
}

.property{
  display:flex;
  gap:20px;
  align-items:center;
}

.property img{
  width:180px;
  height:120px;
  object-fit:cover;
  border-radius:12px;
}

.propertyName{
  font-size:28px;
  font-weight:700;
}

.row{
  display:flex;
  justify-content:space-between;
  padding:12px 0;
  border-bottom:1px solid #eee;
}

.total{
  font-size:34px;
  font-weight:800;
  color:#8762f3;
}

.footer{
  background:#faf5ff;
  padding:25px;
  text-align:center;
}

.badge{
  display:inline-block;
  background:#dcfce7;
  color:#166534;
  padding:6px 12px;
  border-radius:999px;
  font-size:13px;
  font-weight:600;
}
</style>
</head>

<body>

<div class="invoice">

<div class="header">
  <div>
    <div class="logo">Servia Stay</div>
    <div class="subtitle">Stay Comfortable, Live Beautiful</div>
  </div>

  <div class="invoiceNo">
    <h1>INVOICE</h1>
    <p>#${trip.id}</p>
  </div>
</div>

<div class="section">

<div class="grid">

<div class="card">
  <div class="title">Guest Details</div>
  <p><strong>${trip.guest_name || "Guest"}</strong></p>
</div>

<div class="card">
  <div class="title">Booking Info</div>
  <p>Invoice #${trip.id}</p>
  <p>${new Date().toLocaleDateString()}</p>
</div>

</div>

<br>

<div class="card property">

<img src="${trip.image}" />

<div>
  <div class="propertyName">${trip.property_title}</div>
  <p>${trip.location}</p>
  <br>
  <span class="badge">Confirmed</span>
</div>

</div>

<br>

<div class="card">

<div class="title">Reservation Details</div>

<div class="row">
  <span>Check In</span>
  <strong>${trip.check_in}</strong>
</div>

<div class="row">
  <span>Check Out</span>
  <strong>${trip.check_out}</strong>
</div>

<div class="row">
  <span>Guests</span>
  <strong>${trip.guests}</strong>
</div>

<div class="row">
  <span>Payment Method</span>
  <strong>${trip.payment_method}</strong>
</div>

</div>

<br>

<div class="card">

<div class="title">Payment Summary</div>

<div class="row">
  <span>Booking Amount</span>
  <strong>₹${trip.total_amount}</strong>
</div>

<br>

<div style="display:flex;justify-content:space-between;align-items:center">
  <span style="font-size:22px;font-weight:700">Total Paid</span>
  <span class="total">₹${trip.total_amount}</span>
</div>

</div>

</div>

<div class="footer">
  <h3>Thank you for booking with Servia Stay</h3>
  <p>We hope you have a comfortable and memorable stay.</p>
</div>

</div>

<script>
setTimeout(()=>window.print(),500);
</script>

</body>
</html>
`);

    invoiceWindow.document.close();
  };

  const upcomingTrips = trips.filter(
    (trip) => trip.status !== "Cancelled" && trip.status !== "Completed"
  );

  const pastTrips = trips.filter(
    (trip) => trip.status === "Cancelled" || trip.status === "Completed"
  );

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Trips</h1>

            <p className="mt-2 text-gray-500">
              View your upcoming stays, past reservations, receipts, and booking details.
            </p>
          </div>

          <button
            onClick={loadTrips}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-500">
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <EmptyTrips navigate={navigate} />
        ) : (
          <div className="space-y-10">
            <TripSection
              title="Upcoming Trips"
              trips={upcomingTrips}
              navigate={navigate}
              formatINR={formatINR}
              downloadInvoice={downloadInvoice}
            />

            <TripSection
              title="Past Trips"
              trips={pastTrips}
              navigate={navigate}
              formatINR={formatINR}
              downloadInvoice={downloadInvoice}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function TripSection({ title, trips, navigate, formatINR, downloadInvoice }) {
  return (
    <section>
      <h2 className="mb-5 text-2xl font-bold text-gray-900">{title}</h2>

      {trips.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-8 text-gray-500">
          No {title.toLowerCase()}.
        </div>
      ) : (
        <div className="space-y-6">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              navigate={navigate}
              formatINR={formatINR}
              downloadInvoice={downloadInvoice}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TripCard({ trip, navigate, formatINR, downloadInvoice }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg">
      <div className="flex flex-col md:flex-row">
        <img
          src={
            trip.image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
          }
          alt={trip.title}
          className="h-60 w-full object-cover md:h-auto md:w-72"
        />

        <div className="flex flex-1 flex-col justify-between p-6">
          <div>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {trip.title || "Property Booking"}
                </h3>

                <p className="mt-2 flex items-center gap-2 text-gray-500">
                  <MapPin size={17} />
                  {trip.location || "Location unavailable"}
                </p>
              </div>

              <StatusBadge status={trip.status || "Confirmed"} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoPill
                icon={<CalendarDays size={18} />}
                label="Dates"
                value={`${trip.checkin} - ${trip.checkout}`}
              />

              <InfoPill
                icon={<Users size={18} />}
                label="Guests"
                value={`${trip.guests || 1} ${
                  trip.guests > 1 ? "guests" : "guest"
                }`}
              />

              <InfoPill
                icon={<ReceiptText size={18} />}
                label="Payment"
                value={trip.payment_method || "cash"}
                capitalize
              />
            </div>

            <p className="mt-5 text-lg font-bold text-[#3b71e6]">
              Total Paid: {formatINR(trip.total)}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="flex items-center gap-2 rounded-xl bg-[#3b71e6] px-6 py-3 font-semibold text-white transition hover:bg-[#7152E8]"
            >
              <Eye size={18} />
              View Details
            </button>

            <button
          onClick={() => downloadInvoice(trip)}
              className="flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 font-semibold transition hover:bg-gray-50"
            >
              <Download size={18} />
              Download Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ icon, label, value, capitalize }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-4">
      <div className="mb-2 flex items-center gap-2 text-[#3b71e6]">
        {icon}
        <span className="text-xs font-bold uppercase text-gray-500">
          {label}
        </span>
      </div>

      <p
        className={`text-sm font-semibold text-gray-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
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
    <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${style}`}>
      {status}
    </span>
  );
}

function EmptyTrips({ navigate }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-14 text-center">
      <div className="mb-4 text-6xl">🧳</div>

      <h2 className="text-2xl font-bold text-gray-900">No trips yet</h2>

      <p className="mt-2 text-gray-500">
        Your bookings will appear here once you reserve a stay.
      </p>

      <button
        onClick={() => navigate("/home")}
        className="mt-6 rounded-xl bg-[#3b71e6] px-6 py-3 font-semibold text-white hover:bg-[#7152E8]"
      >
        Explore stays
      </button>
    </div>
  );
}