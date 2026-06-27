import { useMemo, useState } from "react";
import {
  CalendarDays,
  Car,
  ChefHat,
  Heart,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Services() {
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const services = [
    {
      id: 1,
      title: "Airport pickup",
      category: "Transport",
      location: "Riyadh",
      price: 45,
      rating: "4.92",
      reviews: 88,
      provider: "Riyadh Premium Cars",
      duration: "One-way transfer",
      image:
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
      tag: "Popular",
      icon: <Car size={18} />,
    },
    {
      id: 2,
      title: "Private chef",
      category: "Food",
      location: "At your stay",
      price: 120,
      rating: "4.98",
      reviews: 62,
      provider: "Chef Omar",
      duration: "Dinner service",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80",
      tag: "Guest favorite",
      icon: <ChefHat size={18} />,
    },
    {
      id: 3,
      title: "House cleaning",
      category: "Cleaning",
      location: "Riyadh",
      price: 35,
      rating: "4.89",
      reviews: 109,
      provider: "Sparkle Home Care",
      duration: "2 hours",
      image:
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
      tag: "Fast booking",
      icon: <Sparkles size={18} />,
    },
    {
      id: 4,
      title: "Laundry pickup",
      category: "Cleaning",
      location: "Riyadh",
      price: 25,
      rating: "4.86",
      reviews: 41,
      provider: "Fresh Laundry",
      duration: "24 hour return",
      image:
        "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80",
      tag: "Quick service",
      icon: <Sparkles size={18} />,
    },
    {
      id: 5,
      title: "Home spa session",
      category: "Wellness",
      location: "At your stay",
      price: 85,
      rating: "4.95",
      reviews: 57,
      provider: "Calm Spa",
      duration: "90 minutes",
      image:
        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
      tag: "Relaxing",
      icon: <ShieldCheck size={18} />,
    },
    {
      id: 6,
      title: "Baby sitter",
      category: "Family",
      location: "Riyadh",
      price: 50,
      rating: "4.93",
      reviews: 35,
      provider: "Family Care Pro",
      duration: "Per hour",
      image:
        "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80",
      tag: "Trusted",
      icon: <Home size={18} />,
    },
  ];

  const categories = [
    "All",
    "Transport",
    "Food",
    "Cleaning",
    "Wellness",
    "Family",
  ];

  const filteredServices = useMemo(() => {
    let data = [...services];

    if (activeCategory !== "All") {
      data = data.filter((item) => item.category === activeCategory);
    }

    if (serviceQuery.trim()) {
      const q = serviceQuery.toLowerCase();

      data = data.filter((item) =>
        `${item.title} ${item.category} ${item.provider}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (locationQuery.trim()) {
      const q = locationQuery.toLowerCase();

      data = data.filter((item) =>
        `${item.location}`.toLowerCase().includes(q)
      );
    }

    return data;
  }, [serviceQuery, locationQuery, activeCategory]);

  const scrollToServices = () => {
    document
      .getElementById("popular-services")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Navbar />

      <main>
        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-[#111]">
            <img
              src="https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1800&q=80"
              alt="Services"
              className="h-[520px] w-full object-cover opacity-70"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

            <div className="absolute inset-0 flex items-center">
              <div className="max-w-3xl px-6 md:px-12">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/80">
                  Staybnb Services
                </p>

                <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-7xl">
                  Add trusted services to your stay.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
                  Book airport pickup, private chefs, cleaning, wellness,
                  family care, and more from trusted local providers.
                </p>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-12 md:right-12">
              <div className="grid gap-3 rounded-3xl bg-white p-3 shadow-2xl md:grid-cols-[1fr_220px_auto]">
                <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7F7] px-4">
                  <Search size={20} className="text-gray-400" />

                  <input
                    value={serviceQuery}
                    onChange={(e) => setServiceQuery(e.target.value)}
                    placeholder="What service do you need?"
                    className="h-14 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7F7] px-4">
                  <MapPin size={20} className="text-gray-400" />

                  <input
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Location"
                    className="h-14 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  onClick={scrollToServices}
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
          id="popular-services"
          className="mx-auto max-w-7xl px-4 py-12 md:px-8"
        >
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Popular services
              </h2>

              <p className="mt-2 text-gray-500">
                Helpful services for a comfortable stay.
              </p>
            </div>

            <p className="text-sm font-semibold text-gray-500">
              Showing {filteredServices.length} services
            </p>
          </div>

          {filteredServices.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-[#FAFAFC] p-14 text-center">
              <div className="mb-4 text-6xl">🛎️</div>

              <h3 className="text-2xl font-bold">No services found</h3>

              <p className="mt-2 text-gray-500">
                Try another service name, location, or category.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((item) => (
                <ServiceCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
          <div className="grid gap-6 rounded-[32px] bg-[#F4F1FF] p-8 md:grid-cols-3 md:p-10">
            <Feature
              title="Trusted providers"
              text="Services are listed by experienced local professionals."
            />

            <Feature
              title="Book for your stay"
              text="Add helpful services before or during your trip."
            />

            <Feature
              title="Secure support"
              text="Get help from support if your service needs changes."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ServiceCard({ item }) {
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
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[3b71e6]">
          {item.icon}
          {item.category}
        </div>

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
            {item.provider}
          </span>

          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <CalendarDays size={13} />
            {item.duration}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1">
            {item.reviews} reviews
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p>
            <span className="font-bold text-gray-900">${item.price}</span>{" "}
            <span className="text-gray-500">/ service</span>
          </p>

          <button className="rounded-xl bg-[3b71e6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7152E8]">
            Book
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