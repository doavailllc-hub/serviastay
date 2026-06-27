import { useMemo, useState } from "react";
import {
  CalendarDays,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Experiences() {
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

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
        "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80",
      tag: "Guest favorite",
    },
    {
      id: 2,
      title: "Saudi Coffee Tasting",
      location: "Diriyah",
      price: 45,
      rating: "4.91",
      reviews: 84,
      duration: "2 hours",
      groupSize: "Up to 8 guests",
      category: "Food",
      image:
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
      tag: "Cultural",
    },
    {
      id: 3,
      title: "Private City Night Tour",
      location: "Riyadh",
      price: 70,
      rating: "4.88",
      reviews: 96,
      duration: "3 hours",
      groupSize: "Private group",
      category: "City tour",
      image:
        "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
      tag: "Popular",
    },
    {
      id: 4,
      title: "Old Town Heritage Walk",
      location: "Jeddah",
      price: 60,
      rating: "4.94",
      reviews: 72,
      duration: "2.5 hours",
      groupSize: "Up to 10 guests",
      category: "Culture",
      image:
        "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
      tag: "Local expert",
    },
    {
      id: 5,
      title: "Luxury Red Sea Boat Trip",
      location: "Jeddah",
      price: 140,
      rating: "4.98",
      reviews: 51,
      duration: "5 hours",
      groupSize: "Up to 5 guests",
      category: "Adventure",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      tag: "Premium",
    },
    {
      id: 6,
      title: "Traditional Cooking Class",
      location: "Riyadh",
      price: 55,
      rating: "4.90",
      reviews: 63,
      duration: "3 hours",
      groupSize: "Up to 7 guests",
      category: "Food",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80",
      tag: "Family friendly",
    },
  ];

  const categories = [
    "All",
    "Adventure",
    "Food",
    "Culture",
    "City tour",
    "Premium",
  ];

  const filteredExperiences = useMemo(() => {
    let data = [...experiences];

    if (activeCategory !== "All") {
      data = data.filter((item) => item.category === activeCategory);
    }

    if (destination.trim()) {
      const q = destination.toLowerCase();

      data = data.filter((item) =>
        `${item.title} ${item.location} ${item.category}`
          .toLowerCase()
          .includes(q)
      );
    }

    return data;
  }, [destination, activeCategory]);

  const searchExperiences = () => {
    const searchArea = document.getElementById("popular-experiences");

    if (searchArea) {
      searchArea.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main>
        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-[#111]">
            <img
              src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=80"
              alt="Experiences"
              className="h-[520px] w-full object-cover opacity-70"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

            <div className="absolute inset-0 flex items-center">
              <div className="max-w-3xl px-6 md:px-12">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/80">
                  Staybnb Experiences
                </p>

                <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-7xl">
                  Book unique things to do, hosted by locals.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
                  Discover tours, food tastings, cultural walks, desert
                  adventures, and unforgettable activities.
                </p>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-12 md:right-12">
              <div className="grid gap-3 rounded-3xl bg-white p-3 shadow-2xl md:grid-cols-[1fr_220px_auto]">
                <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7F7] px-4">
                  <Search size={20} className="text-gray-400" />

                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Search destination or experience"
                    className="h-14 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7F7] px-4">
                  <CalendarDays size={20} className="text-gray-400" />

                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-14 flex-1 bg-transparent text-gray-900 outline-none"
                  />
                </div>

                <button
                  onClick={searchExperiences}
                  className="h-14 rounded-2xl bg-[3b71e6] px-8 font-bold text-white transition hover:bg-[#7152E8]"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-20 z-30 border-y border-gray-100 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-4 md:px-8">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setActiveCategory(item)}
                className={`whitespace-nowrap rounded-full border px-5 py-3 text-sm font-semibold transition ${
                  activeCategory === item
                    ? "border-[3b71e6] bg-[#F4F1FF] text-[3b71e6]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[3b71e6] hover:text-[3b71e6]"
                }`}
              >
                {item}
              </button>
            ))}

            <button className="ml-auto flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold hover:border-[3b71e6] hover:text-[3b71e6]">
              <SlidersHorizontal size={17} />
              Filters
            </button>
          </div>
        </section>

        <section
          id="popular-experiences"
          className="mx-auto max-w-7xl px-4 py-12 md:px-8"
        >
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Popular experiences
              </h2>

              <p className="mt-2 text-gray-500">
                Handpicked activities loved by guests.
              </p>
            </div>

            <p className="text-sm font-semibold text-gray-500">
              Showing {filteredExperiences.length} experiences
            </p>
          </div>

          {filteredExperiences.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-[#FAFAFC] p-14 text-center">
              <div className="mb-4 text-6xl">🧭</div>
              <h3 className="text-2xl font-bold">No experiences found</h3>
              <p className="mt-2 text-gray-500">
                Try another destination or category.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExperiences.map((item) => (
                <ExperienceCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
          <div className="grid gap-6 rounded-[32px] bg-[#F4F1FF] p-8 md:grid-cols-3 md:p-10">
            <Feature
              title="Hosted by experts"
              text="Local hosts bring personal knowledge and real stories."
            />

            <Feature
              title="Easy booking"
              text="Choose your date, group size, and book securely."
            />

            <Feature
              title="Guest support"
              text="Get help before, during, and after your experience."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ExperienceCard({ item }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold shadow">
          {item.tag}
        </span>

        <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white">
          <Heart size={18} />
        </button>
      </div>

      <div className="p-5">
        <div className="flex justify-between gap-4">
          <h3 className="line-clamp-2 text-lg font-bold text-gray-900">
            {item.title}
          </h3>

          <span className="flex items-center gap-1 text-sm font-semibold">
            <Star size={15} fill="black" />
            {item.rating}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1 text-gray-500">
          <MapPin size={15} />
          {item.location}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
          <span className="rounded-full bg-gray-100 px-3 py-1">
            {item.duration}
          </span>

          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <Users size={13} />
            {item.groupSize}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1">
            {item.reviews} reviews
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p>
            <span className="font-bold text-gray-900">${item.price}</span>{" "}
            <span className="text-gray-500">/ person</span>
          </p>

          <button className="rounded-xl bg-[3b71e6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7152E8]">
            View
          </button>
        </div>
      </div>
    </article>
  );
}

function Feature({ title, text }) {
  return (
    <div className="rounded-3xl bg-white p-6">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
    </div>
  );
}