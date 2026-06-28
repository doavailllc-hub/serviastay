import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Navigation,
  X,
  Minus,
  Plus,
} from "lucide-react";
import axios from "axios";

import Navbar from "../components/Navbar";
import PropertyCard from "../components/PropertyCard";
import Footer from "../components/Footer";

const BRAND = "#3b71e6";
const API_URL = "https://stay.dovail.com/api/properties";

function toISO(date) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export default function Home() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const [properties, setProperties] = useState([]);
  const [activePanel, setActivePanel] = useState(null);

  const [destination, setDestination] = useState("");
  const [checkin, setCheckin] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [viewMonth, setViewMonth] = useState(new Date());

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

  const totalGuests = adults + children;

  const destinations = [
    {
      name: "Nearby",
      icon: <Navigation size={20} />,
      desc: "Find stays around your current location",
    },
    {
      name: "Wayanad, India",
      icon: "🏞️",
      desc: "Nature stays, resorts and villas",
    },
    {
      name: "Kozhikode, India",
      icon: "🌴",
      desc: "Beach stays and city homes",
    },
    {
      name: "Riyadh, Saudi Arabia",
      icon: "🏙️",
      desc: "Modern apartments and premium stays",
    },
    {
      name: "Kochi, India",
      icon: "🌊",
      desc: "Backwaters, city stays and villas",
    },
    {
      name: "Bengaluru, India",
      icon: "🌆",
      desc: "Apartments near dining and work hubs",
    },
    {
      name: "Sulthan Bathery, India",
      icon: "⛰️",
      desc: "Hill stays and peaceful escapes",
    },
    {
      name: "Munnar, India",
      icon: "🍃",
      desc: "Tea gardens and mountain homes",
    },
  ];

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setActivePanel(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProperties = async () => {
    try {
      const res = await axios.get(API_URL);
      setProperties(res.data || []);
    } catch (err) {
      console.log("Properties load failed:", err);
    }
  };

  const dateLabel =
    checkin && checkout
      ? `${formatDisplayDate(checkin)} – ${formatDisplayDate(checkout)}`
      : checkin
      ? `${formatDisplayDate(checkin)} – Add checkout`
      : "Add dates";

  const guestLabel =
    totalGuests > 0
      ? `${totalGuests} ${totalGuests === 1 ? "guest" : "guests"}`
      : "Add guests";

  const handleDateClick = (date) => {
    if (!checkin || (checkin && checkout)) {
      setCheckin(date);
      setCheckout(null);
      return;
    }

    if (date <= checkin) {
      setCheckin(date);
      setCheckout(null);
      return;
    }

    setCheckout(date);
  };

  const clearDates = () => {
    setCheckin(null);
    setCheckout(null);
  };

  const handleSearch = () => {
    setActivePanel(null);

    const params = new URLSearchParams();

    if (destination) params.set("location", destination);
    if (checkin) params.set("checkin", toISO(checkin));
    if (checkout) params.set("checkout", toISO(checkout));
    if (totalGuests > 0) params.set("guests", String(totalGuests));
    if (adults > 0) params.set("adults", String(adults));
    if (children > 0) params.set("children", String(children));
    if (infants > 0) params.set("infants", String(infants));
    if (pets > 0) params.set("pets", String(pets));

    navigate(`/search-results?${params.toString()}`, {
      state: {
        destination,
        checkin: toISO(checkin),
        checkout: toISO(checkout),
        guests: totalGuests,
        adults,
        children,
        infants,
        pets,
      },
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <Navbar />

        <section className="hidden w-full justify-center bg-white px-4 pb-4 pt-3 md:flex">
          <div ref={searchRef} className="relative w-full max-w-[960px]">
            <div className="flex h-[64px] items-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
              <SearchButton
                title="Where"
                value={destination || "Search destinations"}
                active={activePanel === "where"}
                className="flex-[1.35]"
                onClick={() =>
                  setActivePanel(activePanel === "where" ? null : "where")
                }
              />

              <Divider />

              <SearchButton
                title="Check in"
                value={checkin ? formatDisplayDate(checkin) : "Add dates"}
                active={activePanel === "dates"}
                className="flex-1"
                onClick={() =>
                  setActivePanel(activePanel === "dates" ? null : "dates")
                }
              />

              <Divider />

              <SearchButton
                title="Check out"
                value={checkout ? formatDisplayDate(checkout) : "Add dates"}
                active={activePanel === "dates"}
                className="flex-1"
                onClick={() => setActivePanel("dates")}
              />

              <Divider />

              <div className="relative flex h-full flex-[1.15] items-center">
                <button
                  type="button"
                  onClick={() =>
                    setActivePanel(activePanel === "guests" ? null : "guests")
                  }
                  className={`flex h-full flex-1 flex-col justify-center rounded-full px-5 text-left transition ${
                    activePanel === "guests" ? "bg-gray-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xs font-medium text-gray-950">Who</span>
                  <span className="mt-0.5 truncate text-sm text-gray-500">
                    {guestLabel}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSearch}
                  className="mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#3b71e6] text-white transition hover:bg-[#2f63d8]"
                  aria-label="Search"
                >
                  <Search size={18} />
                </button>
              </div>
            </div>

            {activePanel === "where" && (
              <div className="absolute left-0 top-[78px] z-50 w-[430px] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-950">
                    Suggested destinations
                  </h3>

                  <button
                    onClick={() => setActivePanel(null)}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {destinations.map((place) => (
                    <button
                      key={place.name}
                      onClick={() => {
                        setDestination(place.name);
                        setActivePanel("dates");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-gray-50"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4ff] text-xl text-[#3b71e6]">
                        {place.icon}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-950">
                          {place.name}
                        </p>
                        <p className="text-sm text-gray-500">{place.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePanel === "dates" && (
              <DateRangeDropdown
                viewMonth={viewMonth}
                setViewMonth={setViewMonth}
                checkin={checkin}
                checkout={checkout}
                onDateClick={handleDateClick}
                onClear={clearDates}
                onDone={() => setActivePanel("guests")}
              />
            )}

            {activePanel === "guests" && (
              <div className="absolute right-0 top-[78px] z-50 w-[410px] rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
                <GuestRow
                  title="Adults"
                  subtitle="Ages 13 or above"
                  value={adults}
                  onMinus={() => setAdults(Math.max(1, adults - 1))}
                  onPlus={() => setAdults(adults + 1)}
                  minusDisabled={adults <= 1}
                />

                <GuestRow
                  title="Children"
                  subtitle="Ages 2–12"
                  value={children}
                  onMinus={() => setChildren(Math.max(0, children - 1))}
                  onPlus={() => setChildren(children + 1)}
                  minusDisabled={children <= 0}
                />

                <GuestRow
                  title="Infants"
                  subtitle="Under 2"
                  value={infants}
                  onMinus={() => setInfants(Math.max(0, infants - 1))}
                  onPlus={() => setInfants(infants + 1)}
                  minusDisabled={infants <= 0}
                />

                <GuestRow
                  title="Pets"
                  subtitle="Bringing a service animal?"
                  value={pets}
                  onMinus={() => setPets(Math.max(0, pets - 1))}
                  onPlus={() => setPets(pets + 1)}
                  minusDisabled={pets <= 0}
                  underline
                />

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setAdults(1);
                      setChildren(0);
                      setInfants(0);
                      setPets(0);
                    }}
                    className="text-sm font-medium text-[#3b71e6] hover:underline"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f63d8]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="px-4 pb-4 pt-3 md:hidden">
          <button
            onClick={() => setActivePanel("mobile")}
            className="flex w-full items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 text-left shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3b71e6] text-white">
              <Search size={18} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-950">
                {destination || "Where to?"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {dateLabel} · {guestLabel}
              </p>
            </div>
          </button>
        </section>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Popular homes
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Explore comfortable stays selected for location, quality and
              memorable trips.
            </p>
          </div>

          <button
            onClick={() => navigate("/search-results")}
            className="hidden rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-[#3b71e6] md:block"
          >
            View all
          </button>
        </div>

        {properties.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
              No properties found
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Add listings from the hosting section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function SearchButton({ title, value, active, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full flex-col justify-center rounded-full px-6 text-left transition ${className} ${
        active ? "bg-gray-50" : "hover:bg-gray-50"
      }`}
    >
      <span className="text-xs font-medium text-gray-950">{title}</span>
      <span className="mt-0.5 truncate text-sm text-gray-500">{value}</span>
    </button>
  );
}

function DateRangeDropdown({
  viewMonth,
  setViewMonth,
  checkin,
  checkout,
  onDateClick,
  onClear,
  onDone,
}) {
  const nextMonth = addMonths(viewMonth, 1);

  return (
    <div className="absolute left-1/2 top-[78px] z-50 w-[760px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="mx-auto mb-6 flex w-[240px] rounded-full bg-gray-100 p-1">
        <button className="flex-1 rounded-full bg-white py-2 text-sm font-medium shadow-sm">
          Dates
        </button>
        <button className="flex-1 rounded-full py-2 text-sm font-medium text-gray-500">
          Flexible
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          className="rounded-full p-2 transition hover:bg-gray-100"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="rounded-full p-2 transition hover:bg-gray-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <MonthCalendar
          monthDate={viewMonth}
          checkin={checkin}
          checkout={checkout}
          onDateClick={onDateClick}
        />

        <MonthCalendar
          monthDate={nextMonth}
          checkin={checkin}
          checkout={checkout}
          onDateClick={onDateClick}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-[#3b71e6] hover:underline"
        >
          Clear dates
        </button>

        <button
          type="button"
          onClick={onDone}
          className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f63d8]"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function MonthCalendar({ monthDate, checkin, checkout, onDateClick }) {
  const days = useMemo(() => getMonthDays(monthDate), [monthDate]);
  const todayISO = toISO(new Date());

  return (
    <div>
      <h3 className="mb-4 text-center text-base font-semibold text-gray-950">
        {monthDate.toLocaleString("en-IN", {
          month: "long",
          year: "numeric",
        })}
      </h3>

      <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium text-gray-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center">
        {days.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="h-10" />;

          const iso = toISO(day);
          const past = iso < todayISO;
          const selected =
            (checkin && iso === toISO(checkin)) ||
            (checkout && iso === toISO(checkout));

          const inRange =
            checkin &&
            checkout &&
            iso > toISO(checkin) &&
            iso < toISO(checkout);

          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => onDateClick(day)}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                selected
                  ? "bg-[#3b71e6] text-white"
                  : inRange
                  ? "bg-[#eef4ff] text-[#3b71e6]"
                  : past
                  ? "cursor-not-allowed text-gray-300"
                  : "hover:bg-gray-100"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
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

function GuestRow({
  title,
  subtitle,
  value,
  onMinus,
  onPlus,
  minusDisabled,
  underline,
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-4 last:border-b-0">
      <div>
        <h4 className="text-sm font-medium text-gray-950">{title}</h4>
        <p className={`text-sm text-gray-500 ${underline ? "underline" : ""}`}>
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMinus}
          disabled={minusDisabled}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus size={14} />
        </button>

        <span className="w-5 text-center text-sm font-medium">{value}</span>

        <button
          type="button"
          onClick={onPlus}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-7 w-px shrink-0 bg-gray-200" />;
}