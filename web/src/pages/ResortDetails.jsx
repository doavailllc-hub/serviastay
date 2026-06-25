import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AirVent,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  Keyboard,
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
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";
import GoogleMapSection from "../components/GoogleMapSection";

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

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    return user && token ? user : null;
  } catch {
    return null;
  }
}

function formatCalendarInput(dateString) {
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

function formatFeatureDate(dateString) {
  if (!dateString) return "today";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${dateString}T00:00:00`));
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
  const [bookedRanges, setBookedRanges] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

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

  const loadReviews = useCallback(async () => {
    try {
      const { data } = await api.get(`/reviews/${id}`);
      setReviews(data || []);
    } catch (err) {
      console.log("Reviews load failed:", err);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
    loadReviews();
  }, [loadProperty, loadReviews]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        guestDropdownRef.current &&
        !guestDropdownRef.current.contains(event.target)
      ) {
        setGuestDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    async function loadBookedDates() {
      try {
        const { data } = await api.get(`/properties/${id}/booked-dates`);
        setBookedRanges(data || []);
      } catch (err) {
        console.log("Booked dates load failed:", err);
      }
    }

    loadBookedDates();
  }, [id]);

  useEffect(() => {
    if (!checkin) return;

    if (!checkout || checkout <= checkin) {
      setCheckout(addDaysISO(checkin, 1));
    }
  }, [checkin, checkout]);

  const galleryImages = useMemo(() => {
    const images = [
      property?.image,
      ...(property?.images || []).map(
        (item) => item?.image_url || item?.url || item
      ),
    ].filter(Boolean);

    const uniqueImages = [...new Set(images)];
    return uniqueImages.length ? uniqueImages : [FALLBACK_IMAGE];
  }, [property]);

  const price = safeNumber(property?.price, 0);
  const rating = property?.rating || "5.0";
  const maxGuests = Math.max(1, safeNumber(property?.guests, 10));
  const totalGuests = adults + children;

  const nights = useMemo(() => {
    const start = new Date(`${checkin}T00:00:00`);
    const end = new Date(`${checkout}T00:00:00`);
    const diff = Math.round((end - start) / MS_PER_DAY);

    return diff > 0 ? diff : 1;
  }, [checkin, checkout]);

  const subtotal = price * nights;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;

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
        guests: totalGuests,
        adults,
        children,
        infants,
        pets,
        nights,
        subtotal,
        taxes,
        total,
      },
    });
  };

  const handleMessageHost = async () => {
    const user = getStoredUser();

    if (!user) {
      openLoginModal();
      return;
    }

    const hostId = Number(property?.user_id);

    if (!hostId) {
      toast.error("Host details are missing for this property.");
      return;
    }

    if (Number(user.id) === hostId) {
      toast.error("This is your own listing.");
      return;
    }

    try {
      await api.post("/conversations/start", {
        sender_id: user.id,
        receiver_id: hostId,
        property_id: property.id,
        message: `Hi, I’m interested in ${property.title}. Is it available?`,
      });

      navigate("/messages", {
        state: {
          openUserId: hostId,
          propertyId: property.id,
        },
      });
    } catch (err) {
      console.log("Start conversation failed:", err);
      toast.error(err.response?.data?.message || "Could not start conversation.");
    }
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

      toast.success("Added to wishlist");
    } catch (err) {
      console.error("Wishlist failed:", err);
      toast.error(err?.response?.data?.message || "Wishlist failed");
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
      toast.success("Link copied");
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  if (loading) return <ReservePageSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-white text-gray-950">
        <Navbar />

        <main className="mx-auto flex min-h-[65vh] max-w-7xl items-center justify-center px-4 md:px-8">
          <div className="max-w-md rounded-[32px] border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Stay not available</h1>
            <p className="mt-3 text-gray-600">{error}</p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-full px-7 py-3 text-sm font-bold text-white transition hover:bg-[#6f43e4]"
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
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:px-8 lg:pt-8">
        <PropertyHeader
          property={property}
          rating={rating}
          onShare={shareProperty}
          onSave={handleWishlist}
        />

        <PropertyGallery
          images={galleryImages}
          title={property.title}
          onShowAll={() => setGalleryOpen(true)}
        />

        <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16">
          <article className="min-w-0">
            <section className="border-b border-gray-200 pb-8">
              <h2 className="text-[22px] font-semibold tracking-tight md:text-2xl">
                Entire place in {city}
              </h2>

              <p className="mt-2 text-[15px] text-gray-600">
                {maxGuests} guests · {property.bedrooms || 1} bedroom
                {Number(property.bedrooms || 1) > 1 ? "s" : ""} ·{" "}
                {property.bathrooms || 1} bath
                {Number(property.bathrooms || 1) > 1 ? "s" : ""}
              </p>
            </section>

            <section className="space-y-6 border-b border-gray-200 py-8">
              <Feature
                icon={<Sparkles size={23} />}
                title="Guest favorite"
                text="A highly loved stay with reliable service, clean spaces, and a smooth check-in experience."
              />

              <Feature
                icon={<CalendarDays size={23} />}
                title="Flexible date selection"
                text={`Check-in starts from ${formatFeatureDate(today)}. Checkout is automatically set to the next day.`}
              />

              <Feature
                icon={<ShieldCheck size={23} />}
                title="Secure reservation"
                text="Your reservation continues to checkout only after login, keeping booking details protected."
              />
            </section>

            <section className="border-b border-gray-200 py-9">
              <h2 className="mb-4 text-[22px] font-semibold tracking-tight md:text-2xl">
                About this place
              </h2>

              <p className="max-w-3xl whitespace-pre-line text-[16px] leading-8 text-gray-700">
                {property.description ||
                  "A comfortable, professionally managed stay with essential amenities and a smooth booking experience."}
              </p>
            </section>

            <AmenitiesSection />

            <HostSection property={property} onMessageHost={handleMessageHost} />

            <section className="border-b border-gray-200 py-9">
              <h2 className="mb-6 text-[22px] font-semibold tracking-tight md:text-2xl">
                Where you'll be
              </h2>

              <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-gray-50">
                <GoogleMapSection
                  latitude={property.latitude}
                  longitude={property.longitude}
                  title={property.title}
                />
              </div>
            </section>

            <ReviewsSection
              propertyId={property.id}
              reviews={reviews}
              onReviewAdded={loadReviews}
            />
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
              bookedRanges={bookedRanges}
              adults={adults}
              setAdults={setAdults}
              children={children}
              setChildren={setChildren}
              infants={infants}
              setInfants={setInfants}
              pets={pets}
              setPets={setPets}
              maxGuests={maxGuests}
              totalGuests={totalGuests}
              nights={nights}
              subtotal={subtotal}
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
          onSignup={() => navigate("/login")}
        />
      )}
    </div>
  );
}

function PropertyHeader({ property, rating, onShare, onSave }) {
  return (
    <header className="mb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-gray-950 md:text-[32px] md:leading-tight">
            {property.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
            <span className="inline-flex items-center gap-1 font-semibold text-gray-950">
              <Star size={15} fill="currentColor" />
              {rating}
            </span>
            <span className="text-gray-400">·</span>
            <span className="font-semibold underline underline-offset-2">
              Guest favorite
            </span>
            <span className="text-gray-400">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={15} />
              {property.location || "Location not specified"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm font-semibold">
          <ActionButton icon={<Share size={16} />} label="Share" onClick={onShare} />
          <ActionButton icon={<Heart size={16} />} label="Save" onClick={onSave} />
        </div>
      </div>
    </header>
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
  adults,
  setAdults,
  children,
  setChildren,
  infants,
  setInfants,
  pets,
  setPets,
  maxGuests,
  totalGuests,
  nights,
  subtotal,
  taxes,
  total,
  dateError,
  guestDropdownRef,
  guestDropdownOpen,
  setGuestDropdownOpen,
  onReserve,
  bookedRanges,
  onMessageHost,
}) {
  return (
    <div className="sticky top-24 rounded-[32px] border border-gray-200 bg-white p-5 shadow-[0_14px_42px_rgba(0,0,0,0.12)] md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <span className="text-[22px] font-semibold text-gray-950">
            {formatINR(price)}
          </span>
          <span className="text-gray-500"> night</span>
        </div>

        <span className="inline-flex items-center gap-1 text-sm font-semibold">
          <Star size={14} fill="currentColor" />
          {rating}
        </span>
      </div>

      <div className="overflow-visible rounded-3xl border border-gray-300 bg-white">
        <AirbnbDatePicker
          checkin={checkin}
          checkout={checkout}
          setCheckin={setCheckin}
          setCheckout={setCheckout}
          today={today}
          bookedRanges={bookedRanges}
        />

        <GuestDropdown
          refEl={guestDropdownRef}
          open={guestDropdownOpen}
          setOpen={setGuestDropdownOpen}
          adults={adults}
          setAdults={setAdults}
          children={children}
          setChildren={setChildren}
          infants={infants}
          setInfants={setInfants}
          pets={pets}
          setPets={setPets}
          totalGuests={totalGuests}
          maxGuests={maxGuests}
        />
      </div>

      {dateError && (
        <p className="mt-3 text-sm font-semibold text-red-600">
          Checkout date must be after check-in.
        </p>
      )}

      <button
        type="button"
        onClick={onReserve}
        disabled={dateError}
        className="mt-5 h-14 w-full rounded-2xl bg-[#7e4ff5] text-base font-bold text-white shadow-lg shadow-purple-100 transition-all hover:-translate-y-0.5 hover:bg-[#6f43e4] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
      >
        Reserve
      </button>

      <button
        type="button"
        onClick={onMessageHost}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 font-semibold transition hover:bg-gray-50"
      >
        <MessageCircle size={18} />
        Message Host
      </button>

      <p className="mt-4 text-center text-sm text-gray-500">
        You won’t be charged yet
      </p>

      <div className="mt-6 space-y-3 text-sm">
        <h3 className="font-semibold text-gray-950">Price details</h3>

        <PriceRow
          label={`${formatINR(price)} × ${nights} ${
            nights === 1 ? "night" : "nights"
          }`}
          value={formatINR(subtotal)}
        />

        <PriceRow label="Taxes" value={formatINR(taxes)} />

        <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-base font-bold">
          <span>Total before payment</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>
    </div>
  );
}

function AirbnbDatePicker({
  checkin,
  checkout,
  setCheckin,
  setCheckout,
  today,
  bookedRanges = [],
}) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState("checkin");
  const [viewDate, setViewDate] = useState(
    new Date(`${checkin || today}T00:00:00`)
  );

  const pickerRef = useRef(null);

  useEffect(() => {
    function close(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${checkout}T00:00:00`) -
        new Date(`${checkin}T00:00:00`)) /
        MS_PER_DAY
    )
  );

  const isDateBooked = (iso) => {
    return bookedRanges.some((range) => {
      const start = String(range.checkin).slice(0, 10);
      const end = String(range.checkout).slice(0, 10);
      return iso >= start && iso < end;
    });
  };

  const hasBookedDateInRange = (startIso, endIso) => {
    let current = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);

    while (current < end) {
      const iso = toLocalISO(current);
      if (isDateBooked(iso)) return true;
      current.setDate(current.getDate() + 1);
    }

    return false;
  };

  const handleDateClick = (date) => {
    const iso = toLocalISO(date);

    if (isDateBooked(iso)) return;

    if (selecting === "checkin") {
      setCheckin(iso);

      if (!checkout || checkout <= iso || hasBookedDateInRange(iso, checkout)) {
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

    if (hasBookedDateInRange(checkin, iso)) {
      toast.error("Selected range includes unavailable dates.");
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
      <div className="grid grid-cols-2 border-b border-gray-300">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSelecting("checkin");
          }}
          className={`px-4 py-3 text-left transition hover:bg-gray-50 ${
            selecting === "checkin" && open ? "rounded-2xl ring-2 ring-gray-950" : ""
          }`}
        >
          <span className="block text-[10px] font-black uppercase tracking-[0.08em]">
            Check-in
          </span>
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
          className={`border-l border-gray-300 px-4 py-3 text-left transition hover:bg-gray-50 ${
            selecting === "checkout" && open ? "rounded-2xl ring-2 ring-gray-950" : ""
          }`}
        >
          <span className="block text-[10px] font-black uppercase tracking-[0.08em]">
            Checkout
          </span>
          <span className="mt-1 block text-sm font-semibold">
            {formatCalendarInput(checkout)}
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute left-1/2 top-[68px] z-[999] w-[95vw] max-w-[720px] -translate-x-1/2 rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)] md:p-7">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                {nights} {nights === 1 ? "night" : "nights"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {formatCalendarHeader(checkin)} -{" "}
                {formatCalendarHeader(checkout)}
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
              className="rounded-full p-2 transition hover:bg-gray-100"
              aria-label="Previous month"
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
              className="rounded-full p-2 transition hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <CalendarMonth
              date={viewDate}
              checkin={checkin}
              checkout={checkout}
              today={today}
              onDateClick={handleDateClick}
              bookedRanges={bookedRanges}
            />

            <div className="hidden md:block">
              <CalendarMonth
                date={
                  new Date(
                    viewDate.getFullYear(),
                    viewDate.getMonth() + 1,
                    1
                  )
                }
                checkin={checkin}
                checkout={checkout}
                today={today}
                onDateClick={handleDateClick}
                bookedRanges={bookedRanges}
              />
            </div>
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
                className="rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
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
      className={`w-32 rounded-2xl border px-4 py-3 text-left transition md:w-36 ${
        active ? "border-gray-950 ring-1 ring-gray-950" : "border-gray-300"
      }`}
    >
      <span className="block text-[10px] font-black uppercase">{label}</span>
      <span className="mt-1 block text-sm">{value}</span>
    </button>
  );
}

function CalendarMonth({
  date,
  checkin,
  checkout,
  today,
  onDateClick,
  bookedRanges = [],
}) {
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
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const isDateBooked = (iso) => {
    return bookedRanges.some((range) => {
      const start = String(range.checkin).slice(0, 10);
      const end = String(range.checkout).slice(0, 10);
      return iso >= start && iso < end;
    });
  };

  return (
    <div>
      <h4 className="mb-5 text-center font-bold">{monthName}</h4>

      <div className="mb-3 grid grid-cols-7 text-center text-xs font-semibold text-gray-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`${day}-${index}`}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {blanks.map((_, index) => (
          <div key={`blank-${index}`} className="h-11" />
        ))}

        {days.map((day) => {
          const currentDate = new Date(year, month, day);
          const iso = toLocalISO(currentDate);

          const booked = isDateBooked(iso);
          const disabled = iso < today || booked;
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
                disabled
                  ? "cursor-not-allowed text-gray-300"
                  : "hover:bg-gray-100"
              } ${inRange && !booked ? "bg-gray-100" : ""}`}
              title={booked ? "Unavailable" : ""}
            >
              <span
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${
                  isStart || isEnd ? "bg-gray-950 text-white" : ""
                } ${
                  isToday && !isStart && !isEnd ? "border border-gray-950" : ""
                } ${booked ? "line-through" : ""}`}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GuestDropdown({
  refEl,
  open,
  setOpen,
  adults,
  setAdults,
  children,
  setChildren,
  infants,
  setInfants,
  pets,
  setPets,
  totalGuests,
  maxGuests,
}) {
  const updateAdults = (value) => {
    const nextAdults = Math.max(1, Math.min(value, maxGuests - children));
    setAdults(nextAdults);
  };

  const updateChildren = (value) => {
    const nextChildren = Math.max(0, Math.min(value, maxGuests - adults));
    setChildren(nextChildren);
  };

  const summary = [
    `${totalGuests} ${totalGuests === 1 ? "guest" : "guests"}`,
    infants > 0 ? `${infants} infant${infants > 1 ? "s" : ""}` : "",
    pets > 0 ? `${pets} pet${pets > 1 ? "s" : ""}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div ref={refEl} className="relative border-t border-gray-300">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-gray-50"
      >
        <div>
          <span className="block text-[10px] font-black uppercase tracking-[0.08em]">
            Guests
          </span>
          <span className="mt-1 block text-sm font-semibold">{summary}</span>
          <p className="mt-1 text-xs text-gray-500">Maximum {maxGuests} guests</p>
        </div>

        <ChevronDown
          size={20}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[86px] z-50 rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.20)]">
          <GuestRow
            title="Adults"
            subtitle="Ages 13 or above"
            value={adults}
            min={1}
            max={maxGuests - children}
            onChange={updateAdults}
          />

          <GuestRow
            title="Children"
            subtitle="Ages 2–12"
            value={children}
            min={0}
            max={maxGuests - adults}
            onChange={updateChildren}
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
            className="mt-5 w-full rounded-2xl bg-[#7e4ff5] py-3 font-bold text-white transition hover:bg-[#6f43e4]"
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
        <p className="font-semibold text-gray-950">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={decrease}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus size={16} />
        </button>

        <span className="w-5 text-center font-semibold">{value}</span>

        <button
          type="button"
          onClick={increase}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function AmenitiesSection() {
  return (
    <section className="border-b border-gray-200 py-9">
      <h2 className="mb-6 text-[22px] font-semibold tracking-tight md:text-2xl">
        What this place offers
      </h2>

      <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
        <Amenity icon={<Wifi />} title="Wifi" text="High speed internet" />
        <Amenity icon={<Car />} title="Free parking" text="On premises" />
        <Amenity icon={<Utensils />} title="Kitchen" text="Fully equipped" />
        <Amenity icon={<Waves />} title="Pool" text="Private or shared access" />
        <Amenity icon={<AirVent />} title="Air conditioning" text="Comfort cooling" />
        <Amenity icon={<Tv />} title="TV" text="Entertainment ready" />
      </div>
    </section>
  );
}

function HostSection({ property, onMessageHost }) {
  return (
    <section className="border-b border-gray-200 py-9">
      <h2 className="mb-6 text-[22px] font-semibold tracking-tight md:text-2xl">
        Hosted by {property?.host_name || "Dovail Stay"}
      </h2>

      <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f0ff] text-2xl font-black text-[#7e4ff5]">
              {(property?.host_name || "D").charAt(0).toUpperCase()}
            </div>

            <div>
              <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                {property?.host_name || "Dovail Host"}

                {property?.host_kyc_status === "Approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-[#F0FDF4] px-2.5 py-1 text-xs font-semibold text-green-700">
                    <ShieldCheck size={13} />
                    Verified Host
                  </span>
                )}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {property?.host_email || "Host email unavailable"}
              </p>

              {property?.host_phone && (
                <p className="mt-1 text-sm text-gray-500">
                  {property.host_phone}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onMessageHost}
            className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold transition hover:bg-gray-50"
          >
            Message Host
          </button>
        </div>

        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <HostStat label="Response rate" value="100%" />
          <HostStat label="Response time" value="1 hour" />
          <HostStat label="Support" value="24/7" />
        </div>
      </div>
    </section>
  );
}

function ReviewsSection({ propertyId, reviews, onReviewAdded }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const user = getStoredUser();

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "5.0";

  const submitReview = async () => {
    if (!user?.id) {
      toast.error("Please login to write a review");
      return;
    }

    if (!review.trim()) {
      toast.error("Please write your review before submitting");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/reviews", {
        property_id: propertyId,
        user_id: user.id,
        rating,
        review: review.trim(),
      });

      setReview("");
      setRating(5);

      try {
        await onReviewAdded();
      } catch (reloadError) {
        console.log("Review reload failed:", reloadError);
      }

      toast.success("Review submitted successfully");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Review submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-10">
      <h2 className="mb-8 text-[22px] font-semibold tracking-tight md:text-2xl">
        <span className="inline-flex items-center gap-2">
          <Star size={22} fill="currentColor" />
          {avgRating} · {reviews.length} reviews
        </span>
      </h2>

      {!user ? (
        <div className="mb-10 rounded-[32px] border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-lg font-bold">Want to write a review?</h3>
          <p className="mt-2 text-sm text-gray-500">
            Please log in to review this stay.
          </p>

          <button
            type="button"
            onClick={() => (window.location.href = "/login")}
            className="mt-4 rounded-2xl bg-[#7e4ff5] px-6 py-3 font-bold text-white transition hover:bg-[#6f43e4]"
          >
            Log in to review
          </button>
        </div>
      ) : (
        <div className="mb-10 rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Write a review</h3>

          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-[#7e4ff5]"
              >
                <Star
                  size={26}
                  fill={star <= rating ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            placeholder="Share your experience..."
            className="mt-4 w-full resize-none rounded-2xl border border-gray-300 p-4 outline-none transition focus:border-[#7e4ff5] focus:ring-2 focus:ring-[#7e4ff5]/20"
          />

          <button
            type="button"
            onClick={submitReview}
            disabled={submitting}
            className="mt-4 rounded-2xl bg-[#7e4ff5] px-6 py-3 font-bold text-white transition hover:bg-[#6f43e4] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {reviews.map((item) => (
            <div key={item.id} className="border-b border-gray-200 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
                  {(item.guest_name || "G").charAt(0).toUpperCase()}
                </div>

                <div>
                  <p className="font-bold">{item.guest_name || "Guest"}</p>
                  <div className="mt-1 flex text-[#7e4ff5]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        fill={
                          star <= Number(item.rating) ? "currentColor" : "none"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 leading-7 text-gray-700">
                {item.review || "No written review."}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PropertyGallery({ images, title, onShowAll }) {
  const photos = images.length ? images : [FALLBACK_IMAGE];

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gray-100">
      <div className="grid h-[320px] grid-cols-1 gap-2 md:h-[430px] md:grid-cols-4">
        <GalleryImage
          src={photos[0]}
          alt={title}
          onClick={onShowAll}
          className="md:col-span-2 md:row-span-2"
        />

        {photos.slice(1, 5).map((src, index) => (
          <GalleryImage
            key={`${src}-${index}`}
            src={src}
            alt={`${title} ${index + 2}`}
            onClick={onShowAll}
            className="hidden md:block"
          />
        ))}

        {Array.from({ length: Math.max(0, 5 - photos.length) }).map(
          (_, index) => (
            <div key={`placeholder-${index}`} className="hidden bg-gray-100 md:block" />
          )
        )}
      </div>

      <button
        type="button"
        onClick={onShowAll}
        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl border border-gray-900 bg-white px-4 py-2.5 text-sm font-bold shadow-lg transition hover:bg-gray-100 md:bottom-5 md:right-5"
      >
        <Images size={18} />
        Show all photos
      </button>
    </div>
  );
}

function GalleryImage({ src, alt, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group overflow-hidden bg-gray-100 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] group-hover:brightness-90"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = FALLBACK_IMAGE;
        }}
      />
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
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-3 transition hover:bg-gray-100"
          aria-label="Close gallery"
        >
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
              className={`w-full rounded-3xl object-cover ${
                index === 0
                  ? "max-h-[650px] md:col-span-2"
                  : "h-[320px] md:h-[360px]"
              }`}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_IMAGE;
              }}
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
      <div className="relative w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 transition hover:bg-gray-100"
          aria-label="Close login modal"
        >
          <X size={20} />
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f0ff] text-[#7e4ff5]">
          <Lock size={26} />
        </div>

        <h2 className="text-2xl font-bold text-gray-950">Log in to continue</h2>

        <p className="mt-3 leading-6 text-gray-500">
          Please log in or create an account to reserve this stay, message the
          host, or save it to your wishlist.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onLogin}
            className="h-12 w-full rounded-2xl bg-[#7e4ff5] font-semibold text-white transition hover:bg-[#6f43e4]"
          >
            Continue with email
          </button>

          <button
            type="button"
            onClick={onSignup}
            className="h-12 w-full rounded-2xl border border-gray-300 font-semibold transition hover:bg-gray-50"
          >
            Create account
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-2xl text-gray-500 transition hover:bg-gray-50"
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
      <div className="mt-0.5 text-gray-950">{icon}</div>
      <div>
        <h4 className="font-semibold text-gray-950">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function Amenity({ icon, title, text }) {
  return (
    <div className="flex gap-4">
      <span className="mt-1 flex h-6 w-6 items-center justify-center text-gray-950">
        {icon}
      </span>

      <div>
        <p className="font-semibold text-gray-950">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-gray-100 md:px-4"
    >
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

function HostStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="font-bold text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
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