import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://stay.dovail.com";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

const categories = [
  "All",
  "Family",
  "Honeymoon",
  "Adventure",
  "Weekend",
  "Luxury",
  "Group",
  "Budget",
];

const suggestions = [
  "Wayanad",
  "Dubai",
  "Riyadh",
  "Munnar",
  "Kochi",
  "Kozhikode",
  "Bengaluru",
  "Abu Dhabi",
];

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function toISO(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "Today";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function getImageUrl(item) {
  const image =
    item?.image ||
    item?.image_url ||
    item?.cover_image ||
    item?.thumbnail ||
    "";

  if (!image) return FALLBACK_IMAGE;
  if (image.startsWith("https://")) return image;

  if (image.startsWith("http://")) {
    try {
      const url = new URL(image);
      return `${SITE_URL}${url.pathname}`;
    } catch {
      return FALLBACK_IMAGE;
    }
  }

  if (image.startsWith("/uploads/")) return `${SITE_URL}${image}`;
  if (image.startsWith("uploads/")) return `${SITE_URL}/${image}`;

  return image;
}

export default function Experiences() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const [where, setWhere] = useState("");
  const [searchText, setSearchText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [guests, setGuests] = useState(1);
  const [activePanel, setActivePanel] = useState(null);
  const [viewMonth, setViewMonth] = useState(new Date());

  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPackages();
  }, [searchText, activeCategory, date, guests]);

  useEffect(() => {
    const close = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setActivePanel(null);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/experiences", {
        params: {
          search: searchText,
          category: activeCategory === "All" ? "" : activeCategory,
          date,
          guests,
        },
      });

      setPackages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Trip packages load failed:", err);
      setError("Unable to load trip packages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSuggestions = suggestions.filter((item) =>
    item.toLowerCase().includes(where.toLowerCase())
  );

  const sortedPackages = useMemo(() => {
    const data = [...packages];

    if (sortBy === "rating") {
      data.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    if (sortBy === "priceLow") {
      data.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }

    if (sortBy === "priceHigh") {
      data.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    if (sortBy === "duration") {
      data.sort(
        (a, b) => Number(a.package_days || 1) - Number(b.package_days || 1)
      );
    }

    return data;
  }, [packages, sortBy]);

  const handleSearch = () => {
    setSearchText(where.trim());
    setActivePanel(null);
  };

  const clearFilters = () => {
    setWhere("");
    setSearchText("");
    setDate(todayISO());
    setGuests(1);
    setActiveCategory("All");
    setSortBy("recommended");
    setActivePanel(null);
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="pt-24">
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 pb-6 md:px-8">
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-500">Explore</p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Trip packages
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Find complete travel packages with stay, transport, pickup and
                itinerary.
              </p>
            </div>

            <div ref={searchRef} className="relative max-w-5xl">
              <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md md:grid-cols-[1.2fr_1fr_0.8fr_auto]">
                <SearchBox
                  label="Destination"
                  active={activePanel === "where"}
                  icon={<Search size={16} />}
                  onClick={() => setActivePanel("where")}
                >
                  <input
                    value={where}
                    onChange={(e) => {
                      setWhere(e.target.value);
                      setActivePanel("where");
                    }}
                    onFocus={() => setActivePanel("where")}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search destination"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </SearchBox>

                <SearchBox
                  label="Date"
                  active={activePanel === "date"}
                  icon={<CalendarDays size={16} />}
                  onClick={() => setActivePanel("date")}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm font-medium text-gray-950"
                  >
                    {formatDate(date)}
                    <ChevronDown size={15} className="text-gray-400" />
                  </button>
                </SearchBox>

                <SearchBox
                  label="Travelers"
                  active={activePanel === "guests"}
                  icon={<Users size={16} />}
                  onClick={() => setActivePanel("guests")}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm font-medium text-gray-950"
                  >
                    {guests} traveler{guests > 1 ? "s" : ""}
                    <ChevronDown size={15} className="text-gray-400" />
                  </button>
                </SearchBox>

                <button
                  type="button"
                  onClick={handleSearch}
                  className="m-2 flex h-11 items-center justify-center rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] active:scale-[0.98]"
                >
                  Search
                </button>
              </div>

              {activePanel === "where" && (
                <DestinationDropdown
                  where={where}
                  suggestions={filteredSuggestions}
                  onClose={() => setActivePanel(null)}
                  onSelect={(value) => {
                    setWhere(value);
                    setSearchText(value);
                    setActivePanel("date");
                  }}
                />
              )}

              {activePanel === "date" && (
                <DateDropdown
                  value={date}
                  setValue={setDate}
                  viewMonth={viewMonth}
                  setViewMonth={setViewMonth}
                  onDone={() => setActivePanel("guests")}
                />
              )}

              {activePanel === "guests" && (
                <GuestDropdown
                  guests={guests}
                  setGuests={setGuests}
                  onDone={() => setActivePanel(null)}
                />
              )}

              {activePanel === "filters" && (
                <FilterDropdown
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  onDone={() => setActivePanel(null)}
                />
              )}
            </div>
          </div>
        </section>

        <section className="sticky top-20 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 md:px-8">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveCategory(item)}
                className={`min-w-fit rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.98] ${
                  activeCategory === item
                    ? "border-[#3b71e6] bg-[#eef4ff] text-[#3b71e6]"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="hidden h-10 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none transition hover:bg-gray-50 md:block"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Highest rated</option>
                <option value="priceLow">Lowest price</option>
                <option value="priceHigh">Highest price</option>
                <option value="duration">Shortest duration</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  setActivePanel(activePanel === "filters" ? null : "filters")
                }
                className="flex min-w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Popular packages
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Loading..."
                  : `${sortedPackages.length} packages available`}
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-[#3b71e6] hover:underline"
            >
              Clear filters
            </button>
          </div>

          {loading ? (
            <PackageSkeleton />
          ) : error ? (
            <StateBox>
              <h3 className="text-base font-medium text-red-600">{error}</h3>
              <button
                type="button"
                onClick={loadPackages}
                className="mt-4 rounded-xl bg-[#3b71e6] px-5 py-2 text-sm font-medium text-white"
              >
                Try again
              </button>
            </StateBox>
          ) : sortedPackages.length === 0 ? (
            <StateBox>
              <h3 className="text-lg font-semibold text-gray-950">
                No trip packages found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing destination, date or filters.
              </p>
            </StateBox>
          ) : (
            <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedPackages.map((item) => (
                <PackageCard
                  key={item.id}
                  item={item}
                  onClick={() =>
                    navigate(`/experiences/${item.id}`, {
                      state: {
                        selectedDate: date,
                        guests,
                      },
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SearchBox({ label, icon, children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[58px] items-center gap-3 border-b border-gray-100 px-4 py-2 text-left transition md:border-b-0 md:border-r ${
        active ? "bg-[#f8fbff]" : "bg-white hover:bg-gray-50"
      }`}
    >
      <div className={active ? "text-[#3b71e6]" : "text-gray-400"}>{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </button>
  );
}

function DestinationDropdown({ where, suggestions, onSelect, onClose }) {
  const list = suggestions.length ? suggestions : ["Wayanad", "Dubai", "Riyadh"];

  return (
    <div className="absolute left-0 top-[72px] z-50 w-full max-w-[420px] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-sm font-semibold text-gray-950">
          Suggested destinations
        </p>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-1">
        {list.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-gray-50 active:scale-[0.99]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
              <MapPin size={17} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-950">{item}</p>
              <p className="text-xs text-gray-500">Search packages in {item}</p>
            </div>

            {where === item && (
              <Check size={16} className="ml-auto text-[#3b71e6]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateDropdown({ value, setValue, viewMonth, setViewMonth, onDone }) {
  const days = useMemo(() => getMonthDays(viewMonth), [viewMonth]);
  const today = todayISO();
  const currentMonth = new Date();
  const isCurrentMonth =
    viewMonth.getFullYear() === currentMonth.getFullYear() &&
    viewMonth.getMonth() === currentMonth.getMonth();

  return (
    <div className="absolute left-1/2 top-[72px] z-50 w-[94vw] max-w-[420px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg md:left-[42%] md:translate-x-0">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          disabled={isCurrentMonth}
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={17} />
        </button>

        <p className="text-sm font-semibold text-gray-950">
          {viewMonth.toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`${day}-${index}`}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="h-10" />;

          const iso = toISO(day);
          const past = iso < today;
          const selected = value === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => setValue(iso)}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition active:scale-[0.95] ${
                selected
                  ? "bg-[#3b71e6] text-white"
                  : past
                  ? "cursor-not-allowed text-gray-300"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setValue(todayISO())}
          className="text-sm font-medium text-[#3b71e6] hover:underline"
        >
          Today
        </button>

        <button
          type="button"
          onClick={onDone}
          className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function GuestDropdown({ guests, setGuests, onDone }) {
  return (
    <div className="absolute right-0 top-[72px] z-50 w-[320px] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-950">Travelers</p>
          <p className="mt-1 text-sm text-gray-500">Select group size</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={guests <= 1}
            onClick={() => setGuests(Math.max(1, guests - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
          >
            -
          </button>

          <span className="w-5 text-center text-sm font-medium">{guests}</span>

          <button
            type="button"
            disabled={guests >= 10}
            onClick={() => setGuests(Math.min(10, guests + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-5 h-10 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
      >
        Done
      </button>
    </div>
  );
}

function FilterDropdown({
  sortBy,
  setSortBy,
  activeCategory,
  setActiveCategory,
  onDone,
}) {
  return (
    <div className="absolute right-0 top-[72px] z-50 w-[320px] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
      <p className="text-sm font-semibold text-gray-950">Filters</p>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Sort by
        </span>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#3b71e6]"
        >
          <option value="recommended">Recommended</option>
          <option value="rating">Highest rated</option>
          <option value="priceLow">Lowest price</option>
          <option value="priceHigh">Highest price</option>
          <option value="duration">Shortest duration</option>
        </select>
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Category
        </span>

        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#3b71e6]"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onDone}
        className="mt-5 h-10 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
      >
        Apply filters
      </button>
    </div>
  );
}

function PackageCard({ item, onClick }) {
  const [liked, setLiked] = useState(false);
  const image = getImageUrl(item);

  const price = Number(item.price || 0);
  const rating = Number(item.rating || 0);
  const days = Number(item.package_days || 1);
  const nights = Number(item.package_nights || Math.max(days - 1, 0));

  return (
    <article onClick={onClick} className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={image}
          alt={item.title || "Trip package"}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            if (event.currentTarget.src !== FALLBACK_IMAGE) {
              event.currentTarget.src = FALLBACK_IMAGE;
            }
          }}
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLiked((prev) => !prev);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-sm transition hover:bg-white active:scale-[0.95]"
          aria-label={liked ? "Remove from wishlist" : "Save package"}
        >
          <Heart
            size={18}
            className={liked ? "text-red-500" : "text-gray-800"}
            fill={liked ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-gray-950">
            {item.title || "Trip Package"}
          </h3>

          <div className="flex shrink-0 items-center gap-1 text-sm font-medium">
            <Star size={13} fill="currentColor" />
            {rating ? rating.toFixed(1) : "New"}
          </div>
        </div>

        <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
          <MapPin size={14} />
          {item.location || item.city || "Destination"}
        </p>

        <p className="mt-1 text-sm text-gray-500">
          {days} days · {nights} nights
        </p>

        <p className="mt-2 text-[15px] text-gray-700">
          <span className="font-semibold text-gray-950">
            ₹{price.toLocaleString("en-IN")}
          </span>{" "}
          / person
        </p>
      </div>
    </article>
  );
}

function PackageSkeleton() {
  return (
    <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index}>
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-100" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded-full bg-gray-100" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function StateBox({ children }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-center text-gray-500">
      {children}
    </div>
  );
}

function getMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const blanks = Array.from({ length: first.getDay() }, () => null);
  const days = Array.from(
    { length: daysInMonth },
    (_, i) => new Date(year, month, i + 1)
  );

  return [...blanks, ...days];
}
