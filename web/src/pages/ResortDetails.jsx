import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AirVent,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Share,
  Star,
  Tv,
  Utensils,
  Waves,
  Wifi,
  X,
  Images,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const fallbackImage =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const todayISO = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const addDaysISO = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const formatDateLabel = (dateString) => {
  if (!dateString) return "Add date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
};

const formatINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function ResortDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const today = useMemo(() => todayISO(), []);
  const tomorrow = useMemo(() => addDaysISO(today, 1), [today]);

  const guestDropdownRef = useRef(null);

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);

  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);
  const [guests, setGuests] = useState(1);

  useEffect(() => {
    loadProperty();
  }, [id]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        guestDropdownRef.current &&
        !guestDropdownRef.current.contains(event.target)
      ) {
        setGuestDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (checkout <= checkin) {
      setCheckout(addDaysISO(checkin, 1));
    }
  }, [checkin, checkout]);

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

  const galleryImages = useMemo(() => {
    if (!property) return [fallbackImage];

    const images = [
      property.image,
      ...(property.images || []).map((item) => item.image_url),
    ].filter(Boolean);

    const uniqueImages = [...new Set(images)];

    return uniqueImages.length ? uniqueImages : [fallbackImage];
  }, [property]);

  const price = Number(property?.price || 0);
  const maxGuests = Number(property?.guests || 10);

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

  const dateError = !checkin || !checkout || checkout <= checkin;

  const isLoggedIn = () => {
    try {
      const user =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      return Boolean(user && token);
    } catch {
      return false;
    }
  };

  const handleReserve = () => {
    if (dateError) {
      alert("Please select valid check-in and checkout dates.");
      return;
    }

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
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");

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

    try {
      if (navigator.share) {
        await navigator.share({
          title: property?.title || "Dovail Stay",
          text: property?.description || "Check this stay",
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      alert("Link copied");
    } catch (err) {
      console.log("Share failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="h-8 w-64 animate-pulse rounded-xl bg-gray-100" />
          <div className="mt-8 h-[430px] animate-pulse rounded-[28px] bg-gray-100" />
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
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {property.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Star size={16} fill="black" />
              <span className="font-semibold">{property.rating || "5.0"}</span>
              <span>·</span>
              <span className="font-semibold underline">Guest favorite</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-gray-600">
                <MapPin size={15} />
                {property.location}
              </span>
            </div>
          </div>

          <div className="flex gap-2 text-sm font-semibold">
            <button
              type="button"
              onClick={shareProperty}
              className="flex items-center gap-2 rounded-xl px-4 py-2 hover:bg-gray-100"
            >
              <Share size={16} />
              Share
            </button>

            <button
              type="button"
              onClick={handleWishlist}
              className="flex items-center gap-2 rounded-xl px-4 py-2 hover:bg-gray-100"
            >
              <Heart size={16} />
              Save
            </button>
          </div>
        </div>

        <PropertyGallery
          images={galleryImages}
          title={property.title}
          onShowAll={() => setGalleryOpen(true)}
        />

        <section className="mt-10 grid gap-12 lg:grid-cols-[1fr_390px]">
          <div>
            <div className="border-b pb-8">
              <h2 className="text-2xl font-bold">
                Entire place in {String(property.location || "").split(",")[0]}
              </h2>

              <p className="mt-2 text-gray-600">
                {property.guests || 1} guests · {property.bedrooms || 1} bedroom
                · {property.bathrooms || 1} bath
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
                text="Your booking is protected by Dovail Stay secure reservation system."
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
            <div className="sticky top-24 rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_6px_24px_rgba(0,0,0,0.14)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold">{formatINR(price)}</span>
                  <span className="text-gray-500"> / night</span>
                </div>

                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Star size={14} fill="black" />
                  {property.rating || "5.0"}
                </span>
              </div>

              <div className="rounded-2xl border border-[#b0b0b0] bg-white">
                <div className="grid grid-cols-2">
                  <DateField
                    label="CHECK-IN"
                    value={checkin}
                    min={today}
                    onChange={(value) => setCheckin(value)}
                  />

                  <DateField
                    label="CHECKOUT"
                    value={checkout}
                    min={addDaysISO(checkin, 1)}
                    onChange={(value) => setCheckout(value)}
                    borderLeft
                  />
                </div>

                <GuestDropdown
                  refEl={guestDropdownRef}
                  open={guestDropdownOpen}
                  setOpen={setGuestDropdownOpen}
                  guests={guests}
                  setGuests={setGuests}
                  maxGuests={maxGuests}
                />
              </div>

              {dateError && (
                <p className="mt-3 text-sm font-semibold text-red-600">
                  Checkout date must be after check-in date.
                </p>
              )}

              <button
                type="button"
                onClick={handleReserve}
                disabled={dateError}
                className="mt-5 h-14 w-full rounded-xl bg-[#8363F5] text-lg font-semibold text-white shadow-lg transition hover:bg-[#7152E8] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Reserve
              </button>

              <button
                type="button"
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
                  label={`${formatINR(price)} x ${nights} ${
                    nights === 1 ? "night" : "nights"
                  }`}
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

      {galleryOpen && (
        <GalleryModal
          images={galleryImages}
          title={property.title}
          onClose={() => setGalleryOpen(false)}
        />
      )}

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

function DateField({ label, value, min, onChange, borderLeft }) {
  return (
    <label
      className={`group block cursor-pointer px-4 py-3 hover:bg-gray-50 ${
        borderLeft ? "border-l border-[#b0b0b0]" : ""
      }`}
    >
      <span className="block text-[10px] font-black uppercase tracking-wide">
        {label}
      </span>

      <div className="mt-1 flex items-center gap-2">
        <CalendarDays size={16} className="text-gray-600" />

        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer bg-transparent text-sm font-semibold outline-none"
        />
      </div>

      <p className="mt-1 text-xs text-gray-500">{formatDateLabel(value)}</p>
    </label>
  );
}

function GuestDropdown({
  refEl,
  open,
  setOpen,
  guests,
  setGuests,
  maxGuests,
}) {
  const decreaseGuests = () => setGuests((prev) => Math.max(1, prev - 1));
  const increaseGuests = () =>
    setGuests((prev) => Math.min(Number(maxGuests || 10), prev + 1));

  return (
    <div ref={refEl} className="relative border-t border-[#b0b0b0]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div>
          <span className="block text-[10px] font-black uppercase tracking-wide">
            Guests
          </span>
          <span className="mt-1 block text-sm font-semibold">
            {guests} {guests === 1 ? "guest" : "guests"}
          </span>
        </div>

        <ChevronDown
          size={20}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[72px] z-50 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">Guests</p>
              <p className="text-sm text-gray-500">Ages 13 or above</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={decreaseGuests}
                disabled={guests <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus size={16} />
              </button>

              <span className="w-5 text-center font-semibold">{guests}</span>

              <button
                type="button"
                onClick={increaseGuests}
                disabled={guests >= Number(maxGuests || 10)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8363F5] py-3 font-bold text-white hover:bg-[#7152E8]"
          >
            <Check size={18} />
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function PropertyGallery({ images, title, onShowAll }) {
  const photos = images.length ? images : [fallbackImage];

  return (
    <div className="relative overflow-hidden rounded-[28px]">
      <div className="grid h-[430px] grid-cols-1 gap-2 md:grid-cols-4">
        <button
          type="button"
          onClick={onShowAll}
          className="group col-span-1 overflow-hidden md:col-span-2 md:row-span-2"
        >
          <img
            src={photos[0]}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:brightness-90"
          />
        </button>

        {photos.slice(1, 5).map((src, index) => (
          <button
            type="button"
            key={src + index}
            onClick={onShowAll}
            className="group hidden overflow-hidden md:block"
          >
            <img
              src={src}
              alt={`${title} ${index + 2}`}
              className="h-full w-full object-cover transition duration-300 group-hover:brightness-90"
            />
          </button>
        ))}

        {Array.from({ length: Math.max(0, 5 - photos.length) }).map(
          (_, index) => (
            <div
              key={`placeholder-${index}`}
              className="hidden bg-gray-100 md:block"
            />
          )
        )}
      </div>

      <button
        type="button"
        onClick={onShowAll}
        className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-black bg-white px-5 py-3 text-sm font-bold shadow-lg hover:bg-gray-100"
      >
        <Images size={18} />
        Show all photos
      </button>
    </div>
  );
}

function GalleryModal({ images, title, onClose }) {
  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-white px-6">
        <button onClick={onClose} className="rounded-full p-3 hover:bg-gray-100">
          <X size={22} />
        </button>

        <h2 className="text-lg font-bold">{title}</h2>

        <div className="w-10" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {images.map((src, index) => (
            <img
              key={src + index}
              src={src}
              alt={`${title} ${index + 1}`}
              className={`w-full rounded-2xl object-cover ${
                index === 0 ? "md:col-span-2 max-h-[650px]" : "h-[360px]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginRequiredModal({ onClose, onLogin, onSignup }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
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
            type="button"
            onClick={onLogin}
            className="h-12 w-full rounded-xl bg-[#8363F5] font-semibold text-white hover:bg-[#7152E8]"
          >
            Log in
          </button>

          <button
            type="button"
            onClick={onSignup}
            className="h-12 w-full rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
          >
            Create account
          </button>

          <button
            type="button"
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