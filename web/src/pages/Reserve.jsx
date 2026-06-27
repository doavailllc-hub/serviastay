import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "lucide-react";

import api from "../api/api";
import Navbar from "../components/Navbar";

export default function Reserve() {
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

  const totalGuests = adults + children;

  useEffect(() => {
    loadProperty();
    loadReviews();
  }, [id]);

  const loadProperty = async () => {
    try {
      const res = await api.get(`/properties/${id}`);
      setProperty(res.data);
    } catch (err) {
      console.log("Property load failed:", err);
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

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  if (!property) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-20">
          Loading property...
        </div>
      </div>
    );
  }

  const price = Number(property.price || 0);
  const subtotal = price * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + serviceFee + taxes;

  const images = [
    property.image,
    property.image,
    property.image,
    property.image,
    property.image,
  ];

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
            {property.title}
          </h1>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Star size={16} fill="black" />
              <span className="font-semibold">{property.rating || "5.0"}</span>
              <span>·</span>
              <button className="font-semibold underline">
                {reviews.length || 128} reviews
              </button>
              <span>·</span>
              <span className="flex items-center gap-1 text-gray-600">
                <MapPin size={15} />
                {property.location}
              </span>
            </div>

            <div className="flex gap-4 text-sm font-semibold">
              <button className="flex items-center gap-2 underline">
                <Share size={16} /> Share
              </button>

              <button className="flex items-center gap-2 underline">
                <Heart size={16} /> Save
              </button>
            </div>
          </div>
        </div>

        <section className="mb-12 grid grid-cols-1 gap-2 overflow-hidden rounded-3xl md:grid-cols-4">
          <div className="h-80 md:col-span-2 md:row-span-2 md:h-[430px]">
            <img
              src={images[0]}
              alt={property.title}
              className="h-full w-full object-cover"
            />
          </div>

          {images.slice(1).map((img, index) => (
            <div key={index} className="hidden h-[211px] md:block">
              <img
                src={img}
                alt={property.title}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_390px]">
          <div>
            <div className="border-b pb-8">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Entire {property.category} hosted by Staybnb Host
                  </h2>

                  <p className="mt-2 text-gray-600">
                    {property.guests} guests · {property.bedrooms} bedroom ·{" "}
                    {property.bathrooms} bath
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3b71e6] text-xl font-bold text-white">
                  S
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
              <h2 className="mb-4 text-2xl font-semibold">About this place</h2>

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
                    <span className="text-[#222]">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b py-8">
              <h2 className="mb-6 text-2xl font-semibold">
                Where you'll be
              </h2>

              <div className="flex h-80 items-center justify-center rounded-3xl bg-[#F4F1FF]">
                <div className="text-center">
                  <MapPin
                    size={42}
                    className="mx-auto mb-3 text-[#3b71e6]"
                  />
                  <h3 className="text-xl font-bold">{property.location}</h3>
                  <p className="mt-2 text-gray-500">
                    Map integration coming with Google Maps.
                  </p>
                </div>
              </div>
            </div>

            <div className="py-8">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
                <Star size={22} fill="black" />
                {property.rating || "5.0"} · {reviews.length || 0} reviews
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
                onClick={() =>
                  navigate("/checkout", {
                    state: {
                      property,
                      guests: totalGuests,
                      nights,
                      total,
                      checkin,
                      checkout,
                    },
                  })
                }
                className="h-14 w-full rounded-xl bg-[#3b71e6] text-lg font-semibold text-white shadow-lg transition hover:bg-[#7152E8]"
              >
                Reserve
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                You won't be charged yet
              </p>

              <div className="mt-6 space-y-4 text-sm">
                <PriceRow
                  label={`${formatINR(price)} x ${nights} nights`}
                  value={formatINR(subtotal)}
                  underline
                />

              

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
            <CalendarDays size={20} className="text-[#3b71e6]" />
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
                      ? "bg-[#3b71e6] text-white"
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