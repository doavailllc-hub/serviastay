import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Globe2,
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
  { name: "All", icon: "✨" },
  { name: "Desert", icon: "🏜️" },
  { name: "Food", icon: "🍽️" },
  { name: "Cooking", icon: "👨‍🍳" },
  { name: "Culture", icon: "🏛️" },
  { name: "City", icon: "🌃" },
  { name: "Boat", icon: "⛵" },
  { name: "Adventure", icon: "🚙" },
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
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main>
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 md:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-gray-400">
                  Dovail Stay Experiences
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
                  Find unforgettable things to do
                </h1>

                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-500">
                  Book local tours, food, culture, desert adventures, and unique
                  activities hosted by trusted locals.
                </p>
              </div>

              <div className="mx-auto mt-8 grid max-w-4xl overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.12)] md:grid-cols-[1.3fr_1fr_0.8fr_auto]">
                <SearchBox label="Where" icon={<Search size={18} />}>
                  <input
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="Search destinations"
                    className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </SearchBox>

                <SearchBox label="Date" icon={<CalendarDays size={18} />}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
                  />
                </SearchBox>

                <SearchBox label="Guests" icon={<Users size={18} />}>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full cursor-pointer bg-transparent text-sm font-semibold text-gray-900 outline-none"
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
                  className="m-2 flex h-14 items-center justify-center rounded-full px-7 font-bold text-white transition hover:scale-[1.02]"
                  style={{ backgroundColor: BRAND }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-4 md:px-8">
            {categories.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveCategory(item.name)}
                className={`flex min-w-fit flex-col items-center gap-1 border-b-2 px-3 pb-2 text-sm font-semibold transition ${
                  activeCategory === item.name
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 md:flex">
                <span>Sort</span>
                <ChevronDown size={15} />
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

              <button className="flex min-w-fit items-center gap-2 rounded-full border border-gray-200 px-5 py-3 text-sm font-bold transition hover:border-gray-900">
                <SlidersHorizontal size={17} />
                Filters
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-9 md:px-8">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                Popular experiences
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {loading
                  ? "Loading experiences..."
                  : `${sortedExperiences.length} experiences available`}
              </p>
            </div>

            <button
              onClick={clearFilters}
              className="w-fit text-sm font-bold underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-gray-100 bg-[#FAFAFC]">
              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="animate-spin" size={22} />
                <span className="font-semibold">Loading experiences...</span>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[32px] border border-red-100 bg-red-50 p-12 text-center">
              <h3 className="text-xl font-black text-red-700">{error}</h3>
              <button
                onClick={loadExperiences}
                className="mt-5 rounded-full px-6 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Try again
              </button>
            </div>
          ) : sortedExperiences.length === 0 ? (
            <div className="rounded-[32px] border border-gray-100 bg-[#FAFAFC] p-14 text-center">
              <div className="mb-4 text-6xl">🧭</div>
              <h3 className="text-2xl font-black text-gray-900">
                No experiences found
              </h3>
              <p className="mt-2 text-gray-500">
                Try changing your destination, category, or filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedExperiences.map((item) => (
                <ExperienceCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="grid gap-5 rounded-[32px] bg-[#F5F2FF] p-6 md:grid-cols-3 md:p-8">
            <Feature
              title="Verified local hosts"
              text="Every experience is designed by passionate local experts."
            />
            <Feature
              title="Easy booking"
              text="Choose your date, guests, and reserve in a few clicks."
            />
            <Feature
              title="Memorable activities"
              text="From desert safaris to food tours, discover something special."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SearchBox({ label, icon, children }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 border-b border-gray-100 px-5 py-3 transition hover:bg-gray-50 md:border-b-0 md:border-r">
      <div className="text-gray-400">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-gray-900">{label}</p>
        <div className="mt-1">{children}</div>
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
      <div className="relative overflow-hidden rounded-[24px] bg-gray-100">
        <img
          src={image}
          alt={item.title || "Experience"}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {item.tag && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-black shadow-sm">
            {item.tag}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setLiked((prev) => !prev);
          }}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 hover:bg-white"
        >
          <Heart
            size={19}
            className={liked ? "text-red-500" : "text-gray-900"}
            fill={liked ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-black leading-6 text-gray-900">
              {item.title}
            </h3>

            <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
              <MapPin size={14} />
              {item.location || item.city}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold">
            <Star size={14} fill="black" />
            {rating ? rating.toFixed(2) : "New"}
          </div>
        </div>

        <p className="mt-2 text-sm font-medium text-gray-500">
          Hosted by {item.host_name || item.host || "Local host"}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
          {item.duration && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              <Clock3 size={13} />
              {item.duration}
            </span>
          )}

          {item.group_size && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              <Users size={13} />
              {item.group_size}
            </span>
          )}

          {item.language && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              <Globe2 size={13} />
              {item.language}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-sm text-gray-500">
            <span className="text-base font-black text-gray-900">
              ₹{price.toLocaleString("en-IN")}
            </span>{" "}
            / guest
          </p>

          <p className="text-xs font-semibold text-gray-500">
            {Number(item.reviews || 0)} reviews
          </p>
        </div>
      </div>
    </article>
  );
}

function Feature({ title, text }) {
  return (
    <div className="rounded-[26px] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
    </div>
  );
}