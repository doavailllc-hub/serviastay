import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  Heart,
  Hotel,
  Loader2,
  MapPin,
  Route,
  Share,
  ShieldCheck,
  Star,
  Users,
  Utensils,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND = "#7E4FF5";

export default function ExperienceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
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
      }

      try {
        const reviewRes = await api.get(`/experience-reviews/${id}`);
        setReviews(Array.isArray(reviewRes.data) ? reviewRes.data : []);
      } catch {
        setReviews([]);
      }

      try {
        const similarRes = await api.get("/experiences", {
          params: {
            category: detailRes.data?.category || "All",
          },
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
    if (pkg?.image) return [pkg.image];

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
      alert("Please select an available departure date.");
      return;
    }

    if (!selectedDate) {
      alert("Please select a travel date first.");
      return;
    }

    const remainingSeats = selectedDeparture
      ? Number(selectedDeparture.total_seats || 0) -
        Number(selectedDeparture.booked_seats || 0)
      : 999;

    if (travelers > remainingSeats) {
      alert(`Only ${remainingSeats} seats left for this departure.`);
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
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Package link copied.");
      }
    } catch {
      // user cancelled share
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-semibold">Loading trip package...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black text-gray-900">
            Trip package not found
          </h1>

          <p className="mt-3 text-gray-500">{error}</p>

          <button
            onClick={() => navigate("/experiences")}
            className="mt-6 rounded-full px-6 py-3 font-bold text-white"
            style={{ backgroundColor: BRAND }}
          >
            Back to trip packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                {pkg.package_type || pkg.category || "Trip Package"}
              </p>

              <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
                {pkg.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-700">
                <span className="flex items-center gap-1">
                  <Star size={15} fill="black" />
                  {rating ? rating.toFixed(2) : "New"}
                </span>

                <span>·</span>
                <span>{reviewCount} reviews</span>
                <span>·</span>

                <span className="flex items-center gap-1">
                  <Clock3 size={15} />
                  {days} Days / {nights} Nights
                </span>

                <span>·</span>

                <span className="flex items-center gap-1 underline">
                  <MapPin size={15} />
                  {pkg.location || pkg.city || "Destination"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold hover:bg-gray-100"
              >
                <Share size={17} />
                Share
              </button>

              <button
                onClick={() => setLiked((prev) => !prev)}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold hover:bg-gray-100"
              >
                <Heart
                  size={17}
                  className={liked ? "text-red-500" : ""}
                  fill={liked ? "currentColor" : "none"}
                />
                Save
              </button>
            </div>
          </div>

          <PackageGallery
            images={images}
            title={pkg.title}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
          />
        </section>

        <section className="grid gap-10 py-10 lg:grid-cols-[1fr_390px]">
          <div>
            <div className="border-b border-gray-200 pb-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Trip package by{" "}
                    {pkg.host_name || pkg.host || "Dovail Travel"}
                  </h2>

                  <p className="mt-2 text-gray-500">
                    {days} Days · {nights} Nights ·{" "}
                    {pkg.group_size ||
                      `Up to ${pkg.max_people || 10} travelers`}
                  </p>
                </div>

                <HostAvatar
                  name={pkg.host_name || pkg.host || "Dovail Travel"}
                />
              </div>
            </div>

            <div className="grid gap-5 border-b border-gray-200 py-8 md:grid-cols-3">
              <InfoCard
                icon={<Hotel size={22} />}
                title="Hotel"
                text={pkg.hotel_name || "Hotel stay included"}
              />

              <InfoCard
                icon={<Route size={22} />}
                title="Transport"
                text={pkg.transport || "Private / shared transport"}
              />

              <InfoCard
                icon={<Utensils size={22} />}
                title="Meals"
                text={pkg.meals || "Breakfast / selected meals"}
              />
            </div>

            <div className="grid gap-5 border-b border-gray-200 py-8 md:grid-cols-3">
              <InfoCard
                icon={<Clock3 size={22} />}
                title="Duration"
                text={`${days} Days / ${nights} Nights`}
              />

              <InfoCard
                icon={<Users size={22} />}
                title="Travelers"
                text={pkg.group_size || `Up to ${pkg.max_people || 10} travelers`}
              />

              <InfoCard
                icon={<Globe2 size={22} />}
                title="Guide language"
                text={pkg.language || "English / Local"}
              />
            </div>

            <div className="border-b border-gray-200 py-8">
              <h2 className="text-2xl font-black text-gray-900">
                Package overview
              </h2>

              <p className="mt-4 whitespace-pre-line text-[16px] leading-8 text-gray-600">
                {pkg.description ||
                  "Enjoy a carefully planned trip package with comfortable stay, transport, local support and a day-wise itinerary designed for a smooth travel experience."}
              </p>
            </div>

            <div className="border-b border-gray-200 py-8">
              <h2 className="text-2xl font-black text-gray-900">
                Package includes
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {includes.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#7E4FF5]" size={20} />
                    <span className="font-semibold text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {departures.length > 0 && (
              <div className="border-b border-gray-200 py-8">
                <h2 className="text-2xl font-black text-gray-900">
                  Available departures
                </h2>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {departures.slice(0, 6).map((departure) => {
                    const remaining =
                      Number(departure.total_seats || 0) -
                      Number(departure.booked_seats || 0);

                    return (
                      <div
                        key={departure.id}
                        className="rounded-3xl border border-gray-100 p-5"
                      >
                        <p className="font-black text-gray-900">
                          {formatDisplayDate(departure.departure_date)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          {departure.status === "Available" && remaining > 0
                            ? `${remaining} seats left`
                            : departure.status || "Unavailable"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-b border-gray-200 py-8">
              <h2 className="text-2xl font-black text-gray-900">
                Day-wise itinerary
              </h2>

              {itinerary.length === 0 ? (
                <p className="mt-4 text-gray-500">
                  Itinerary details will be shared after booking confirmation.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {itinerary.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                      <p className="text-sm font-black text-[#7E4FF5]">
                        Day {index + 1}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b border-gray-200 py-8">
              <h2 className="text-2xl font-black text-gray-900">
                Pickup & destination
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 p-5">
                  <p className="text-sm font-black text-gray-900">
                    Pickup location
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {pkg.pickup_location ||
                      "Pickup details will be shared after booking."}
                  </p>
                </div>

                <div className="rounded-3xl border border-gray-100 p-5">
                  <p className="text-sm font-black text-gray-900">
                    Destination
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {pkg.location ||
                      pkg.city ||
                      "Destination details unavailable"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex h-72 items-center justify-center rounded-[28px] border border-gray-200 bg-gray-100 text-center text-gray-500">
                Google Map can be added here later
              </div>
            </div>

            <div className="border-b border-gray-200 py-8">
              <h2 className="text-2xl font-black text-gray-900">
                Cancellation policy
              </h2>

              <div className="mt-4 flex gap-3 rounded-3xl bg-[#F7F5FF] p-5">
                <ShieldCheck
                  className="mt-1 shrink-0 text-[#7E4FF5]"
                  size={22}
                />
                <p className="text-sm leading-7 text-gray-600">
                  {pkg.cancellation_policy ||
                    "Free cancellation support is available according to host/package rules. Contact Dovail Stay support for schedule changes or package availability issues."}
                </p>
              </div>
            </div>

            <ReviewsSection
              reviews={reviews}
              rating={rating}
              reviewCount={reviewCount}
            />

            {similar.length > 0 && (
              <div className="py-8">
                <h2 className="text-2xl font-black text-gray-900">
                  Similar trip packages
                </h2>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {similar.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/experiences/${item.id}`)}
                      className="group text-left"
                    >
                      <div className="overflow-hidden rounded-2xl bg-gray-100">
                        <img
                          src={item.image || item.image_url || images[0]}
                          alt={item.title}
                          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>

                      <h3 className="mt-3 line-clamp-2 text-sm font-bold text-gray-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        ₹{Number(item.price || 0).toLocaleString("en-IN")} /
                        person
                      </p>
                    </button>
                  ))}
                </div>
              </div>
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
            />
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PackageGallery({ images, title, selectedImage, setSelectedImage }) {
  const main = images[selectedImage] || images[0];

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-[32px] bg-gray-100">
        <img
          src={main}
          alt={title}
          className="h-[360px] w-full object-cover md:h-[560px]"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 md:grid-cols-1">
        {images.slice(0, 5).map((img, index) => (
          <button
            key={`${img}-${index}`}
            onClick={() => setSelectedImage(index)}
            className={`overflow-hidden rounded-2xl border-2 bg-gray-100 ${
              selectedImage === index ? "border-[#7E4FF5]" : "border-transparent"
            }`}
          >
            <img
              src={img}
              alt={`${title} ${index + 1}`}
              className="h-20 w-full object-cover md:h-[104px]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function HostAvatar({ name }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F5F2FF] text-2xl font-black text-[#7E4FF5]">
      {String(name || "D").charAt(0).toUpperCase()}
    </div>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 text-[#7E4FF5]">{icon}</div>
      <h3 className="font-black text-gray-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
    </div>
  );
}

function ReviewsSection({ reviews, rating, reviewCount }) {
  return (
    <div className="border-b border-gray-200 py-8">
      <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
        <Star size={22} fill="black" />
        {rating ? rating.toFixed(2) : "New"} · {reviewCount} reviews
      </h2>

      {reviews.length === 0 ? (
        <p className="mt-4 text-gray-500">No reviews yet for this package.</p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {reviews.slice(0, 6).map((review) => (
            <div
              key={review.id}
              className="rounded-3xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 font-black">
                  {(review.guest_name || "G").charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">
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
                    size={14}
                    fill={
                      index < Math.round(Number(review.rating || 0))
                        ? "black"
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
}) {
  const hasDepartures = departures.length > 0;

  const remainingSeats = selectedDeparture
    ? Number(selectedDeparture.total_seats || 0) -
      Number(selectedDeparture.booked_seats || 0)
    : null;

  return (
    <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
      <div className="mb-5 flex items-end justify-between">
        <p>
          <span className="text-2xl font-black text-gray-900">
            ₹{price.toLocaleString("en-IN")}
          </span>{" "}
          <span className="text-gray-500">/ person</span>
        </p>

        <p className="flex items-center gap-1 text-sm font-bold">
          <Star size={14} fill="black" />
          {rating ? rating.toFixed(2) : "New"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-300">
        <div className="border-b border-gray-300 p-4">
          <label className="mb-2 block text-xs font-black uppercase text-gray-700">
            Choose departure
          </label>

          {hasDepartures ? (
            <div className="space-y-3">
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
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#7E4FF5] bg-[#F7F5FF]"
                        : "border-gray-200 bg-white hover:border-gray-900"
                    } ${
                      disabled
                        ? "cursor-not-allowed opacity-50 hover:border-gray-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-900">
                          {formatDisplayDate(departure.departure_date)}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {disabled
                            ? departure.status || "Unavailable"
                            : `${remaining} seats left`}
                        </p>
                      </div>

                      <span
                        className={`h-4 w-4 rounded-full border ${
                          active
                            ? "border-[#7E4FF5] bg-[#7E4FF5]"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>
          )}
        </div>

        <div className="p-4">
          <label className="mb-1 block text-xs font-black uppercase text-gray-700">
            Travelers
          </label>

          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-400" />

            <select
              value={travelers}
              onChange={(e) => setTravelers(Number(e.target.value))}
              className="w-full bg-transparent text-sm font-semibold outline-none"
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
            <p className="mt-2 text-xs font-semibold text-gray-500">
              {remainingSeats} seats available for selected departure
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleBookPackage}
        className="mt-5 w-full rounded-2xl py-4 text-base font-black text-white transition hover:scale-[1.01]"
        style={{ backgroundColor: BRAND }}
      >
        Book package
      </button>

      <p className="mt-3 text-center text-sm text-gray-500">
        You won't be charged yet
      </p>

      <div className="mt-6 space-y-3 border-t border-gray-200 pt-5 text-sm">
        <PriceRow
          label={`₹${price.toLocaleString("en-IN")} x ${travelers} traveler${
            travelers > 1 ? "s" : ""
          }`}
          value={`₹${subtotal.toLocaleString("en-IN")}`}
        />

        <PriceRow
          label="Service fee"
          value={`₹${serviceFee.toLocaleString("en-IN")}`}
        />

        <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-black">
          <span>Total</span>
          <span>₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-gray-600">
      <span className="underline underline-offset-4">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function parseList(value, fallback = []) {
  if (!value) return fallback;

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseItinerary(value) {
  if (!value) return [];

  return String(value)
    .split(/\n|Day\s*\d+:/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatInputDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function formatDisplayDate(value) {
  if (!value) return "No date";

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