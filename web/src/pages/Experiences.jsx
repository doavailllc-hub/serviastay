import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const experiences = [
  {
    id: 1,
    title: "Desert Safari Adventure",
    location: "Riyadh, Saudi Arabia",
    price: 95,
    rating: "4.96",
    reviews: 128,
    duration: "4 hours",
    groupSize: "Up to 6 guests",
    category: "Adventure",
    image:
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1400&q=80",
    tag: "Guest favorite",
  },
  {
    id: 2,
    title: "Saudi Coffee Tasting",
    location: "Diriyah, Saudi Arabia",
    price: 45,
    rating: "4.91",
    reviews: 84,
    duration: "2 hours",
    groupSize: "Up to 8 guests",
    category: "Food",
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1400&q=80",
    tag: "Cultural",
  },
  {
    id: 3,
    title: "Private City Night Tour",
    location: "Riyadh, Saudi Arabia",
    price: 70,
    rating: "4.88",
    reviews: 96,
    duration: "3 hours",
    groupSize: "Private group",
    category: "City tour",
    image:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1400&q=80",
    tag: "Popular",
  },
  {
    id: 4,
    title: "Old Town Heritage Walk",
    location: "Jeddah, Saudi Arabia",
    price: 60,
    rating: "4.94",
    reviews: 72,
    duration: "2.5 hours",
    groupSize: "Up to 10 guests",
    category: "Culture",
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1400&q=80",
    tag: "Local expert",
  },
  {
    id: 5,
    title: "Luxury Red Sea Boat Trip",
    location: "Jeddah, Saudi Arabia",
    price: 140,
    rating: "4.98",
    reviews: 51,
    duration: "5 hours",
    groupSize: "Up to 5 guests",
    category: "Premium",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    tag: "Premium",
  },
  {
    id: 6,
    title: "Traditional Cooking Class",
    location: "Riyadh, Saudi Arabia",
    price: 55,
    rating: "4.90",
    reviews: 63,
    duration: "3 hours",
    groupSize: "Up to 7 guests",
    category: "Food",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=80",
    tag: "Family friendly",
  },
];

const categories = ["All", "Adventure", "Food", "Culture", "City tour", "Premium"];

export default function Experiences() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("recommended");

  const filteredExperiences = useMemo(() => {
    let data = [...experiences];

    if (activeCategory !== "All") {
      data = data.filter((item) => item.category === activeCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((item) =>
        `${item.title} ${item.location} ${item.category}`.toLowerCase().includes(q)
      );
    }

    if (sort === "price-low") data.sort((a, b) => a.price - b.price);
    if (sort === "rating") data.sort((a, b) => Number(b.rating) - Number(a.rating));

    return data;
  }, [query, activeCategory, sort]);

  const scrollToResults = () => {
    document.getElementById("popular-experiences")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main>
        <section className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
          <div className="relative overflow-hidden rounded-[36px] bg-black">
            <img
              src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2200&q=85"
              alt="Experiences"
              className="h-[560px] w-full object-cover opacity-75"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

            <div className="absolute inset-0 flex items-center">
              <div className="max-w-3xl px-6 md:px-14">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-white/80">
                  Dovail Experiences
                </p>

                <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-7xl">
                  Book unforgettable things to do.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
                  Explore local tours, food tastings, cultural walks, desert trips,
                  private activities, and premium experiences hosted by experts.
                </p>

                <button
                  onClick={scrollToResults}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black transition hover:bg-gray-100"
                >
                  Explore experiences
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="absolute bottom-6 left-4 right-4 md:bottom-10 md:left-14 md:right-14">
              <div className="grid gap-3 rounded-[28px] bg-white p-3 shadow-2xl md:grid-cols-[1fr_230px_190px_auto]">
                <SearchField
                  icon={<Search size={20} />}
                  value={query}
                  onChange={setQuery}
                  placeholder="Search destination or experience"
                />

                <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7F7] px-4">
                  <CalendarDays size={20} className="text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-14 flex-1 bg-transparent text-sm font-semibold outline-none"
                  />
                </div>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-14 rounded-2xl bg-[#F7F7F7] px-4 text-sm font-semibold outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Lowest price</option>
                  <option value="rating">Top rated</option>
                </select>

                <button
                  onClick={scrollToResults}
                  className="h-14 rounded-2xl bg-[#E21D5B] px-8 font-black text-white transition hover:bg-[#d61554]"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-[82px] z-30 border-y border-gray-100 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 overflow-x-auto px-4 py-4 md:px-8">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setActiveCategory(item)}
                className={`whitespace-nowrap rounded-full border px-5 py-3 text-sm font-bold transition ${
                  activeCategory === item
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black"
                }`}
              >
                {item}
              </button>
            ))}

            <button className="ml-auto flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 px-5 py-3 text-sm font-bold hover:border-black">
              <SlidersHorizontal size={17} />
              Filters
            </button>
          </div>
        </section>

        <section id="popular-experiences" className="mx-auto max-w-[1500px] px-4 py-12 md:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900">
                Popular experiences
              </h2>
              <p className="mt-2 text-gray-500">
                Handpicked activities loved by guests.
              </p>
            </div>

            <p className="text-sm font-bold text-gray-500">
              Showing {filteredExperiences.length} experiences
            </p>
          </div>

          {filteredExperiences.length === 0 ? (
            <div className="rounded-[32px] border border-gray-100 bg-[#FAFAFC] p-14 text-center">
              <div className="mb-4 text-6xl">🧭</div>
              <h3 className="text-2xl font-black">No experiences found</h3>
              <p className="mt-2 text-gray-500">Try another destination or category.</p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredExperiences.map((item) => (
                <ExperienceCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-[1500px] px-4 pb-16 md:px-8">
          <div className="grid gap-6 rounded-[36px] bg-[#F7F7F7] p-8 md:grid-cols-3 md:p-10">
            <Feature title="Hosted by experts" text="Local hosts bring personal knowledge, hidden spots, and real stories." />
            <Feature title="Easy booking" text="Choose your date, group size, and reserve securely in a few clicks." />
            <Feature title="Guest support" text="Get help before, during, and after your experience." />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SearchField({ icon, value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7F7] px-4">
      <span className="text-gray-400">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

function ExperienceCard({ item }) {
  return (
    <article className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-[26px] bg-gray-100">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="aspect-[4/4.5] w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black shadow">
          {item.tag}
        </span>

        <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white">
          <Heart size={18} />
        </button>
      </div>

      <div className="pt-3">
        <div className="flex justify-between gap-3">
          <h3 className="line-clamp-2 font-black text-gray-900">{item.title}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold">
            <Star size={14} fill="black" />
            {item.rating}
          </span>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
          <MapPin size={14} />
          {item.location}
        </p>

        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Clock size={13} />
            {item.duration}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={13} />
            {item.groupSize}
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-500">{item.reviews} reviews</p>

        <p className="mt-2">
          <span className="font-black text-gray-900">${item.price}</span>{" "}
          <span className="text-gray-500">/ person</span>
        </p>
      </div>
    </article>
  );
}

function Feature({ title, text }) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
    </div>
  );
}