import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function ResortDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [property, setProperty] = useState(null);
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
  }, [id]);

  const loadProperty = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/properties/${id}`);
      setProperty(res.data);
    } catch (err) {
      console.log("Property load failed:", err);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getNights = () => {
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diff = (end - start) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 1;
  };

  if (!property) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20">
          Loading property...
        </div>
      </div>
    );
  }

  const nights = getNights();
  const price = Number(property.price);
  const total = price * nights;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold">
            {property.title}
          </h1>

          <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">★ {property.rating}</span>
              <span className="text-gray-400">·</span>
              <button className="font-semibold underline">128 reviews</button>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{property.location}</span>
            </div>

            <Link
              to="/home"
              className="font-semibold text-[#8363F5] hover:underline"
            >
              ← Back to Marketplace
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-3xl overflow-hidden mb-10">
          <div className="md:col-span-2 md:row-span-2 h-72 md:h-[420px]">
            <img
              src={property.image}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>

          {[property.image, property.image, property.image, property.image].map(
            (img, index) => (
              <div key={index} className="hidden md:block h-[206px]">
                <img
                  src={img}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )
          )}
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
          <div>
            <div className="flex items-center justify-between border-b pb-7">
              <div>
                <h2 className="text-2xl font-semibold">
                  Entire {property.category} hosted by Staybnb Team
                </h2>

                <p className="text-gray-600 mt-1">
                  {property.guests} guests · {property.bedrooms} bedroom ·{" "}
                  {property.bathrooms} bath
                </p>
              </div>

              <div className="w-14 h-14 rounded-full bg-[#8363F5] text-white flex items-center justify-center font-bold text-xl">
                S
              </div>
            </div>

            <div className="space-y-6 border-b py-8">
              <div className="flex gap-4">
                <span className="text-2xl">✨</span>
                <div>
                  <h4 className="font-semibold">
                    Guest favorite property setup
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    One of the most loved homes on Staybnb based on verified
                    visitor feedback.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="text-2xl">📅</span>
                <div>
                  <h4 className="font-semibold">Free cancellation available</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Instant booking refund security is active for this stay.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-gray-700 leading-8 py-8 border-b">
              {property.description}
            </p>
          </div>

          <div>
            <div className="sticky top-24 rounded-3xl border border-gray-200 shadow-xl p-6 bg-white">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-2xl font-bold">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-gray-500 text-sm"> / night</span>
                </div>

                <span className="text-sm font-semibold">
                  ★ {property.rating}
                </span>
              </div>

              <div className="border border-gray-300 rounded-2xl mb-4">
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
                  <div
                    onClick={() => setGuestOpen(!guestOpen)}
                    className="p-3 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="block text-[11px] uppercase font-bold">
                        Guests
                      </span>
                      <p className="text-sm mt-1">
                        {totalGuests}{" "}
                        {totalGuests === 1 ? "guest" : "guests"}
                      </p>
                    </div>

                    <span className="text-xl">{guestOpen ? "⌃" : "⌄"}</span>
                  </div>

                  {guestOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-5">
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

                      <p className="text-xs text-gray-600 mt-4">
                        This place has a maximum of 5 guests, not including
                        infants. Pets aren't allowed.
                      </p>

                      <div className="flex justify-end mt-5">
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
                className="w-full h-14 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold text-lg transition shadow-lg"
              >
                Reserve Now
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                You won't be charged yet
              </p>

              <div className="space-y-4 mt-6 text-sm">
                <div className="flex justify-between">
                  <span className="underline text-gray-700">
                    ₹{price.toLocaleString("en-IN")} x {nights} nights
                  </span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between border-t pt-4 font-bold text-base">
                  <span>Total before taxes</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function DateBox({ label, date, open, setOpen, setDate, closeOther, border }) {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className={`relative p-3 cursor-pointer ${border ? "border-r" : ""}`}>
      <div
        onClick={() => {
          closeOther();
          setOpen(!open);
        }}
      >
        <span className="block text-[11px] uppercase font-bold">{label}</span>
        <p className="text-sm mt-1">
          {new Date(date).toLocaleDateString("en-IN")}
        </p>
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-[320px] rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl">
          <h3 className="font-bold mb-4">Select {label}</h3>

          <div className="grid grid-cols-7 gap-2 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-xs font-bold text-gray-400 py-1">
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
    <div className="flex items-center justify-between py-4">
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onMinus}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xl"
        >
          −
        </button>

        <span className="w-4 text-center">{value}</span>

        <button
          onClick={onPlus}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xl"
        >
          +
        </button>
      </div>
    </div>
  );
}