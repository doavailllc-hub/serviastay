import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, ShieldCheck, Star } from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";
import GoogleMapSection from "../components/GoogleMapSection";

import PropertyHeader from "../components/resort/PropertyHeader";
import PropertyGallery from "../components/resort/PropertyGallery";
import GalleryModal from "../components/resort/GalleryModal";
import AmenitiesSection from "../components/resort/AmenitiesSection";
import HostSection from "../components/resort/HostSection";
import ReviewsSection from "../components/resort/ReviewsSection";
import ReservationCard from "../components/resort/ReservationCard";
import LoginModal from "../components/resort/LoginModal";

import {
  addDaysISO,
  formatFeatureDate,
  getStoredUser,
  safeNumber,
  toLocalISO,
} from "../utils/resortUtils";

import { BRAND_COLOR, FALLBACK_IMAGE, MS_PER_DAY } from "../constants/resortConstants";

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
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Reviews load failed:", err);
    }
  }, [id]);

  const loadBookedDates = useCallback(async () => {
    try {
      const { data } = await api.get(`/properties/${id}/booked-dates`);
      setBookedRanges(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Booked dates load failed:", err);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
    loadReviews();
    loadBookedDates();
  }, [loadProperty, loadReviews, loadBookedDates]);

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
    if (!checkin) return;

    if (!checkout || checkout <= checkin) {
      setCheckout(addDaysISO(checkin, 1));
    }
  }, [checkin, checkout]);

  const galleryImages = useMemo(() => {
    const imageList = [
      property?.image,
      ...(property?.images || []).map(
        (item) => item?.image_url || item?.url || item
      ),
    ].filter(Boolean);

    const uniqueImages = [...new Set(imageList)];
    return uniqueImages.length ? uniqueImages : [FALLBACK_IMAGE];
  }, [property]);

  const price = safeNumber(property?.price, 0);
  const rating =
    property?.rating && Number(property.rating) > 0
      ? Number(property.rating).toFixed(1)
      : "New";

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
      const { data } = await api.post("/conversations/start", {
        sender_id: user.id,
        receiver_id: hostId,
        property_id: property.id,
        message: `Hi, I’m interested in ${property.title}. Is it available?`,
      });

      navigate("/messages", {
        state: {
          conversationId: data?.id || data?.conversation_id,
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
      toast.error("Could not share this stay.");
    }
  };

  if (loading) return <ReservePageSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-white text-gray-950">
        <Navbar />

        <main className="mx-auto flex min-h-[65vh] max-w-7xl items-center justify-center px-4 md:px-8">
          <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight">
              Stay not available
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">{error}</p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
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

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
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

        <section className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
          <article className="min-w-0">
            <Section>
              <h2 className="text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
                Entire place in {city}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {maxGuests} guests · {property.bedrooms || 1} bedroom
                {Number(property.bedrooms || 1) > 1 ? "s" : ""} ·{" "}
                {property.bathrooms || 1} bath
                {Number(property.bathrooms || 1) > 1 ? "s" : ""}
              </p>
            </Section>

            <Section>
              <div className="space-y-6">
                <Feature
                  icon={<ShieldCheck size={21} />}
                  title="Secure reservation"
                  text="Your booking continues safely after login with protected reservation details."
                />

                <Feature
                  icon={<CalendarDays size={21} />}
                  title="Flexible date selection"
                  text={`Check-in starts from ${formatFeatureDate(
                    today
                  )}. Checkout is automatically set to the next day.`}
                />

                <Feature
                  icon={<Star size={21} />}
                  title="Guest favorite"
                  text="A reliable stay with clean spaces, useful amenities and smooth check-in."
                />
              </div>
            </Section>

            <Section title="About this place">
              <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-gray-600">
                {property.description ||
                  "A comfortable, professionally managed stay with essential amenities and a smooth booking experience."}
              </p>
            </Section>

            <AmenitiesSection amenities={property?.amenities} />

            <HostSection property={property} onMessageHost={handleMessageHost} />

            <Section title="Where you'll be">
              {property.latitude && property.longitude ? (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  <GoogleMapSection
                    latitude={property.latitude}
                    longitude={property.longitude}
                    title={property.title}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-sm text-gray-500">
                  Map location is not available for this stay.
                </div>
              )}
            </Section>

            <ReviewsSection
              propertyId={property.id}
              reviews={reviews}
              onReviewAdded={loadReviews}
            />
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
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
        <LoginModal
          onClose={() => setLoginModalOpen(false)}
          onLogin={() => navigate("/login")}
          onSignup={() => navigate("/login")}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-b border-gray-200 py-8">
      {title && (
        <h2 className="mb-6 text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
          {title}
        </h2>
      )}

      {children}
    </section>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 text-[#3b71e6]">{icon}</div>

      <div>
        <h4 className="text-sm font-medium text-gray-950">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function ReservePageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <div className="h-8 w-2/3 max-w-xl animate-pulse rounded-xl bg-gray-100" />
        <div className="mt-5 h-[300px] animate-pulse rounded-2xl bg-gray-100 md:h-[420px]" />

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="h-8 w-80 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          </div>

          <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </main>
    </div>
  );
}