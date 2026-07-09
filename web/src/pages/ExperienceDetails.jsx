import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Heart,
  Loader2,
  MapPin,
  Share,
  Star,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";


function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function ExperienceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dateInputRef = useRef(null);

  const [pkg, setPkg] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [travelers, setTravelers] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, [id]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      const detailRes = await api.get(`/experiences/${id}`);
      setPkg(detailRes.data);

      try {
        const departureRes = await api.get(`/trip-packages/${id}/departures`);
        const list = Array.isArray(departureRes.data) ? departureRes.data : [];
        setDepartures(list);

        const firstAvailable = list.find((d) => {
          const remaining =
            Number(d.total_seats || 0) - Number(d.booked_seats || 0);
          return d.status === "Available" && remaining > 0;
        });

        if (firstAvailable) {
          setSelectedDeparture(firstAvailable);
          setSelectedDate(formatInputDate(firstAvailable.departure_date));
        }
      } catch {
        setDepartures([]);
        setSelectedDate(todayISO());
      }

      try {
        const reviewRes = await api.get(`/experience-reviews/${id}`);
        setReviews(Array.isArray(reviewRes.data) ? reviewRes.data : []);
      } catch {
        setReviews([]);
      }

      try {
        const similarRes = await api.get("/experiences", {
          params: { category: detailRes.data?.category || "All" },
        });

        const list = Array.isArray(similarRes.data) ? similarRes.data : [];
        setSimilar(
          list.filter((item) => Number(item.id) !== Number(id)).slice(0, 4)
        );
      } catch {
        setSimilar([]);
      }
    } catch (err) {
      console.error("Trip package detail load failed:", err);
      setError("Unable to load this trip package.");
    } finally {
      setLoading(false);
    }
  };

  const images = useMemo(() => {
    const dbImages =
      pkg?.images?.map((img) => img.image_url).filter(Boolean) || [];

    if (dbImages.length) return dbImages;
    if (pkg?.image) return [getImageUrl()];

    return [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    ];
  }, [pkg]);

  const price = Number(pkg?.price || 0);
  const subtotal = price * travelers;
  const serviceFee = Math.round(subtotal * 0.08);
  const total = subtotal + serviceFee;

  const rating = Number(pkg?.rating || 0);
  const reviewCount = Number(pkg?.reviews || reviews.length || 0);
  const days = Number(pkg?.package_days || 1);
  const nights = Number(pkg?.package_nights || Math.max(days - 1, 0));

  const includes = parseList(pkg?.includes, [
    "Hotel stay",
    "Private transport",
    "Local guide",
    "Pickup and drop",
  ]);

  const itinerary = parseItinerary(pkg?.itinerary);

  const handleBookPackage = () => {
    if (departures.length > 0 && !selectedDeparture) {
      toast.error("Please select an available departure date.");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a travel date first.");
      return;
    }

    const remainingSeats = selectedDeparture
      ? Number(selectedDeparture.total_seats || 0) -
        Number(selectedDeparture.booked_seats || 0)
      : 999;

    if (travelers > remainingSeats) {
      toast.error(`Only ${remainingSeats} seats left for this departure.`);
      return;
    }

    navigate(`/experience-checkout/${id}`, {
      state: {
        experience: pkg,
        selectedDate,
        guests: travelers,
        departureId: selectedDeparture?.id || null,
        selectedDeparture,
        subtotal,
        serviceFee,
        total,
      },
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: pkg?.title || "Dovail Stay Trip Package",
      text: pkg?.description || "Check this trip package on Dovail Stay",
      url: window.location.href,
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.error("Package link copied.");
      }
    } catch {
      // cancelled
    }
  };

  if (loading) return <LoadingPage />;

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-white text-gray-950">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Trip package not found</h1>
          <p className="mt-3 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate("/experiences")}
            className="mt-6 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            Back to packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-24 md:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <section>
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {pkg.package_type || pkg.category || "Trip package"}
              </p>

              <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
                {pkg.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Star size={14} fill="currentColor" />
                  {rating ? rating.toFixed(1) : "New"}
                </span>
                <span>·</span>
                <span>{reviewCount} reviews</span>
                <span>·</span>
                <span>
                  {days} days · {nights} nights
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {pkg.location || pkg.city || "Destination"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ActionButton onClick={handleShare} icon={<Share size={16} />} label="Share" />
              <ActionButton
                onClick={() => setLiked((prev) => !prev)}
                icon={
                  <Heart
                    size={16}
                    className={liked ? "text-red-500" : ""}
                    fill={liked ? "currentColor" : "none"}
                  />
                }
                label="Save"
              />
            </div>
          </div>

          <PackageGallery
            images={images}
            title={pkg.title}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
          />
        </section>

        <section className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <Section>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-950">
                    Hosted by {pkg.host_name || pkg.host || "Dovail Travel"}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {days} days · {nights} nights ·{" "}
                    {pkg.group_size || `Up to ${pkg.max_people || 10} travelers`}
                  </p>
                </div>
                <HostAvatar name={pkg.host_name || pkg.host || "Dovail"} />
              </div>
            </Section>

            <Section title="Package overview">
                         <br></br>
              <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                {pkg.description ||
                  "Enjoy a carefully planned trip package with comfortable stay, transport, local support and a day-wise itinerary designed for a smooth travel experience."}
              </p>
            </Section>

            <Section title="What's included">
                         <br></br>
              <div className="grid gap-4 md:grid-cols-2">
                {includes.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#3b71e6]" size={18} />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Trip details">
                         <br></br>
              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow label="Hotel" value={pkg.hotel_name || "Included"} />
                <DetailRow label="Transport" value={pkg.transport || "Private / shared transport"} />
                <DetailRow label="Meals" value={pkg.meals || "Breakfast / selected meals"} />
                <DetailRow label="Pickup" value={pkg.pickup_location || "Shared after booking"} />
                <DetailRow label="Language" value={pkg.language || "English"} />
                <DetailRow label="Travelers" value={pkg.group_size || `Up to ${pkg.max_people || 10}`} />
              </div>
            </Section>

            {departures.length > 0 && (
              <Section title="Available departures">
                <div className="grid gap-3 md:grid-cols-2">
                  {departures.slice(0, 6).map((departure) => {
                    const remaining =
                      Number(departure.total_seats || 0) -
                      Number(departure.booked_seats || 0);

                    return (
                      <div key={departure.id} className="rounded-2xl border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-950">
                          {formatDisplayDate(departure.departure_date)}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {departure.status === "Available" && remaining > 0
                            ? `${remaining} seats left`
                            : departure.status || "Unavailable"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section title="Itinerary">
           <br></br>
              {itinerary.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Itinerary details will be shared after booking confirmation.
                </p>
              ) : (
                <div className="space-y-5">
                  {itinerary.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="relative pl-8">
                      <div className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#3b71e6] bg-white">
                        <span className="h-2 w-2 rounded-full bg-[#3b71e6]" />
                      </div>
                      {index !== itinerary.length - 1 && (
                        <div className="absolute left-[9px] top-7 h-full w-px bg-gray-200" />
                      )}
                      <p className="text-sm font-semibold text-gray-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Pickup & destination">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailBox
                  label="Pickup location"
                  value={pkg.pickup_location || "Pickup details will be shared after booking."}
                />
                <DetailBox
                  label="Destination"
                  value={pkg.location || pkg.city || "Destination details unavailable"}
                />
              </div>

       <GoogleMapEmbed
  location={pkg.location || pkg.city || "India"}
  title={pkg.title}
/>
            </Section>

            <Section title="Cancellation policy">
              <p className="rounded-2xl bg-gray-50 p-5 text-sm leading-7 text-gray-600">
                {pkg.cancellation_policy ||
                  "Free cancellation support is available according to host/package rules. Contact Dovail Stay support for schedule changes or package availability issues."}
              </p>
            </Section>

            <ReviewsSection reviews={reviews} rating={rating} reviewCount={reviewCount} />

            {similar.length > 0 && (
              <Section title="Similar trip packages" last>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {similar.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/experiences/${item.id}`)}
                      className="group text-left"
                    >
                      <div className="overflow-hidden rounded-2xl bg-gray-100">
                        <img
                          src={getImageUrl()|| item.image_url || images[0]}
                          alt={item.title}
                          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-sm font-medium text-gray-950">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        ₹{Number(item.price || 0).toLocaleString("en-IN")} / person
                      </p>
                    </button>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BookingCard
              price={price}
              rating={rating}
              departures={departures}
              selectedDeparture={selectedDeparture}
              setSelectedDeparture={setSelectedDeparture}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              travelers={travelers}
              setTravelers={setTravelers}
              subtotal={subtotal}
              serviceFee={serviceFee}
              total={total}
              handleBookPackage={handleBookPackage}
              dateInputRef={dateInputRef}
            />
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin text-[#3b71e6]" size={22} />
          <span className="text-sm font-medium">Loading trip package...</span>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:bg-gray-100 active:scale-[0.98]"
    >
      {icon}
      {label}
    </button>
  );
}

function PackageGallery({ images, title, selectedImage, setSelectedImage }) {
  const main = images[selectedImage] || images[0];

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={main}
          alt={title}
          className="h-[280px] w-full object-cover object-center transition duration-300 md:h-[420px]"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 md:grid-cols-1">
        {images.slice(0, 5).map((img, index) => (
          <button
            key={`${img}-${index}`}
            onClick={() => setSelectedImage(index)}
            className={`overflow-hidden rounded-xl border bg-gray-100 transition duration-200 hover:opacity-90 active:scale-[0.98] ${
              selectedImage === index ? "border-[#3b71e6]" : "border-gray-200"
            }`}
          >
            <img
              src={img}
              alt={`${title} ${index + 1}`}
              className="h-20 w-full object-cover object-center md:h-[80px]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function BookingCard({
  price,
  rating,
  departures,
  selectedDeparture,
  setSelectedDeparture,
  selectedDate,
  setSelectedDate,
  travelers,
  setTravelers,
  subtotal,
  serviceFee,
  total,
  handleBookPackage,
  dateInputRef,
}) {
  const hasDepartures = departures.length > 0;

  const remainingSeats = selectedDeparture
    ? Number(selectedDeparture.total_seats || 0) -
      Number(selectedDeparture.booked_seats || 0)
    : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-end justify-between">
        <p>
          <span className="text-2xl font-semibold text-gray-950">
            ₹{price.toLocaleString("en-IN")}
          </span>{" "}
          <span className="text-sm text-gray-500">/ person</span>
        </p>

        <p className="flex items-center gap-1 text-sm font-medium">
          <Star size={14} fill="currentColor" />
          {rating ? rating.toFixed(2) : "New"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Departure
          </label>

          {hasDepartures ? (
            <div className="space-y-2">
              {departures.map((departure) => {
                const remaining =
                  Number(departure.total_seats || 0) -
                  Number(departure.booked_seats || 0);

                const disabled =
                  departure.status !== "Available" || remaining <= 0;

                const active = selectedDeparture?.id === departure.id;

                return (
                  <button
                    key={departure.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedDeparture(departure);
                      setSelectedDate(formatInputDate(departure.departure_date));
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition duration-200 active:scale-[0.99] ${
                      active
                        ? "border-[#3b71e6] bg-[#eef4ff]"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-950">
                          {formatDisplayDate(departure.departure_date)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {disabled
                            ? departure.status || "Unavailable"
                            : `${remaining} seats left`}
                        </p>
                      </div>

                      <span
                        className={`h-4 w-4 rounded-full border transition ${
                          active
                            ? "border-[#3b71e6] bg-[#3b71e6]"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition duration-200 hover:bg-gray-50 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-950">
                <CalendarDays size={17} className="text-gray-400" />
                {formatDisplayDate(selectedDate)}
              </span>

              <ChevronDown size={16} className="text-gray-400" />

              <input
                ref={dateInputRef}
                type="date"
                min={todayISO()}
                value={selectedDate || todayISO()}
                onChange={(e) => setSelectedDate(e.target.value || todayISO())}
                className="sr-only"
              />
            </button>
          )}
        </div>

        <div className="p-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Travelers
          </label>

          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Users size={17} className="text-gray-400" />

            <select
              value={travelers}
              onChange={(e) => setTravelers(Number(e.target.value))}
              className="w-full bg-transparent text-sm font-medium outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option
                  key={n}
                  value={n}
                  disabled={remainingSeats !== null && n > remainingSeats}
                >
                  {n} traveler{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {remainingSeats !== null && (
            <p className="mt-2 text-xs text-gray-500">
              {remainingSeats} seats available
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleBookPackage}
        className="mt-5 h-12 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition duration-200 hover:bg-[#2f5fc2] active:scale-[0.99]"
      >
        Book package
      </button>

      <p className="mt-3 text-center text-sm text-gray-500">
        You won't be charged yet
      </p>

      <div className="mt-5 space-y-3 border-t border-gray-200 pt-5 text-sm">
        <PriceRow
          label={`₹${price.toLocaleString("en-IN")} × ${travelers}`}
          value={`₹${subtotal.toLocaleString("en-IN")}`}
        />

        <PriceRow
          label="Service fee"
          value={`₹${serviceFee.toLocaleString("en-IN")}`}
        />

        <div className="flex justify-between border-t border-gray-200 pt-4 font-semibold text-gray-950">
          <span>Total</span>
          <span>₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, last }) {
  return (
    <section className={`${last ? "py-8" : "border-b border-gray-200 py-8"}`}>
      {title && (
        <h2 className="mb-5 text-xl font-semibold tracking-tight text-gray-950">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function HostAvatar({ name }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-xl font-semibold text-[#3b71e6]">
      {String(name || "D").charAt(0).toUpperCase()}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-950">{value}</span>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-950">{label}</p>
      <p className="mt-2 text-sm leading-6 text-gray-500">{value}</p>
    </div>
  );
}

function ReviewsSection({ reviews, rating, reviewCount }) {
  return (
    <section className="border-b border-gray-200 py-8">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-950">
        <Star size={18} fill="currentColor" />
        {rating ? rating.toFixed(2) : "New"} · {reviewCount} reviews
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet for this package.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {reviews.slice(0, 6).map((review) => (
            <div key={review.id}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold">
                  {(review.guest_name || "G").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-950">
                    {review.guest_name || "Guest"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {review.created_at
                      ? new Date(review.created_at).toLocaleDateString("en-IN")
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={13}
                    fill={
                      index < Math.round(Number(review.rating || 0))
                        ? "currentColor"
                        : "none"
                    }
                  />
                ))}
              </div>

              <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-600">
                {review.review || "Great package."}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-gray-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function parseList(value, fallback = []) {
  if (!value) return fallback;
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function parseItinerary(value) {
  if (!value) return [];

  const text = String(value).trim();
  const dayMatches = [...text.matchAll(/Day\s*(\d+)\s*:\s*/gi)];

  if (!dayMatches.length) {
    return [{ title: "Day 1", description: text }];
  }

  return dayMatches.map((match, index) => {
    const start = match.index + match[0].length;
    const end =
      index + 1 < dayMatches.length ? dayMatches[index + 1].index : text.length;

    const content = text.slice(start, end).trim();
    const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);

    return {
      title: `Day ${match[1]}`,
      description: lines.join(" "),
    };
  });
}

function formatInputDate(value) {
  if (!value) return todayISO();

  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return todayISO();
  }
}
function GoogleMapEmbed({ latitude, longitude, title }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!latitude || !longitude) {
    return (
      <div className="mt-4 flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
        Map location is not available for this package.
      </div>
    );
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="mt-4 flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
        Invalid map location.
      </div>
    );
  }

  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=14`;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
      <iframe
        title={`Map of ${title || "trip destination"}`}
        src={mapUrl}
        className="h-72 w-full"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
function formatDisplayDate(value) {
  if (!value) return "Today";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}