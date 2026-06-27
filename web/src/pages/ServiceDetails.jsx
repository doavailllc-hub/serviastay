import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import api from "../api/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const SERVICES = [
  {
    id: 1,
    title: "Airport pickup",
    category: "Transport",
    location: "Riyadh",
    price: 45,
    rating: "4.92",
    reviews: 88,
    provider: "Riyadh Premium Cars",
    duration: "One-way transfer",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=80",
    description:
      "Reliable airport pickup with professional drivers, clean vehicles, and direct transfer to your stay.",
    includes: [
      "Airport meet & greet",
      "Luggage assistance",
      "Private car",
      "Direct drop-off",
    ],
  },
  {
    id: 2,
    title: "Private chef",
    category: "Food",
    location: "At your stay",
    price: 120,
    rating: "4.98",
    reviews: 62,
    provider: "Chef Omar",
    duration: "Dinner service",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=80",
    description:
      "Enjoy a private dining experience prepared at your stay by a professional chef.",
    includes: [
      "Menu planning",
      "Fresh ingredients",
      "Cooking at your stay",
      "Kitchen cleanup",
    ],
  },
  {
    id: 3,
    title: "House cleaning",
    category: "Cleaning",
    location: "Riyadh",
    price: 35,
    rating: "4.89",
    reviews: 109,
    provider: "Sparkle Home Care",
    duration: "2 hours",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80",
    description:
      "Professional cleaning service for your stay, ideal before check-in, during long stays, or before checkout.",
    includes: [
      "General cleaning",
      "Bathroom cleaning",
      "Kitchen cleaning",
      "Basic supplies",
    ],
  },
];

export default function ServiceDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const service = SERVICES.find((item) => Number(item.id) === Number(id));

  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => {
    return Number(service?.price || 0) * Number(guests || 1);
  }, [service, guests]);

  const formatUSD = (amount) => `$${Number(amount || 0).toLocaleString()}`;

  const getUser = () => {
    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!user || !token) {
      alert("Please login first");
      navigate("/");
      return null;
    }

    return user;
  };

  const bookService = async () => {
    if (!date) {
      alert("Please select service date");
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("Please select today or a future date");
      return;
    }

    const user = getUser();
    if (!user || !service) return;

    try {
      setSaving(true);

      await api.post("/service-bookings", {
        user_id: user.id,
        service_id: service.id,
        service_title: service.title,
        provider: service.provider,
        service_date: date,
        people: guests,
        total,
      });

      alert("Service booked successfully");
      navigate("/trips");
    } catch (err) {
      console.log("Service booking failed:", err);
      alert(err.response?.data?.message || "Service booking failed");
    } finally {
      setSaving(false);
    }
  };

  if (!service) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <button
            onClick={() => navigate("/services")}
            className="mb-6 flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold"
          >
            <ArrowLeft size={18} />
            Back to services
          </button>

          <h1 className="text-3xl font-bold">Service not found</h1>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <button
          onClick={() => navigate("/services")}
          className="mb-6 flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
          Back to services
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold md:text-4xl">
            {service.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Star size={16} fill="black" />
            <span className="font-semibold">{service.rating}</span>
            <span>·</span>
            <span className="font-semibold underline">
              {service.reviews} reviews
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-gray-600">
              <MapPin size={15} />
              {service.location}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px]">
          <img
            src={service.image}
            alt={service.title}
            className="h-[420px] w-full object-cover"
          />
        </div>

        <section className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="border-b pb-8">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <h2 className="text-2xl font-bold">
                    Service by {service.provider}
                  </h2>

                  <p className="mt-2 text-gray-600">
                    {service.category} · {service.duration}
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3b71e6] text-xl font-bold text-white">
                  {service.provider.charAt(0)}
                </div>
              </div>
            </div>

            <div className="space-y-6 border-b py-8">
              <Feature
                icon={<ShieldCheck />}
                title="Trusted provider"
                text="This service provider is reviewed by guests."
              />

              <Feature
                icon={<Clock />}
                title="Easy scheduling"
                text="Choose your preferred date and book instantly."
              />

              <Feature
                icon={<MessageCircle />}
                title="Support available"
                text="Contact support if your service needs changes."
              />
            </div>

            <div className="border-b py-8">
              <h2 className="mb-4 text-2xl font-bold">
                About this service
              </h2>

              <p className="max-w-3xl leading-8 text-gray-700">
                {service.description}
              </p>
            </div>

            <div className="border-b py-8">
              <h2 className="mb-6 text-2xl font-bold">
                What’s included
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                {service.includes.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-8">
              <h2 className="mb-6 text-2xl font-bold">Guest reviews</h2>

              <div className="grid gap-5 md:grid-cols-2">
                <Review
                  name="Aisha"
                  text="Very professional and easy to book."
                />

                <Review
                  name="Mohammed"
                  text="Great service and smooth experience."
                />
              </div>
            </div>
          </div>

          <aside>
            <div className="sticky top-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold">
                    {formatUSD(service.price)}
                  </span>

                  <span className="text-gray-500"> / person</span>
                </div>

                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Star size={14} fill="black" />
                  {service.rating}
                </span>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase">
                    Date
                  </span>

                  <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-300 px-4">
                    <CalendarDays size={18} />

                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="flex-1 bg-white outline-none"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase">
                    People
                  </span>

                  <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-300 px-4">
                    <Users size={18} />

                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="flex-1 bg-white outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map((item) => (
                        <option key={item} value={item}>
                          {item} {item === 1 ? "person" : "people"}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <button
                onClick={bookService}
                disabled={saving}
                className="mt-6 h-14 w-full rounded-xl bg-[#3b71e6] text-lg font-semibold text-white shadow-lg transition hover:bg-[#7152E8] disabled:opacity-60"
              >
                {saving ? "Booking..." : "Book service"}
              </button>

              <button
                type="button"
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
              >
                <Heart size={18} />
                Save service
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                You won’t be charged yet
              </p>

              <div className="mt-6 space-y-3 text-sm">
                <PriceRow
                  label={`${formatUSD(service.price)} x ${guests} ${
                    guests === 1 ? "person" : "people"
                  }`}
                  value={formatUSD(total)}
                />

                <div className="flex justify-between border-t pt-4 text-base font-bold">
                  <span>Total</span>
                  <span>{formatUSD(total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-4">
      <span className="text-[#3b71e6]">{icon}</span>

      <div>
        <h4 className="font-semibold">{title}</h4>

        <p className="mt-1 text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function Review({ name, text }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-5">
      <div className="mb-2 font-bold">{name}</div>
      <div className="mb-3 text-sm">★★★★★</div>
      <p className="text-gray-700">{text}</p>
    </div>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}