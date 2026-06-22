import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AirVent,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  Heart,
  Images,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Share,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  Utensils,
  Waves,
  Wifi,
  X,
  ChevronLeft,
  ChevronRight,
  Keyboard,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND_COLOR = "#7e4ff5";
const BRAND_HOVER = "#6f43e4";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toLocalISO(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function addDaysISO(dateString, days) {
  const date = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

function formatDateLabel(dateString) {
  if (!dateString) return "Add date";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getStoredUser() {
  try {
    const user =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(sessionStorage.getItem("user") || "null");

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    return user && token ? user : null;
  } catch {
    return null;
  }
}

export default function ResortDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const guestDropdownRef = useRef(null);

  const today = useMemo(() => toLocalISO(), []);
  const tomorrow = useMemo(() => addDaysISO(today, 1), [today]);

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);

  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);
  const [guests, setGuests] = useState(1);

  const loadProperty = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(`/properties/${id}`);
      setProperty(data);
    } catch (err) {
      console.error("Property load failed:", err);
      setError(err?.response?.data?.message || "This stay could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) {
        setGuestDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!checkin) return;
    if (!checkout || checkout <= checkin) {
      setCheckout(addDaysISO(checkin, 1));
    }
  }, [checkin, checkout]);

  const galleryImages = useMemo(() => {
    const images = [
      property?.image,
      ...(property?.images || []).map((item) => item?.image_url || item?.url || item),
    ].filter(Boolean);

    const uniqueImages = [...new Set(images)];
    return uniqueImages.length ? uniqueImages : [FALLBACK_IMAGE];
  }, [property]);

  const price = safeNumber(property?.price, 0);
  const rating = property?.rating || "5.0";
  const maxGuests = Math.max(1, safeNumber(property?.guests, 10));

  const nights = useMemo(() => {
    const start = new Date(`${checkin}T00:00:00`);
    const end = new Date(`${checkout}T00:00:00`);
    const diff = Math.round((end - start) / MS_PER_DAY);
    return diff > 0 ? diff : 1;
  }, [checkin, checkout]);

  const subtotal = price * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + serviceFee + taxes;
  const dateError = !checkin || !checkout || checkout <= checkin;

  const openLoginModal = () => setLoginModalOpen(true);

  const handleReserve = () => {
    if (dateError) return;

    if (!getStoredUser()) {
      openLoginModal();
      return;
    }

    navigate("/checkout", {
      state: {
        property,
        checkin,
        checkout,
        guests,
        nights,
        subtotal,
        serviceFee,
        taxes,
        total,
      },
    });
  };

  const handleMessageHost = () => {
    if (!getStoredUser()) {
      openLoginModal();
      return;
    }

    navigate("/messages", { state: { property } });
  };

  const handleWishlist = async () => {
    const user = getStoredUser();
    if (!user) {
      openLoginModal();
      return;
    }

    try {
      await api.post("/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });
      alert("Added to wishlist");
    } catch (err) {
      console.error("Wishlist failed:", err);
      alert(err?.response?.data?.message || "Wishlist failed");
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
      console.error("Share failed:", err);
    }
  };

  if (loading) return <ReservePageSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-white text-[#222]">
        <Navbar />
        <main className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 md:px-8">
          <div className="max-w-md rounded-[28px] border border-gray-200 p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Stay not available</h1>
            <p className="mt-3 text-gray-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-xl px-6 py-3 font-bold text-white"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              Back to home
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!property) return null;

  const city = String(property.location || "this location").split(",")[0];

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 md:px-8 lg:pt-8">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-4xl text-2xl font-semibold tracking-tight md:text-[32px] md:leading-tight">
              {property.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star size={15} fill="currentColor" />
                {rating}
              </span>
              <span>·</span>
              <button type="button" className="font-semibold underline underline-offset-2">
                Guest favorite
              </button>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-gray-700">
                <MapPin size={15} />
                {property.location || "Location not specified"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold">
            <ActionButton icon={<Share size={16} />} label="Share" onClick={shareProperty} />
            <ActionButton icon={<Heart size={16} />} label="Save" onClick={handleWishlist} />
          </div>
        </header>

        <PropertyGallery images={galleryImages} title={property.title} onShowAll={() => setGalleryOpen(true)} />

        <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16">
          <article className="min-w-0">
            <section className="border-b border-gray-200 pb-7">
              <h2 className="text-[22px] font-semibold md:text-2xl">Entire place in {city}</h2>
              <p className="mt-2 text-gray-600">
                {maxGuests} guests · {property.bedrooms || 1} bedroom{Number(property.bedrooms || 1) > 1 ? "s" : ""} · {property.bathrooms || 1} bath{Number(property.bathrooms || 1) > 1 ? "s" : ""}
              </p>
            </section>

            <section className="space-y-7 border-b border-gray-200 py-8">
              <Feature
                icon={<Sparkles size={24} />}
                title="Guest favorite"
                text="A highly loved stay with reliable service, clean spaces, and a smooth check-in experience."
              />
              <Feature
                icon={<CalendarDays size={24} />}
                title="Today’s date is selected"
                text={`Check-in starts from ${formatDateLabel(today)}. Checkout is automatically set to the next day.`}
              />
              <Feature
                icon={<ShieldCheck size={24} />}
                title="Secure reservation"
                text="Your reservation continues to checkout only after login, keeping booking details protected."
              />
            </section>

            <section className="border-b border-gray-200 py-8">
              <h2 className="mb-4 text-[22px] font-semibold md:text-2xl">About this place</h2>
              <p className="max-w-3xl whitespace-pre-line text-[16px] leading-8 text-gray-700">
                {property.description || "A comfortable, professionally managed stay with essential amenities and a smooth booking experience."}
              </p>
            </section>

            <section className="border-b border-gray-200 py-8">
              <h2 className="mb-6 text-[22px] font-semibold md:text-2xl">What this place offers</h2>
              <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                <Amenity icon={<Wifi />} text="Wifi" />
                <Amenity icon={<Car />} text="Free parking" />
                <Amenity icon={<Utensils />} text="Kitchen" />
                <Amenity icon={<Waves />} text="Pool" />
                <Amenity icon={<AirVent />} text="Air conditioning" />
                <Amenity icon={<Tv />} text="TV" />
              </div>
            </section>

            <section className="py-8">
              <h2 className="mb-6 text-[22px] font-semibold md:text-2xl">Where you’ll be</h2>
              <div className="flex h-80 items-center justify-center rounded-[28px] border border-[#e8e2ff] bg-gradient-to-br from-[#f7f4ff] to-white">
                <div className="px-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <MapPin size={34} style={{ color: BRAND_COLOR }} />
                  </div>
                  <h3 className="text-xl font-semibold">{property.location || "Location"}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">Map integration can be connected here when your backend has latitude and longitude.</p>
                </div>
              </div>
            </section>
          </article>

          <aside className="lg:pt-1">
            <ReservationCard
              price={price}
              rating={rating}
              today={today}
              checkin={checkin}
              checkout={checkout}
              setCheckin={setCheckin}
              setCheckout={setCheckout}
              guests={guests}
              setGuests={setGuests}
              maxGuests={maxGuests}
              nights={nights}
              subtotal={subtotal}
              serviceFee={serviceFee}
              taxes={taxes}
              total={total}
              dateError={dateError}
              guestDropdownRef={guestDropdownRef}
              guestDropdownOpen={guestDropdownOpen}
              setGuestDropdownOpen={setGuestDropdownOpen}
              onReserve={handleReserve}
              onMessageHost={handleMessageHost}
            />
          </aside>
        </section>
      </main>

      <Footer />

      {galleryOpen && <GalleryModal images={galleryImages} title={property.title} onClose={() => setGalleryOpen(false)} />}

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

function ReservationCard({
  price,
  rating,
  today,
  checkin,
  checkout,
  setCheckin,
  setCheckout,
  guests,
  setGuests,
  maxGuests,
  nights,
  subtotal,
  serviceFee,
  taxes,
  total,
  dateError,
  guestDropdownRef,
  guestDropdownOpen,
  setGuestDropdownOpen,
  onReserve,
  onMessageHost,
}) {
  return (
    <div className="sticky top-24 rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <span className="text-[22px] font-semibold">{formatINR(price)}</span>
          <span className="text-gray-500"> night</span>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold">
          <Star size={14} fill="currentColor" />
          {rating}
        </span>
      </div>

      <div className="overflow-visible rounded-2xl border border-[#b0b0b0] bg-white">
     <AirbnbDatePicker
  checkin={checkin}
  checkout={checkout}
  setCheckin={setCheckin}
  setCheckout={setCheckout}
  today={today}
/>

        <GuestDropdown
          refEl={guestDropdownRef}
          open={guestDropdownOpen}
          setOpen={setGuestDropdownOpen}
          guests={guests}
          setGuests={setGuests}
          maxGuests={maxGuests}
        />
      </div>

      {dateError && <p className="mt-3 text-sm font-semibold text-red-600">Checkout date must be after check-in.</p>}

      <button
        type="button"
        onClick={onReserve}
        disabled={dateError}
        className="mt-5 h-14 w-full rounded-xl text-base font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-gray-300"
        style={{ backgroundColor: dateError ? undefined : BRAND_COLOR }}
        onMouseEnter={(e) => {
          if (!dateError) e.currentTarget.style.backgroundColor = BRAND_HOVER;
        }}
        onMouseLeave={(e) => {
          if (!dateError) e.currentTarget.style.backgroundColor = BRAND_COLOR;
        }}
      >
        Reserve
      </button>

      <button
        type="button"
        onClick={onMessageHost}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 font-semibold transition hover:bg-gray-50"
      >
        <MessageCircle size={18} />
        Message Host
      </button>

      <p className="mt-4 text-center text-sm text-gray-500">You won’t be charged yet</p>

      <div className="mt-6 space-y-3 text-sm">
        <PriceRow label={`${formatINR(price)} × ${nights} ${nights === 1 ? "night" : "nights"}`} value={formatINR(subtotal)} />
        <PriceRow label="Service fee" value={formatINR(serviceFee)} />
        <PriceRow label="Taxes" value={formatINR(taxes)} />
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-base font-bold">
          <span>Total before payment</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>
    </div>
  );
}
function AirbnbDatePicker({ checkin, checkout, setCheckin, setCheckout, today }) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState("checkin");
  const [viewDate, setViewDate] = useState(new Date(`${checkin || today}T00:00:00`));
  const pickerRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${checkout}T00:00:00`) - new Date(`${checkin}T00:00:00`)) /
        MS_PER_DAY
    )
  );

  const handleDateClick = (date) => {
    const iso = toLocalISO(date);

    if (selecting === "checkin") {
      setCheckin(iso);

      if (!checkout || checkout <= iso) {
        setCheckout(addDaysISO(iso, 1));
      }

      setSelecting("checkout");
      return;
    }

    if (iso <= checkin) {
      setCheckin(iso);
      setCheckout(addDaysISO(iso, 1));
      setSelecting("checkout");
      return;
    }

    setCheckout(iso);
    setOpen(false);
    setSelecting("checkin");
  };

  const clearDates = () => {
    setCheckin(today);
    setCheckout(addDaysISO(today, 1));
    setSelecting("checkin");
  };

  return (
    <div ref={pickerRef} className="relative">
      <div className="grid grid-cols-2 border-b border-[#b0b0b0]">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSelecting("checkin");
          }}
          className={`px-4 py-3 text-left ${
            selecting === "checkin" && open ? "rounded-xl ring-2 ring-black" : ""
          }`}
        >
          <span className="block text-[10px] font-black uppercase">Check-in</span>
          <span className="mt-1 block text-sm font-semibold">
            {formatCalendarInput(checkin)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSelecting("checkout");
          }}
          className={`border-l border-[#b0b0b0] px-4 py-3 text-left ${
            selecting === "checkout" && open ? "rounded-xl ring-2 ring-black" : ""
          }`}
        >
          <span className="block text-[10px] font-black uppercase">Checkout</span>
          <span className="mt-1 block text-sm font-semibold">
            {formatCalendarInput(checkout)}
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute right-[-8px] top-[68px] z-[999] w-[660px] rounded-[22px] border border-gray-200 bg-white p-7 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold">{nights} nights</h3>
              <p className="mt-1 text-sm text-gray-500">
                {formatCalendarHeader(checkin)} - {formatCalendarHeader(checkout)}
              </p>
            </div>

            <div className="flex gap-2">
              <CalendarTopBox
                label="CHECK-IN"
                value={formatShortInput(checkin)}
                active={selecting === "checkin"}
                onClick={() => setSelecting("checkin")}
              />
              <CalendarTopBox
                label="CHECKOUT"
                value={formatShortInput(checkout)}
                active={selecting === "checkout"}
                onClick={() => setSelecting("checkout")}
              />
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                )
              }
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                )
              }
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <CalendarMonth
              date={viewDate}
              checkin={checkin}
              checkout={checkout}
              today={today}
              onDateClick={handleDateClick}
            />

            <CalendarMonth
              date={new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)}
              checkin={checkin}
              checkout={checkout}
              today={today}
              onDateClick={handleDateClick}
            />
          </div>

          <div className="mt-7 flex items-center justify-between">
            <button type="button" className="rounded-lg p-2 hover:bg-gray-100">
              <Keyboard size={20} />
            </button>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={clearDates}
                className="text-sm font-semibold underline"
              >
                Clear dates
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-[#222] px-6 py-3 text-sm font-bold text-white hover:bg-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function CalendarTopBox({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-36 rounded-xl border px-4 py-3 text-left ${
        active ? "border-black ring-1 ring-black" : "border-gray-300"
      }`}
    >
      <span className="block text-[10px] font-black uppercase">{label}</span>
      <span className="mt-1 block text-sm">{value}</span>
    </button>
  );
}

function CalendarMonth({ date, checkin, checkout, today, onDateClick }) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthName = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const blanks = Array.from({ length: startDay });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div>
      <h4 className="mb-5 text-center font-bold">{monthName}</h4>

      <div className="mb-3 grid grid-cols-7 text-center text-xs font-semibold text-gray-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={d + i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="h-11" />
        ))}

        {days.map((day) => {
          const currentDate = new Date(year, month, day);
          const iso = toLocalISO(currentDate);

          const disabled = iso < today;
          const isStart = iso === checkin;
          const isEnd = iso === checkout;
          const inRange = iso > checkin && iso < checkout;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onDateClick(currentDate)}
              className={`relative h-11 text-sm font-semibold transition ${
                disabled ? "cursor-not-allowed text-gray-300" : "hover:bg-gray-100"
              } ${inRange ? "bg-gray-100" : ""}`}
            >
              <span
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${
                  isStart || isEnd ? "bg-[#222] text-white" : ""
                } ${isToday && !isStart && !isEnd ? "border border-black" : ""}`}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}function formatCalendarInput(dateString) {
  if (!dateString) return "Add date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatShortInput(dateString) {
  if (!dateString) return "Add date";

  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function formatCalendarHeader(dateString) {
  if (!dateString) return "Add date";

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}
function DateField({
  label,
  value,
  min,
  onChange,
  borderLeft = false,
}) {
  return (
    <label
      className={`block px-4 py-3 hover:bg-gray-50 cursor-pointer ${
        borderLeft ? "border-l border-gray-300" : ""
      }`}
    >
      <span className="text-[10px] font-bold uppercase">
        {label}
      </span>

      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="
          mt-1
          w-full
          bg-transparent
          text-sm
          font-semibold
          outline-none
          appearance-none
        "
      />
    </label>
  );
}


function GuestDropdown({ refEl, open, setOpen, guests, setGuests, maxGuests }) {
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

  const totalGuests = guests + children;

  const updateGuestTotal = (nextAdults, nextChildren) => {
    setGuests(Math.max(1, Math.min(maxGuests, nextAdults)));
    setChildren(Math.max(0, Math.min(maxGuests - nextAdults, nextChildren)));
  };

  return (
    <div ref={refEl} className="relative border-t border-[#b0b0b0]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div>
          <span className="block text-[10px] font-black uppercase tracking-[0.08em]">
            Guests
          </span>
          <span className="mt-1 block text-sm font-semibold">
            {totalGuests} {totalGuests === 1 ? "guest" : "guests"}
            {infants > 0 ? `, ${infants} infant${infants > 1 ? "s" : ""}` : ""}
            {pets > 0 ? `, ${pets} pet${pets > 1 ? "s" : ""}` : ""}
          </span>
        </div>

        <ChevronDown
          size={20}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[72px] z-50 rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.20)]">
          <GuestRow
            title="Adults"
            subtitle="Ages 13 or above"
            value={guests}
            min={1}
            max={maxGuests - children}
            onChange={(value) => updateGuestTotal(value, children)}
          />

          <GuestRow
            title="Children"
            subtitle="Ages 2–12"
            value={children}
            min={0}
            max={maxGuests - guests}
            onChange={(value) => updateGuestTotal(guests, value)}
          />

          <GuestRow
            title="Infants"
            subtitle="Under 2"
            value={infants}
            min={0}
            max={5}
            onChange={setInfants}
          />

          <GuestRow
            title="Pets"
            subtitle="Bringing a service animal?"
            value={pets}
            min={0}
            max={3}
            onChange={setPets}
            last
          />

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-5 w-full rounded-xl bg-[#7e4ff5] py-3 font-bold text-white hover:bg-[#6f43e4]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function GuestRow({ title, subtitle, value, min, max, onChange, last }) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={`flex items-center justify-between py-4 ${
        last ? "" : "border-b border-gray-200"
      }`}
    >
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={decrease}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus size={16} />
        </button>

        <span className="w-5 text-center font-semibold">{value}</span>

        <button
          type="button"
          onClick={increase}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function GuestCounter({ title, subtitle, value, canDecrease, canIncrease, onDecrease, onIncrease }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <CounterButton label="Decrease guests" disabled={!canDecrease} onClick={onDecrease} icon={<Minus size={16} />} />
        <span className="w-5 text-center font-semibold">{value}</span>
        <CounterButton label="Increase guests" disabled={!canIncrease} onClick={onIncrease} icon={<Plus size={16} />} />
      </div>
    </div>
  );
}

function CounterButton({ label, disabled, onClick, icon }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-300"
    >
      {icon}
    </button>
  );
}

function PropertyGallery({ images, title, onShowAll }) {
  const photos = images.length ? images : [FALLBACK_IMAGE];

  return (
    <div className="relative overflow-hidden rounded-[24px] md:rounded-[28px]">
      <div className="grid h-[320px] grid-cols-1 gap-2 md:h-[430px] md:grid-cols-4">
        <GalleryImage src={photos[0]} alt={title} onClick={onShowAll} className="md:col-span-2 md:row-span-2" />

        {photos.slice(1, 5).map((src, index) => (
          <GalleryImage key={`${src}-${index}`} src={src} alt={`${title} ${index + 2}`} onClick={onShowAll} className="hidden md:block" />
        ))}

        {Array.from({ length: Math.max(0, 5 - photos.length) }).map((_, index) => (
          <div key={`placeholder-${index}`} className="hidden bg-gray-100 md:block" />
        ))}
      </div>

      <button
        type="button"
        onClick={onShowAll}
        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-bold shadow-lg transition hover:bg-gray-100 md:bottom-5 md:right-5"
      >
        <Images size={18} />
        Show all photos
      </button>
    </div>
  );
}

function GalleryImage({ src, alt, onClick, className = "" }) {
  return (
    <button type="button" onClick={onClick} className={`group overflow-hidden bg-gray-100 ${className}`}>
      <img src={src} alt={alt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] group-hover:brightness-90" loading="lazy" />
    </button>
  );
}

function GalleryModal({ images, title, onClose }) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
        <button type="button" onClick={onClose} className="rounded-full p-3 transition hover:bg-gray-100" aria-label="Close gallery">
          <X size={22} />
        </button>
        <h2 className="truncate px-4 text-center text-lg font-bold">{title}</h2>
        <div className="w-10" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {images.map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt={`${title} ${index + 1}`}
              className={`w-full rounded-2xl object-cover ${index === 0 ? "max-h-[650px] md:col-span-2" : "h-[320px] md:h-[360px]"}`}
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginRequiredModal({ onClose, onLogin, onSignup }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 transition hover:bg-gray-100" aria-label="Close login modal">
          <X size={20} />
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f0ff]" style={{ color: BRAND_COLOR }}>
          <Lock size={26} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900">Log in to continue</h2>
        <p className="mt-3 leading-6 text-gray-500">Please log in or create an account to reserve this stay, message the host, or save it to your wishlist.</p>

        <div className="mt-6 space-y-3">
          <button type="button" onClick={onLogin} className="h-12 w-full rounded-xl font-semibold text-white transition" style={{ backgroundColor: BRAND_COLOR }}>
            Log in
          </button>
          <button type="button" onClick={onSignup} className="h-12 w-full rounded-xl border border-gray-300 font-semibold transition hover:bg-gray-50">
            Create account
          </button>
          <button type="button" onClick={onClose} className="h-12 w-full rounded-xl text-gray-500 transition hover:bg-gray-50">
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
      <div className="mt-0.5 text-[#222]">{icon}</div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function Amenity({ icon, text }) {
  return (
    <div className="flex items-center gap-4 text-gray-800">
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-gray-100 md:px-4">
      {icon}
      {label}
    </button>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-700 underline underline-offset-2">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ReservePageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="h-8 w-2/3 max-w-xl animate-pulse rounded-xl bg-gray-100" />
        <div className="mt-5 h-[320px] animate-pulse rounded-[28px] bg-gray-100 md:h-[430px]" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <div className="h-8 w-80 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          </div>
          <div className="h-96 animate-pulse rounded-[28px] bg-gray-100" />
        </div>
      </main>
    </div>
  );
}
