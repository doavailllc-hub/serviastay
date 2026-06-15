import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Star,
  Share,
  Heart,
  MapPin,
  Wifi,
  Car,
  Utensils,
  Waves,
  Wind,
  Tv,
  CalendarDays,
  MessageCircle,
} from "lucide-react";

import api from "../api/api";
import Navbar from "../components/Navbar";
import ImageGallery from "../components/ImageGallery";
import PropertyMap from "../components/PropertyMap";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SimilarProperties from "../components/SimilarProperties";

export default function ResortDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [guestOpen, setGuestOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [checkin, setCheckin] = useState("2026-06-12");
  const [checkout, setCheckout] = useState("2026-06-14");

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [sharing, setSharing] = useState(false);

  const totalGuests = adults + children;

  useEffect(() => {
    loadProperty();
    loadReviews();
  }, [id]);

  const getStoredUser = () =>
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const saveRecentlyViewed = (item) => {
    if (!item?.id) return;

    const oldItems =
      JSON.parse(localStorage.getItem("recentlyViewedProperties")) || [];

    const filtered = oldItems.filter(
      (oldItem) => Number(oldItem.id) !== Number(item.id)
    );

    const updated = [
      {
        id: item.id,
        title: item.title,
        location: item.location,
        image: item.image,
        price: item.price,
        rating: item.rating,
        category: item.category,
        guests: item.guests,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        viewedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 12);

    localStorage.setItem("recentlyViewedProperties", JSON.stringify(updated));
  };

  const loadProperty = async () => {
    try {
      const res = await api.get(`/properties/${id}`);
      setProperty(res.data);
      saveRecentlyViewed(res.data);
    } catch (err) {
      console.log("Property load failed:", err);
      alert("Property failed to load");
      navigate("/home");
    }
  };

  const loadReviews = async () => {
    try {
      const res = await api.get(`/reviews/${id}`);
      setReviews(res.data || []);
    } catch (err) {
      console.log("Reviews load failed:", err);
    }
  };

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const requireLogin = () => {
    const user = getStoredUser();
    const token = getToken();

    if (!user || !token) {
      alert("Please login first");
      navigate("/");
      return null;
    }

    return user;
  };

  const shareProperty = async () => {
    try {
      if (!property) return;

      setSharing(true);

      const url = window.location.href;
      const title = property.title || "Staybnb property";
      const text =
        property.description ||
        `Check out this property in ${property.location || "Staybnb"}`;

      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Property link copied to clipboard");
      } else {
        window.prompt("Copy this property link:", url);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.log("Share failed:", err);
        alert("Unable to share property");
      }
    } finally {
      setSharing(false);
    }
  };

  const checkAvailabilityAndReserve = async () => {
    try {
      const user = requireLogin();
      if (!user) return;

      if (!property?.id) {
        alert("Property not found");
        return;
      }

      if (new Date(checkout) <= new Date(checkin)) {
        alert("Checkout date must be after check-in date.");
        return;
      }

      if (totalGuests > Number(property.guests || 1)) {
        alert(`This property allows maximum ${property.guests || 1} guests.`);
        return;
      }

      setCheckingAvailability(true);

      const res = await api.post("/check-availability", {
        property_id: property.id,
        checkin,
        checkout,
      });

      if (!res.data.available) {
        alert(res.data.message || "This property is not available.");
        return;
      }

      navigate("/checkout", {
        state: {
          property,
          guests: totalGuests,
          adults,
          children,
          infants,
          pets,
          nights,
          total,
          checkin,
          checkout,
        },
      });
    } catch (err) {
      console.log("Availability check failed:", err);
      alert("Availability check failed. Please try again.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const saveToWishlist = async () => {
    try {
      const user = requireLogin();
      if (!user) return;

      if (!property?.id) {
        alert("Property not found");
        return;
      }

      setSavingWishlist(true);

      await api.post("/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });

      alert("Saved to wishlist ❤️");
    } catch (err) {
      console.log("Wishlist failed:", err);

      if (err.response?.status === 409) {
        alert("Already saved in wishlist");
        return;
      }

      alert("Unable to save wishlist");
    } finally {
      setSavingWishlist(false);
    }
  };

  const startChatWithHost = async () => {
    try {
      const user = requireLogin();
      if (!user) return;

      if (!property?.user_id) {
        alert("Host information unavailable");
        return;
      }

      if (Number(user.id) === Number(property.user_id)) {
        alert("This is your own listing");
        return;
      }

      setStartingChat(true);

      await api.post("/messages", {
        sender_id: user.id,
        receiver_id: property.user_id,
        property_id: property.id,
        message: `Hi, I am interested in your property: ${property.title}`,
      });

      navigate("/messages");
    } catch (err) {
      console.log("Start chat failed:", err);
      alert("Unable to start chat");
    } finally {
      setStartingChat(false);
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading property...
        </main>
      </div>
    );
  }

  const price = Number(property.price || 0);

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const subtotal = price * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + serviceFee + taxes;

  const amenities = [
    { icon: <Wifi size={24} />, label: "Wifi" },
    { icon: <Car size={24} />, label: "Free parking" },
    { icon: <Utensils size={24} />, label: "Kitchen" },
    { icon: <Waves size={24} />, label: "Pool" },
    { icon: <Wind size={24} />, label: "Air conditioning" },
    { icon: <Tv size={24} />, label: "TV" },
  ];

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold md:text-3xl">
            {property.title || "Property Details"}
          </h1>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Star size={16} fill="black" />

              <span className="font-semibold">
                {property.rating || "5.0"}
              </span>

              <span>·</span>

              <button className="font-semibold underline">
                {reviews.length} reviews
              </button>

              <span>·</span>

              <span className="flex items-center gap-1 text-gray-600">
                <MapPin size={15} />
                {property.location || "Location unavailable"}
              </span>
            </div>

            <div className="flex gap-4 text-sm font-semibold">
              <button
                onClick={shareProperty}
                disabled={sharing}
                className="flex items-center gap-2 underline transition hover:text-[#8363F5] disabled:opacity-60"
              >
                <Share size={16} />
                {sharing ? "Sharing..." : "Share"}
              </button>

              <button
                onClick={saveToWishlist}
                disabled={savingWishlist}
                className="flex items-center gap-2 underline transition hover:text-[#8363F5] disabled:opacity-60"
              >
                <Heart size={16} />
                {savingWishlist ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        <ImageGallery propertyId={property.id} coverImage={property.image} />

        <section className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_390px]">
          <div>
            <div className="border-b pb-8">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Entire {property.category || "home"} hosted by Staybnb Host
                  </h2>

                  <p className="mt-2 text-gray-600">
                    {property.guests || 1} guests · {property.bedrooms || 1}{" "}
                    bedroom · {property.bathrooms || 1} bath
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8363F5] text-xl font-bold text-white">
                <button
  onClick={() => navigate(`/host/${property.user_id}`)}
  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8363F5] text-xl font-bold text-white"
>
  S
</button>
                </div>
              </div>
            </div>

            <div className="space-y-6 border-b py-8">
              <Feature
                icon="🏆"
                title="Guest favorite"
                text="One of the most loved homes based on ratings, reviews, and reliability."
              />

              <Feature
                icon="📅"
                title="Free cancellation"
                text="Cancel before check-in according to the host cancellation policy."
              />

              <Feature
                icon="🔐"
                title="Secure booking"
                text="Your booking is protected by Staybnb secure reservation system."
              />
            </div>

            <div className="border-b py-8">
              <h2 className="mb-4 text-2xl font-semibold">
                About this place
              </h2>

              <p className="leading-8 text-gray-700">
                {property.description ||
                  "Enjoy a beautiful stay with premium comfort, peaceful surroundings, and everything you need for a relaxing trip."}
              </p>
            </div>

            <div className="border-b py-8">
              <h2 className="mb-6 text-2xl font-semibold">
                What this place offers
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                {amenities.map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b py-8">
              <h2 className="mb-6 text-2xl font-semibold">
                Where you&apos;ll be
              </h2>

              <PropertyMap property={property} />
            </div>

            <div className="py-8">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
                <Star size={22} fill="black" />
                {property.rating || "5.0"} · {reviews.length} reviews
              </h2>

              {reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold">
                            {review.fullname || "Guest"}
                          </h4>

                          <p className="text-sm text-gray-500">
                            Verified guest
                          </p>
                        </div>

                        <span className="font-semibold">
                          ⭐ {review.rating}
                        </span>
                      </div>

                      <p className="text-gray-700">{review.review}</p>
                    </div>
                  ))}
                </div>
              )}
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

              <div className="mb-4 rounded-2xl border border-gray-300">
                <div className="grid grid-cols-2 border-b">
                  <DateBox
                    label="Check-in"
                    date={checkin}
                    open={checkinOpen}
                    setOpen={setCheckinOpen}
                    setDate={setCheckin}
                    closeOther={() => setCheckoutOpen(false)}
                    border
                  />

                  <DateBox
                    label="Checkout"
                    date={checkout}
                    open={checkoutOpen}
                    setOpen={setCheckoutOpen}
                    setDate={setCheckout}
                    closeOther={() => setCheckinOpen(false)}
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setGuestOpen(!guestOpen)}
                    className="flex w-full items-center justify-between p-3 text-left"
                  >
                    <div>
                      <span className="block text-[11px] font-bold uppercase">
                        Guests
                      </span>

                      <p className="mt-1 text-sm">
                        {totalGuests}{" "}
                        {totalGuests === 1 ? "guest" : "guests"}
                      </p>
                    </div>

                    <span>{guestOpen ? "⌃" : "⌄"}</span>
                  </button>

                  {guestOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 rounded-2xl border bg-white p-5 shadow-2xl">
                      <GuestRow
                        title="Adults"
                        subtitle="Age 13+"
                        value={adults}
                        onMinus={() => setAdults(Math.max(1, adults - 1))}
                        onPlus={() => setAdults(adults + 1)}
                      />

                      <GuestRow
                        title="Children"
                        subtitle="Ages 2–12"
                        value={children}
                        onMinus={() =>
                          setChildren(Math.max(0, children - 1))
                        }
                        onPlus={() => setChildren(children + 1)}
                      />

                      <GuestRow
                        title="Infants"
                        subtitle="Under 2"
                        value={infants}
                        onMinus={() => setInfants(Math.max(0, infants - 1))}
                        onPlus={() => setInfants(infants + 1)}
                      />

                      <GuestRow
                        title="Pets"
                        subtitle="Bringing a service animal?"
                        value={pets}
                        onMinus={() => setPets(Math.max(0, pets - 1))}
                        onPlus={() => setPets(pets + 1)}
                      />

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setGuestOpen(false)}
                          className="font-semibold underline"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={checkAvailabilityAndReserve}
                disabled={checkingAvailability}
                className="h-14 w-full rounded-xl bg-[#8363F5] text-lg font-semibold text-white shadow-lg transition hover:bg-[#7152E8] disabled:opacity-60"
              >
                {checkingAvailability ? "Checking..." : "Reserve"}
              </button>

              <button
                onClick={startChatWithHost}
                disabled={startingChat}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                <MessageCircle size={18} />
                {startingChat ? "Opening chat..." : "Message Host"}
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                You won&apos;t be charged yet
              </p>

              <div className="mt-6 space-y-4 text-sm">
                <PriceRow
                  label={`${formatINR(price)} x ${nights} nights`}
                  value={formatINR(subtotal)}
                  underline
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
 <SimilarProperties propertyId={property.id} />
      </main>
    </div>
  );
}

function DateBox({ label, date, open, setOpen, setDate, closeOther, border }) {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className={`relative p-3 ${border ? "border-r" : ""}`}>
      <button
        onClick={() => {
          closeOther();
          setOpen(!open);
        }}
        className="w-full text-left"
      >
        <span className="block text-[11px] font-bold uppercase">{label}</span>

        <p className="mt-1 text-sm">
          {new Date(date).toLocaleDateString("en-IN")}
        </p>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[320px] rounded-3xl border bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Select {label}</h3>

            <CalendarDays size={20} className="text-[#8363F5]" />
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="py-1 text-xs font-bold text-gray-400">
                {d}
              </div>
            ))}

            {days.map((day) => {
              const value = `2026-06-${String(day).padStart(2, "0")}`;
              const active = value === date;

              return (
                <button
                  key={day}
                  onClick={() => {
                    setDate(value);
                    setOpen(false);
                  }}
                  className={`h-9 rounded-full text-sm font-semibold ${
                    active
                      ? "bg-[#8363F5] text-white"
                      : "hover:bg-[#F4F1FF]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GuestRow({ title, subtitle, value, onMinus, onPlus }) {
  return (
    <div className="flex items-center justify-between border-b py-4 last:border-b-0">
      <div>
        <h4 className="font-semibold">{title}</h4>

        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onMinus}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-400"
        >
          −
        </button>

        <span className="w-5 text-center">{value}</span>

        <button
          onClick={onPlus}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xl"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-4">
      <span className="text-2xl">{icon}</span>

      <div>
        <h4 className="font-semibold">{title}</h4>

        <p className="mt-1 text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function PriceRow({ label, value, underline }) {
  return (
    <div className="flex justify-between">
      <span className={underline ? "underline" : ""}>{label}</span>
      <span>{value}</span>
    </div>
  );
}