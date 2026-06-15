import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AirVent,
  CalendarDays,
  Car,
  ChevronDown,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Share,
  Star,
  Tv,
  Utensils,
  Waves,
  Wifi,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

export default function ResortDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [checkin, setCheckin] = useState("2026-06-12");
  const [checkout, setCheckout] = useState("2026-06-14");
  const [guests, setGuests] = useState(1);

  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/properties/${id}`);
      setProperty(res.data);
    } catch (err) {
      console.log("Property load failed:", err);
      alert("Property failed to load");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const price = Number(property?.price || 0);
  const nights = useMemo(() => {
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkin, checkout]);

  const subtotal = price * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + serviceFee + taxes;

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const isLoggedIn = () => {
    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    return Boolean(user && token);
  };

  const handleReserve = () => {
    if (!isLoggedIn()) {
      setLoginModalOpen(true);
      return;
    }

    navigate("/checkout", {
      state: {
        property,
        guests,
        nights,
        checkin,
        checkout,
      },
    });
  };

  const handleMessageHost = () => {
    if (!isLoggedIn()) {
      setLoginModalOpen(true);
      return;
    }

    navigate("/messages");
  };

  const handleWishlist = async () => {
    if (!isLoggedIn()) {
      setLoginModalOpen(true);
      return;
    }

    try {
      const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      await api.post("/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });

      alert("Added to wishlist");
    } catch (err) {
      console.log("Wishlist failed:", err);
      alert(err.response?.data?.message || "Wishlist failed");
    }
  };

  const shareProperty = async () => {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: property?.title || "Servia Stay",
        text: property?.description || "Check this stay",
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    alert("Link copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading property...
        </main>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">
              {property.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Star size={16} fill="black" />
              <span className="font-semibold">
                {property.rating || "5.0"}
              </span>
              <span>·</span>
              <span className="font-semibold underline">Guest favorite</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-gray-600">
                <MapPin size={15} />
                {property.location}
              </span>
            </div>
          </div>

          <div className="flex gap-4 text-sm font-semibold">
            <button
              onClick={shareProperty}
              className="flex items-center gap-2 rounded-xl px-4 py-2 hover:bg-gray-100"
            >
              <Share size={16} />
              Share
            </button>

            <button
              onClick={handleWishlist}
              className="flex items-center gap-2 rounded-xl px-4 py-2 hover:bg-gray-100"
            >
              <Heart size={16} />
              Save
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px]">
          <img
            src={property.image}
            alt={property.title}
            className="h-[420px] w-full object-cover"
          />
        </div>

        <section className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="border-b pb-8">
              <h2 className="text-2xl font-bold">
                Entire place in {property.location}
              </h2>

              <p className="mt-2 text-gray-600">
                {property.guests || 1} guests · {property.bedrooms || 1} bedroom ·{" "}
                {property.bathrooms || 1} bath
              </p>
            </div>

            <div className="space-y-6 border-b py-8">
              <Feature
                icon="🏆"
                title="Guest favorite"
                text="One of the most loved homes based on ratings, reviews, and reliability."
              />

              <Feature
                icon="🧾"
                title="Free cancellation"
                text="Cancel before check-in according to the host cancellation policy."
              />

              <Feature
                icon="🔐"
                title="Secure booking"
                text="Your booking is protected by Servia Stay secure reservation system."
              />
            </div>

            <div className="border-b py-8">
              <h2 className="mb-4 text-2xl font-bold">About this place</h2>

              <p className="max-w-3xl whitespace-pre-line leading-8 text-gray-700">
                {property.description}
              </p>
            </div>

            <div className="border-b py-8">
              <h2 className="mb-6 text-2xl font-bold">
                What this place offers
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                <Amenity icon={<Wifi />} text="Wifi" />
                <Amenity icon={<Car />} text="Free parking" />
                <Amenity icon={<Utensils />} text="Kitchen" />
                <Amenity icon={<Waves />} text="Pool" />
                <Amenity icon={<AirVent />} text="Air conditioning" />
                <Amenity icon={<Tv />} text="TV" />
              </div>
            </div>

            <div className="border-b py-8">
              <h2 className="mb-6 text-2xl font-bold">Where you'll be</h2>

              <div className="flex h-80 items-center justify-center rounded-3xl bg-[#F4F1FF]">
                <div className="text-center">
                  <MapPin size={42} className="mx-auto mb-3 text-[#8363F5]" />
                  <h3 className="text-xl font-bold">{property.location}</h3>
                  <p className="mt-2 text-gray-500">
                    Google Maps integration can be added here.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside>
            <div className="sticky top-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold">
                    {formatINR(price)}
                  </span>
                  <span className="text-gray-500"> / night</span>
                </div>

                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Star size={14} fill="black" />
                  {property.rating || "5.0"}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-300">
                <div className="grid grid-cols-2">
                  <DateInput
                    label="CHECK-IN"
                    value={checkin}
                    onChange={setCheckin}
                  />

                  <DateInput
                    label="CHECKOUT"
                    value={checkout}
                    onChange={setCheckout}
                    borderLeft
                  />
                </div>

                <div className="border-t p-4">
                  <label className="block text-xs font-bold uppercase">
                    Guests
                  </label>

                  <div className="mt-2 flex items-center justify-between">
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full bg-white outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                        <option key={item} value={item}>
                          {item} {item === 1 ? "guest" : "guests"}
                        </option>
                      ))}
                    </select>

                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              <button
                onClick={handleReserve}
                className="mt-5 h-14 w-full rounded-xl bg-[#8363F5] text-lg font-semibold text-white shadow-lg transition hover:bg-[#7152E8]"
              >
                Reserve
              </button>

              <button
                onClick={handleMessageHost}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
              >
                <MessageCircle size={18} />
                Message Host
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                You won’t be charged yet
              </p>

              <div className="mt-6 space-y-3 text-sm">
                <PriceRow
                  label={`${formatINR(price)} x ${nights} nights`}
                  value={formatINR(subtotal)}
                />

                <PriceRow label="Service fee" value={formatINR(serviceFee)} />
                <PriceRow label="Taxes" value={formatINR(taxes)} />

                <div className="flex justify-between border-t pt-4 text-base font-bold">
                  <span>Total before payment</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <Footer />

      {loginModalOpen && (
        <LoginRequiredModal
          onClose={() => setLoginModalOpen(false)}
          onLogin={() => navigate("/login")}
          onSignup={() => navigate("/signup")}
        />
      )}
    </div>
  );
}

function LoginRequiredModal({ onClose, onLogin, onSignup }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#8363F5]">
          <Lock size={26} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          Log in to continue
        </h2>

        <p className="mt-3 leading-6 text-gray-500">
          Please log in or create an account to reserve this stay, message the
          host, or save it to your wishlist.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={onLogin}
            className="h-12 w-full rounded-xl bg-[#8363F5] font-semibold text-white hover:bg-[#7152E8]"
          >
            Log in
          </button>

          <button
            onClick={onSignup}
            className="h-12 w-full rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
          >
            Create account
          </button>

          <button
            onClick={onClose}
            className="h-12 w-full rounded-xl text-gray-500 hover:bg-gray-50"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}

function DateInput({ label, value, onChange, borderLeft }) {
  return (
    <label className={`block p-4 ${borderLeft ? "border-l" : ""}`}>
      <span className="block text-xs font-bold uppercase">{label}</span>

      <div className="mt-2 flex items-center gap-2">
        <CalendarDays size={16} />

        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white text-sm outline-none"
        />
      </div>
    </label>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="text-2xl">{icon}</div>

      <div>
        <h4 className="font-bold">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function Amenity({ icon, text }) {
  return (
    <div className="flex items-center gap-4 text-gray-800">
      {icon}
      <span className="font-medium">{text}</span>
    </div>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="underline">{label}</span>
      <span>{value}</span>
    </div>
  );
}