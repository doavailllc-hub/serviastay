import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Home,
  MapPin,
  ReceiptText,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const BRAND = "#7E4FF5";

export default function ExperienceBookingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  const { bookingId, experience, selectedDate, guests, total } =
    location.state || {};

  const travelers = Number(guests || 1);

  const image =
    experience?.images?.[0]?.image_url ||
    experience?.image ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

  const days = Number(experience?.package_days || 1);
  const nights = Number(experience?.package_nights || Math.max(days - 1, 0));

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-14 md:px-8">
        <div className="rounded-[36px] border border-gray-200 bg-white p-6 text-center shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F3EFFF]">
            <CheckCircle2 size={44} className="text-[#7E4FF5]" />
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
            Trip package booked successfully
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            Your trip package has been confirmed. You&apos;ll receive your
            itinerary, pickup details, hotel confirmation and travel
            instructions before your departure.
          </p>

          <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[28px] border border-gray-200 text-left">
            <div className="grid gap-0 md:grid-cols-[260px_1fr]">
              <img
                src={image}
                alt={experience?.title || "Trip Package"}
                className="h-64 w-full object-cover md:h-full"
              />

              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  Booking #{bookingId || "Confirmed"}
                </p>

                <h2 className="mt-2 text-2xl font-black text-gray-900">
                  {experience?.title || "Dovail Stay Trip Package"}
                </h2>

                <p className="mt-3 flex items-center gap-2 text-gray-500">
                  <MapPin size={17} />
                  {experience?.location || experience?.city || "Location"}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoBox
                    icon={<CalendarDays size={18} />}
                    label="Date"
                    value={selectedDate || "Selected date"}
                  />

                  <InfoBox
                    icon={<CalendarDays size={18} />}
                    label="Duration"
                    value={`${days} Days / ${nights} Nights`}
                  />

                  <InfoBox
                    icon={<Users size={18} />}
                    label="Travelers"
                    value={`${travelers} traveler${travelers > 1 ? "s" : ""}`}
                  />

                  <InfoBox
                    icon={<ReceiptText size={18} />}
                    label="Total"
                    value={`₹${Number(total || 0).toLocaleString("en-IN")}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-[#E8E0FF] bg-[#F7F5FF] p-6 text-left">
            <h3 className="text-lg font-black text-gray-900">What&apos;s next?</h3>

            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li>✓ Host confirmation will be sent shortly.</li>
              <li>✓ Pickup instructions will be shared before departure.</li>
              <li>
                ✓ Hotel and itinerary details will appear in your package
                bookings.
              </li>
              <li>✓ Contact Dovail Stay support anytime if you need help.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/experiences")}
              className="rounded-full border border-gray-300 px-6 py-3 font-bold text-gray-900 transition hover:border-gray-900"
            >
              Explore more packages
            </button>

            <button
              onClick={() => navigate("/experience-bookings")}
              className="flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold text-white transition hover:scale-[1.02]"
              style={{ backgroundColor: BRAND }}
            >
              <Home size={18} />
              View my package bookings
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-2 text-[#7E4FF5]">{icon}</div>

      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}