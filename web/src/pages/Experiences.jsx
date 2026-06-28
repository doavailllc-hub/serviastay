import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  Heart,
  Hotel,
  Loader2,
  MapPin,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  Utensils,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND = "#7E4FF5";

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

export default function Experiences() {
  const navigate = useNavigate();

  const [where, setWhere] = useState("");
  const [searchText, setSearchText] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPackages();
  }, [searchText, activeCategory]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/experiences", {
        params: {
          search: searchText,
          category: activeCategory,
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
  };

  const clearFilters = () => {
    setWhere("");
    setSearchText("");
    setDate("");
    setGuests(1);
    setActiveCategory("All");
    setSortBy("recommended");
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="pt-24">
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 pb-6 md:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_560px] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
                  Dovail Stay Packages
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                  Trip Packages
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 md:text-base">
                  Book complete travel packages with stays, transport, guides,
                  pickup, activities and curated day-wise itineraries.
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-gray-600">
                  <TrustPill icon={<Hotel size={16} />} text="Hotel included" />
                  <TrustPill icon={<Route size={16} />} text="Transport" />
                  <TrustPill icon={<ShieldCheck size={16} />} text="Verified packages" />
                </div>
              </div>

              <div className="grid w-full overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_14px_40px_rgba(0,0,0,0.10)] md:grid-cols-[1.2fr_1fr_0.8fr_auto]">
                <SearchBox label="Destination" icon={<Search size={16} />}>
                  <input
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Where to?"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </SearchBox>

                <SearchBox label="Travel date" icon={<CalendarDays size={16} />}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </SearchBox>

                <SearchBox label="Travelers" icon={<Users size={16} />}>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full cursor-pointer bg-transparent text-sm outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} traveler{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </SearchBox>

                <button
                  onClick={handleSearch}
                  className="m-2 flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white transition hover:scale-[1.02]"
                  style={{ backgroundColor: BRAND }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-20 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-3 md:px-8">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setActiveCategory(item)}
                className={`min-w-fit rounded-full border px-4 py-2 text-sm font-bold transition ${
                  activeCategory === item
                    ? "border-gray-950 bg-gray-950 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-950 hover:text-gray-950"
                }`}
              >
                {item}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 md:flex">
                <span>Sort</span>
                <ChevronDown size={14} />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="cursor-pointer bg-transparent outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="rating">Highest rated</option>
                  <option value="priceLow">Lowest price</option>
                  <option value="priceHigh">Highest price</option>
                  <option value="duration">Shortest duration</option>
                </select>
              </div>

              <button className="flex min-w-fit items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold transition hover:border-gray-950">
                <SlidersHorizontal size={16} />
                Filters
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-950 md:text-2xl">
                Popular trip packages
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Loading..."
                  : `${sortedPackages.length} packages available`}
              </p>
            </div>

            <button
              onClick={clearFilters}
              className="text-sm font-bold text-gray-700 underline underline-offset-4"
            >
              Clear
            </button>
          </div>

          {loading ? (
            <StateBox>
              <Loader2 className="animate-spin" size={22} />
              <span className="text-sm font-semibold">Loading trip packages...</span>
            </StateBox>
          ) : error ? (
            <StateBox>
              <h3 className="text-base font-semibold text-red-600">{error}</h3>
              <button
                onClick={loadPackages}
                className="mt-4 rounded-full px-5 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Try again
              </button>
            </StateBox>
          ) : sortedPackages.length === 0 ? (
            <StateBox>
              <h3 className="text-lg font-black text-gray-950">
                No trip packages found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing destination, date or filters.
              </p>
            </StateBox>
          ) : (
            <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedPackages.map((item) => (
                <PackageCard
                  key={item.id}
                  item={item}
                  onClick={() => navigate(`/experiences/${item.id}`)}
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

function SearchBox({ label, icon, children }) {
  return (
    <div className="flex min-h-[62px] items-center gap-3 border-b border-gray-100 px-4 py-2 md:border-b-0 md:border-r">
      <div className="text-gray-400">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-wide text-gray-950">
          {label}
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function PackageCard({ item, onClick }) {
  const [liked, setLiked] = useState(false);

  const image =
    item.image ||
    item.image_url ||
    item.cover_image ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

  const price = Number(item.price || 0);
  const rating = Number(item.rating || 0);
  const days = Number(item.package_days || 1);
  const nights = Number(item.package_nights || Math.max(days - 1, 0));
  const includes = String(item.includes || "Hotel, Transport, Guide")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article onClick={onClick} className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={image}
          alt={item.title || "Trip package"}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm">
          {item.package_type || item.tag || "Trip Package"}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLiked((prev) => !prev);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-sm transition hover:scale-105"
        >
          <Heart
            size={18}
            className={liked ? "text-red-500" : "text-gray-900"}
            fill={liked ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[15px] font-black leading-6 text-gray-950">
            {item.title || "Trip Package"}
          </h3>

          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold">
            <Star size={13} fill="currentColor" />
            {rating ? rating.toFixed(2) : "New"}
          </div>
        </div>

        <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
          <MapPin size={14} />
          {item.location || item.city || "Destination"}
        </p>

        <p className="mt-1 text-sm font-semibold text-gray-700">
          {days} Days / {nights} Nights
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {includes.map((inc) => (
            <span
              key={inc}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600"
            >
              {inc}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-[15px] text-gray-700">
            <span className="font-black text-gray-950">
              ₹{price.toLocaleString("en-IN")}
            </span>{" "}
            / person
          </p>

          <span className="text-xs font-bold text-[#7E4FF5]">
            View package
          </span>
        </div>
      </div>
    </article>
  );
}

function TrustPill({ icon, text }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2">
      <span className="text-[#7E4FF5]">{icon}</span>
      {text}
    </span>
  );
}

function StateBox({ children }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white text-center text-gray-500">
      {children}
    </div>
  );
}