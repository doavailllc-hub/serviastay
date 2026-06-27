import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Heart,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND = "#7E4FF5";

const categories = [
  "All",
  "Desert",
  "Food",
  "Cooking",
  "Culture",
  "City",
  "Boat",
  "Adventure",
];

export default function Experiences() {
  const [where, setWhere] = useState("");
  const [searchText, setSearchText] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExperiences();
  }, [searchText, activeCategory]);

  const loadExperiences = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/experiences", {
        params: {
          search: searchText,
          category: activeCategory,
        },
      });

      setExperiences(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Experiences load failed:", err);
      setError("Unable to load experiences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sortedExperiences = useMemo(() => {
    const data = [...experiences];

    if (sortBy === "rating") {
      data.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    if (sortBy === "priceLow") {
      data.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }

    if (sortBy === "priceHigh") {
      data.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    return data;
  }, [experiences, sortBy]);

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
          <div className="mx-auto max-w-7xl px-4 pb-5 md:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Experiences
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  Book tours, food, culture and local activities.
                </p>
              </div>

              <div className="grid w-full max-w-3xl overflow-hidden rounded-full border border-gray-200 bg-white md:grid-cols-[1.3fr_1fr_0.8fr_auto]">
                <SearchBox label="Where" icon={<Search size={16} />}>
                  <input
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </SearchBox>

                <SearchBox label="Date" icon={<CalendarDays size={16} />}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </SearchBox>

                <SearchBox label="Guests" icon={<Users size={16} />}>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full cursor-pointer bg-transparent text-sm outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} guest{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </SearchBox>

                <button
                  onClick={handleSearch}
                  className="m-2 flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:bg-[#6F42EA]"
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
                className={`min-w-fit rounded-full border px-4 py-2 text-sm font-medium transition ${
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
                </select>
              </div>

              <button className="flex min-w-fit items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium transition hover:border-gray-950">
                <SlidersHorizontal size={16} />
                Filters
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-7 md:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-950 md:text-2xl">
                Popular experiences
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Loading..."
                  : `${sortedExperiences.length} experiences available`}
              </p>
            </div>

            <button
              onClick={clearFilters}
              className="text-sm font-medium text-gray-700 underline underline-offset-4"
            >
              Clear
            </button>
          </div>

          {loading ? (
            <StateBox>
              <Loader2 className="animate-spin" size={22} />
              <span className="text-sm font-medium">Loading experiences...</span>
            </StateBox>
          ) : error ? (
            <StateBox>
              <h3 className="text-base font-semibold text-red-600">{error}</h3>
              <button
                onClick={loadExperiences}
                className="mt-4 rounded-full px-5 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Try again
              </button>
            </StateBox>
          ) : sortedExperiences.length === 0 ? (
            <StateBox>
              <h3 className="text-lg font-semibold text-gray-950">
                No experiences found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing destination or filters.
              </p>
            </StateBox>
          ) : (
            <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedExperiences.map((item) => (
                <ExperienceCard key={item.id} item={item} />
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
    <div className="flex min-h-[56px] items-center gap-3 border-b border-gray-100 px-4 py-2 md:border-b-0 md:border-r">
      <div className="text-gray-400">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-gray-950">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function ExperienceCard({ item }) {
  const [liked, setLiked] = useState(false);

  const image =
    item.image ||
    item.image_url ||
    item.cover_image ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

  const price = Number(item.price || 0);
  const rating = Number(item.rating || 0);

  return (
    <article className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={image}
          alt={item.title || "Experience"}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <button
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
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-gray-950">
            {item.title}
          </h3>

          <div className="flex shrink-0 items-center gap-1 text-sm font-medium">
            <Star size={13} fill="currentColor" />
            {rating ? rating.toFixed(2) : "New"}
          </div>
        </div>

        <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
          <MapPin size={14} />
          {item.location || item.city || "Location"}
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Hosted by {item.host_name || item.host || "Local host"}
        </p>

        <p className="mt-2 text-[15px] text-gray-700">
          <span className="font-semibold text-gray-950">
            ₹{price.toLocaleString("en-IN")}
          </span>{" "}
          / guest
        </p>
      </div>
    </article>
  );
}

function StateBox({ children }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white text-center text-gray-500">
      {children}
    </div>
  );
}