import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  Heart,
  Home,
  Hotel,
  Menu,
  Search,
  Share,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

const CURRENCY = "SR";

const tabs = [
  { id: "all", label: "All", icon: "🌍" },
  { id: "homes", label: "Homes", icon: "🏡" },
  { id: "experiences", label: "Experiences", icon: "🎈" },
  { id: "services", label: "Services", icon: "🛎️" },
];

const sections = [
  {
    id: "originals",
    title: "Airbnb Originals",
    subtitle: "Hosted by the world’s most interesting people",
    chip: "Original",
    items: [
      {
        id: 1,
        title: "Swim with a triathlete during the Tour de France",
        location: "Aix-les-Bains, France",
        price: 428,
        rating: 4.98,
        image:
          "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 2,
        title: "Play a match with soccer pros in Miami Stadium",
        location: "Miami Gardens, United States",
        price: 938,
        rating: 4.95,
        image:
          "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 3,
        title: "Youth training day with soccer pro Christine Press",
        location: "Glendale, United States",
        price: 563,
        rating: 4.97,
        image:
          "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 4,
        title: "Youth training day with soccer pro Ian Wright",
        location: "New York, United States",
        price: 563,
        rating: 4.99,
        image:
          "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 5,
        title: "Tour de France-inspired tasting menu at Frenchie",
        location: "Paris, France",
        price: 641,
        rating: 4.96,
        image:
          "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 6,
        title: "Carve marble with a third-generation sculptor",
        location: "Athens, Greece",
        price: 257,
        rating: 5.0,
        image:
          "https://images.unsplash.com/photo-1599032909756-5deb82fea3b8?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 7,
        title: "Craft a Georgia peach with a pro glassblower",
        location: "Atlanta, United States",
        price: 315,
        rating: 4.99,
        image:
          "https://images.unsplash.com/photo-1493106819501-66d381c466f1?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },
  {
    id: "dubai",
    title: "Experiences in Dubai",
    subtitle: "Popular with travelers from your area",
    chip: "Popular",
    items: [
      {
        id: 8,
        title: "Premium desert safari with dinner and live shows",
        location: "Dubai, United Arab Emirates",
        price: 179,
        rating: 4.92,
        image:
          "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 9,
        title: "Private Dubai dunes photoshoot experience",
        location: "Dubai, United Arab Emirates",
        price: 220,
        rating: 4.91,
        image:
          "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 10,
        title: "Old Dubai, souks, abra ride and street food walk",
        location: "Dubai, United Arab Emirates",
        price: 115,
        rating: 4.89,
        image:
          "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 11,
        title: "Luxury yacht cruise around Dubai Marina",
        location: "Dubai, United Arab Emirates",
        price: 340,
        rating: 4.96,
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 12,
        title: "Abu Dhabi grand mosque day trip",
        location: "Abu Dhabi, United Arab Emirates",
        price: 150,
        rating: 4.88,
        image:
          "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 13,
        title: "Sunrise hot air balloon over the desert",
        location: "Dubai, United Arab Emirates",
        price: 399,
        rating: 4.97,
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },
  {
    id: "riyadh",
    title: "Experiences in Riyadh",
    subtitle: "Local culture, food and adventure",
    chip: "Guest favorite",
    items: [
      {
        id: 14,
        title: "Traditional Saudi coffee tasting in Diriyah",
        location: "Riyadh, Saudi Arabia",
        price: 89,
        rating: 4.94,
        image:
          "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 15,
        title: "Riyadh night city tour with local guide",
        location: "Riyadh, Saudi Arabia",
        price: 120,
        rating: 4.86,
        image:
          "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 16,
        title: "Edge of the World private adventure",
        location: "Riyadh, Saudi Arabia",
        price: 260,
        rating: 4.98,
        image:
          "https://images.unsplash.com/photo-1682687982501-1e58ab814714?auto=format&fit=crop&w=900&q=85",
      },
      {
        id: 17,
        title: "Saudi home cooking class with dinner",
        location: "Riyadh, Saudi Arabia",
        price: 135,
        rating: 4.9,
        image:
          "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=85",
      },
    ],
  },
];

export default function Experiences() {
  const [activeTab, setActiveTab] = useState("experiences");
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [guests, setGuests] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const filteredSections = useMemo(() => {
    const q = where.trim().toLowerCase();

    if (!q) return sections;

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          `${item.title} ${item.location}`.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [where]);

  const toggleWish = (id) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#222222]">
      <header className="sticky top-0 z-50 border-b border-[#eeeeee] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1760px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-[#ff385c]">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ff385c] text-white">
              <Home size={19} />
            </div>
            <span className="hidden text-2xl font-black tracking-tight sm:block">
              staybnb
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 pb-4 pt-4 text-[15px] font-semibold transition ${
                  activeTab === tab.id
                    ? "text-black"
                    : "text-[#6a6a6a] hover:text-black"
                }`}
              >
                <span className="text-3xl">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-black" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/host"
              className="hidden rounded-full px-4 py-3 text-sm font-bold hover:bg-[#f7f7f7] md:block"
            >
              Become a host
            </Link>

            <button className="grid h-11 w-11 place-items-center rounded-full bg-[#f7f7f7] hover:bg-[#eeeeee]">
              <Globe2 size={18} />
            </button>

            <button className="flex h-11 items-center gap-3 rounded-full bg-[#f7f7f7] px-4 hover:bg-[#eeeeee]">
              <Menu size={20} />
            </button>
          </div>
        </div>

        <div className="mx-auto hidden max-w-[880px] px-4 pb-7 md:block">
          <SearchBar
            where={where}
            setWhere={setWhere}
            when={when}
            setWhen={setWhen}
            guests={guests}
            setGuests={setGuests}
          />
        </div>

        <div className="px-5 pb-4 md:hidden">
          <button
            onClick={() => setShowMobileSearch(true)}
            className="flex h-14 w-full items-center gap-4 rounded-full border border-gray-200 px-5 text-left shadow-md"
          >
            <Search size={18} />
            <div>
              <p className="text-sm font-bold">Where to?</p>
              <p className="text-xs text-gray-500">Anywhere · Any week · Add guests</p>
            </div>
          </button>
        </div>
      </header>

      {showMobileSearch && (
        <div className="fixed inset-0 z-[100] bg-white p-5 md:hidden">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">Search experiences</h2>
            <button
              onClick={() => setShowMobileSearch(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <MobileInput label="Where" value={where} onChange={setWhere} />
            <MobileInput label="When" value={when} onChange={setWhen} />
            <MobileInput label="Who" value={guests} onChange={setGuests} />
            <button
              onClick={() => setShowMobileSearch(false)}
              className="mt-4 h-14 w-full rounded-full bg-[#ff385c] font-black text-white"
            >
              Search
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1760px] px-5 py-12 md:px-10">
        {filteredSections.length === 0 ? (
          <div className="rounded-[32px] border border-gray-200 p-16 text-center">
            <Sparkles className="mx-auto mb-4" size={38} />
            <h2 className="text-2xl font-black">No experiences found</h2>
            <p className="mt-2 text-gray-500">Try another city or landmark.</p>
          </div>
        ) : (
          filteredSections.map((section, index) => (
            <ExperienceSection
              key={section.id}
              section={section}
              showLargeTitle={index === 1}
              wishlist={wishlist}
              toggleWish={toggleWish}
            />
          ))
        )}
      </main>
    </div>
  );
}

function SearchBar({ where, setWhere, when, setWhen, guests, setGuests }) {
  return (
    <div className="grid h-[68px] grid-cols-[1fr_1fr_1fr_64px] items-center rounded-full border border-gray-200 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.12)]">
      <SearchCell label="Where" placeholder="Search by city or landmark" value={where} onChange={setWhere} />
      <SearchCell label="When" placeholder="Add dates" value={when} onChange={setWhen} />
      <SearchCell label="Who" placeholder="Add guests" value={guests} onChange={setGuests} />

      <button className="mr-2 grid h-12 w-12 place-items-center rounded-full bg-[#ff385c] text-white transition hover:scale-105 hover:bg-[#e31c5f]">
        <Search size={20} strokeWidth={3} />
      </button>
    </div>
  );
}

function SearchCell({ label, placeholder, value, onChange }) {
  return (
    <div className="border-r border-gray-200 px-7 last:border-r-0">
      <p className="text-xs font-black text-black">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-500"
      />
    </div>
  );
}

function ExperienceSection({ section, showLargeTitle, wishlist, toggleWish }) {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    rowRef.current?.scrollBy({
      left: direction === "left" ? -700 : 700,
      behavior: "smooth",
    });
  };

  return (
    <section className="mb-12">
      {showLargeTitle && (
        <h1 className="mb-8 text-3xl font-black tracking-tight md:text-4xl">
          Popular with travelers from your area
        </h1>
      )}

      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black md:text-2xl">{section.title}</h2>
            <button className="grid h-8 w-8 place-items-center rounded-full bg-[#f7f7f7] hover:bg-[#eeeeee]">
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">{section.subtitle}</p>
        </div>

        <div className="hidden gap-2 md:flex">
          <button
            onClick={() => scroll("left")}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#f7f7f7] hover:bg-[#eeeeee]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#f7f7f7] hover:bg-[#eeeeee]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {section.items.map((item) => (
          <ExperienceCard
            key={item.id}
            item={item}
            chip={section.chip}
            liked={wishlist.includes(item.id)}
            onWish={() => toggleWish(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ExperienceCard({ item, chip, liked, onWish }) {
  return (
    <article className="group w-[245px] shrink-0 cursor-pointer sm:w-[260px] md:w-[270px]">
      <div className="relative overflow-hidden rounded-[18px] bg-gray-100">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="aspect-[1.05/1] w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">
          {chip === "Original" ? "🏅 Original" : chip}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onWish();
          }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white"
        >
          <Heart
            size={24}
            fill={liked ? "#ff385c" : "rgba(0,0,0,0.25)"}
            className={liked ? "text-[#ff385c]" : "text-white"}
          />
        </button>

        <button className="absolute right-3 top-14 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black shadow-sm opacity-0 transition group-hover:opacity-100">
          <Share size={15} />
        </button>
      </div>

      <div className="pt-3">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-5 text-black">
          {item.title}
        </h3>

        <p className="mt-1 text-sm text-gray-500">{item.location}</p>

        <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
          <span>
            From {CURRENCY} {item.price} / guest
          </span>
          <span>·</span>
          <Star size={13} fill="currentColor" />
          <span>{item.rating}</span>
        </div>
      </div>
    </article>
  );
}

function MobileInput({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-gray-200 p-4">
      <span className="text-xs font-black">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add details"
        className="mt-2 w-full outline-none"
      />
    </label>
  );
}