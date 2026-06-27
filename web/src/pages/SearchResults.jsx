import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  CalendarDays,
  MapPin,
  Users,
  X,
} from "lucide-react";
import api from "../api/api";

import Navbar from "../components/Navbar";
import PropertyCard from "../components/PropertyCard";

export default function SearchResults() {
  const location = useLocation();

  const searchData = location.state || {};
  const selectedDestination = searchData.destination || "";
  const selectedDate = searchData.date || "";
  const selectedGuests = searchData.guests || 0;

  const [properties, setProperties] = useState([]);

  const [destination, setDestination] = useState(selectedDestination);
  const [date, setDate] = useState(selectedDate);
  const [guests, setGuests] = useState(selectedGuests);

  const [destinationOpen, setDestinationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rating, setRating] = useState("");

  const keralaPlaces = [
    { name: "Kochi", icon: "🌊" },
    { name: "Munnar", icon: "⛰️" },
    { name: "Alleppey", icon: "🛶" },
    { name: "Wayanad", icon: "🌿" },
    { name: "Kovalam", icon: "🏖️" },
    { name: "Varkala", icon: "🌅" },
    { name: "Thekkady", icon: "🐘" },
    { name: "Kozhikode", icon: "🍽️" },
    { name: "Kannur", icon: "🏰" },
    { name: "Thrissur", icon: "🎭" },
  ];

  useEffect(() => {
    loadProperties();
  }, [destination, category, minPrice, maxPrice, rating, guests]);

  const loadProperties = async () => {
    try {
      const params = new URLSearchParams();

      if (destination) params.append("destination", destination);
      if (category) params.append("category", category);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (rating) params.append("rating", rating);
      if (guests) params.append("guests", guests);

      const res = await api.get(`/search-properties?${params.toString()}`);
      setProperties(res.data || []);
    } catch (err) {
      console.log("Search failed:", err);
    }
  };

  const clearFilters = () => {
    setDestination("");
    setDate("");
    setGuests(0);
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setRating("");
  };

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <Navbar />

        <section className="px-4 pb-5">
          <div className="relative mx-auto flex h-[66px] max-w-5xl items-center rounded-full border border-gray-200 bg-white shadow-[0_3px_18px_rgba(0,0,0,0.08)]">
            <SearchBox
              icon={<MapPin size={18} />}
              label="Where"
              value={destination || "Search Kerala"}
              onClick={() => {
                setDestinationOpen(!destinationOpen);
                setDateOpen(false);
                setGuestOpen(false);
                setFilterOpen(false);
              }}
            />

            <Divider />

            <SearchBox
              icon={<CalendarDays size={18} />}
              label="Date"
              value={date || "Add date"}
              onClick={() => {
                setDateOpen(!dateOpen);
                setDestinationOpen(false);
                setGuestOpen(false);
                setFilterOpen(false);
              }}
            />

            <Divider />

            <SearchBox
              icon={<Users size={18} />}
              label="Guests"
              value={guests > 0 ? `${guests} guests` : "Add guests"}
              onClick={() => {
                setGuestOpen(!guestOpen);
                setDestinationOpen(false);
                setDateOpen(false);
                setFilterOpen(false);
              }}
            />

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-[3b71e6] text-white"
            >
              <SlidersHorizontal size={18} />
            </button>

            {destinationOpen && (
              <Dropdown left="left-0" width="w-[380px]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">Destination autocomplete</h3>
                  <button onClick={() => setDestinationOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-2">
                  {keralaPlaces.map((place) => (
                    <button
                      key={place.name}
                      onClick={() => {
                        setDestination(place.name);
                        setDestinationOpen(false);
                      }}
                      className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left hover:bg-[#F4F1FF]"
                    >
                      <span className="text-2xl">{place.icon}</span>
                      <span className="font-semibold">{place.name}</span>
                    </button>
                  ))}
                </div>
              </Dropdown>
            )}

            {dateOpen && (
              <Dropdown left="left-[260px]" width="w-[420px]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">Choose date</h3>
                  <CalendarDays size={20} className="text-[3b71e6]" />
                </div>

                <div className="grid grid-cols-7 gap-2 text-center">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i} className="text-xs font-bold text-gray-400">
                      {d}
                    </div>
                  ))}

                  {Array.from({ length: 35 }).map((_, index) => {
                    const day = index + 1;
                    const value = `Jun ${day}`;
                    const active = date === value;

                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setDate(value);
                          setDateOpen(false);
                        }}
                        className={`h-10 rounded-full text-sm font-semibold ${
                          active
                            ? "bg-[3b71e6] text-white"
                            : "hover:bg-[#F4F1FF]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </Dropdown>
            )}

            {guestOpen && (
              <Dropdown left="right-[70px]" width="w-[380px]">
                <GuestRow
                  title="Guests"
                  subtitle="Adults and children"
                  value={guests}
                  onMinus={() => setGuests(Math.max(0, guests - 1))}
                  onPlus={() => setGuests(guests + 1)}
                />

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setGuestOpen(false)}
                    className="rounded-xl bg-[3b71e6] px-5 py-2 font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              </Dropdown>
            )}

            {filterOpen && (
              <Dropdown left="right-0" width="w-[430px]">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Filters</h3>
                  <button onClick={() => setFilterOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Category
                    </label>

                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-12 w-full rounded-xl border px-4 outline-none"
                    >
                      <option value="">Any category</option>
                      <option value="Villa">Villa</option>
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Resort">Resort</option>
                      <option value="Cabin">Cabin</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Min price
                      </label>
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="₹ Min"
                        className="h-12 w-full rounded-xl border px-4 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Max price
                      </label>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="₹ Max"
                        className="h-12 w-full rounded-xl border px-4 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Minimum rating
                    </label>

                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="h-12 w-full rounded-xl border px-4 outline-none"
                    >
                      <option value="">Any rating</option>
                      <option value="5">5.0</option>
                      <option value="4">4.0+</option>
                      <option value="3">3.0+</option>
                    </select>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      onClick={clearFilters}
                      className="font-semibold underline"
                    >
                      Clear all
                    </button>

                    <button
                      onClick={() => setFilterOpen(false)}
                      className="rounded-xl bg-[3b71e6] px-6 py-3 font-semibold text-white"
                    >
                      Show results
                    </button>
                  </div>
                </div>
              </Dropdown>
            )}
          </div>
        </section>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-10 lg:px-20">
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500">
            {properties.length} stays available
          </p>

          <h1 className="text-3xl font-bold text-gray-900">
            Search results
          </h1>

          <p className="mt-2 text-gray-500">
            {destination || "Kerala"} · {date || "Any date"} ·{" "}
            {guests > 0 ? `${guests} guests` : "Any guests"}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {category && <FilterChip text={category} clear={() => setCategory("")} />}
          {minPrice && <FilterChip text={`Min ₹${minPrice}`} clear={() => setMinPrice("")} />}
          {maxPrice && <FilterChip text={`Max ₹${maxPrice}`} clear={() => setMaxPrice("")} />}
          {rating && <FilterChip text={`${rating}+ rating`} clear={() => setRating("")} />}
        </div>

        {properties.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-[#FAFAFC] p-10 text-center">
            <h2 className="text-2xl font-bold">No homes found</h2>
            <p className="mt-2 text-gray-500">
              Try changing destination, price or rating.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SearchBox({ icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-full flex-1 items-center gap-3 rounded-full px-6 text-left hover:bg-gray-50"
    >
      <span className="text-[3b71e6]">{icon}</span>

      <div>
        <p className="text-xs font-bold text-black">{label}</p>
        <p className="text-sm text-[#717171]">{value}</p>
      </div>
    </button>
  );
}

function Dropdown({ children, left, width }) {
  return (
    <div
      className={`absolute top-[78px] z-50 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl ${left} ${width}`}
    >
      {children}
    </div>
  );
}

function GuestRow({ title, subtitle, value, onMinus, onPlus }) {
  return (
    <div className="flex items-center justify-between py-4">
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

        <span>{value}</span>

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

function FilterChip({ text, clear }) {
  return (
    <button
      onClick={clear}
      className="rounded-full bg-[#F4F1FF] px-4 py-2 text-sm font-semibold text-[3b71e6]"
    >
      {text} ×
    </button>
  );
}

function Divider() {
  return <div className="h-7 w-px bg-gray-200" />;
}