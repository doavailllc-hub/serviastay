import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CalendarDays,
  MapPin,
  Users,
  X,
} from "lucide-react";
import axios from "axios";

import Navbar from "../components/Navbar";
import PropertyCard from "../components/PropertyCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Footer from "../components/Footer";
export default function Home() {
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);

  const [destinationOpen, setDestinationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);

  const [destination, setDestination] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

  const totalGuests = adults + children;

  const keralaPlaces = [
    { name: "Kochi", icon: "🌊", desc: "City, backwaters and heritage" },
    { name: "Munnar", icon: "⛰️", desc: "Tea gardens and hill stays" },
    { name: "Alleppey", icon: "🛶", desc: "Houseboats and backwaters" },
    { name: "Wayanad", icon: "🌿", desc: "Nature, resorts and wildlife" },
    { name: "Kovalam", icon: "🏖️", desc: "Beach stays and resorts" },
    { name: "Varkala", icon: "🌅", desc: "Cliff beach and cafes" },
    { name: "Thekkady", icon: "🐘", desc: "Forest and spice plantations" },
    { name: "Kozhikode", icon: "🍽️", desc: "Food, beach and city stays" },
    { name: "Kannur", icon: "🏰", desc: "Beaches, forts and culture" },
    { name: "Thrissur", icon: "🎭", desc: "Culture and festival stays" },
  ];

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/properties");
      setProperties(res.data);
    } catch (err) {
      console.log("Properties load failed:", err);
    }
  };

  const closeAll = () => {
    setDestinationOpen(false);
    setDateOpen(false);
    setGuestOpen(false);
  };

  const handleSearch = () => {
    closeAll();

    navigate("/search-results", {
      state: {
        destination,
        date: selectedDate,
        guests: totalGuests,
        adults,
        children,
        infants,
        pets,
      },
    });
  };

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <Navbar />

        {/* Desktop Search */}
        <br></br>
        <section className="hidden w-full justify-center bg-white px-4 pb-5 md:flex">
          <div className="relative flex h-[66px] w-full max-w-[900px] items-center rounded-full border border-gray-200 bg-white shadow-[0_3px_18px_rgba(0,0,0,0.08)]">
            {/* Destination */}
            <div className="relative h-full flex-[1.4]">
              <button
                onClick={() => {
                  setDestinationOpen(!destinationOpen);
                  setDateOpen(false);
                  setGuestOpen(false);
                }}
                className="flex h-full w-full flex-col justify-center rounded-full px-6 text-left transition hover:bg-gray-50"
              >
                <label className="mb-0.5 text-xs font-bold text-black">
                  Where
                </label>

                <span className="text-sm text-[#717171]">
                  {destination || "Search Kerala destinations"}
                </span>
              </button>

              {destinationOpen && (
                <div className="absolute left-0 top-[78px] z-50 w-[430px] rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between px-3">
                    <h3 className="text-sm font-bold text-gray-900">
                      Major places in Kerala
                    </h3>

                    <button
                      onClick={() => setDestinationOpen(false)}
                      className="rounded-full p-1 hover:bg-gray-100"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {keralaPlaces.map((place) => (
                      <button
                        key={place.name}
                        onClick={() => {
                          setDestination(place.name);
                          setDestinationOpen(false);
                        }}
                        className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-[#F4F1FF]"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-2xl">
                          {place.icon}
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {place.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            {place.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Divider />

            {/* Date */}
            <div className="relative h-full flex-1">
              <button
                onClick={() => {
                  setDateOpen(!dateOpen);
                  setDestinationOpen(false);
                  setGuestOpen(false);
                }}
                className="flex h-full w-full flex-col justify-center rounded-full px-6 text-left transition hover:bg-gray-50"
              >
                <label className="mb-0.5 text-xs font-bold text-black">
                  Date
                </label>

                <span className="text-sm text-[#717171]">
                  {selectedDate || "Add date"}
                </span>
              </button>

              {dateOpen && (
                <div className="absolute left-1/2 top-[78px] z-50 w-[520px] -translate-x-1/2 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Choose your date</h3>
                      <p className="text-sm text-gray-500">
                        Select your travel date
                      </p>
                    </div>

                    <CalendarDays className="text-[#8363F5]" size={24} />
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <div
                        key={i}
                        className="py-2 text-xs font-bold text-gray-400"
                      >
                        {d}
                      </div>
                    ))}

                    {Array.from({ length: 35 }).map((_, index) => {
                      const day = index + 1;
                      const isActive = selectedDate === `Jun ${day}`;

                      return (
                        <button
                          key={day}
                          onClick={() => {
                            setSelectedDate(`Jun ${day}`);
                            setDateOpen(false);
                          }}
                          className={`h-11 rounded-full text-sm font-semibold transition ${
                            isActive
                              ? "bg-[#8363F5] text-white"
                              : "hover:bg-[#F4F1FF]"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Divider />

            {/* Guests */}
            <div className="relative h-full flex-1">
              <button
                onClick={() => {
                  setGuestOpen(!guestOpen);
                  setDestinationOpen(false);
                  setDateOpen(false);
                }}
                className="flex h-full w-full items-center justify-between rounded-full px-6 pr-2 text-left transition hover:bg-gray-50"
              >
                <div>
                  <label className="mb-0.5 block text-xs font-bold text-black">
                    Who
                  </label>

                  <span className="text-sm text-[#717171]">
                    {totalGuests > 0
                      ? `${totalGuests} ${
                          totalGuests === 1 ? "guest" : "guests"
                        }`
                      : "Add guests"}
                  </span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSearch();
                  }}
                  className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8363F5] text-white transition hover:bg-[#7152E8]"
                >
                  <Search size={20} className="text-white" />
                </div>
              </button>

              {guestOpen && (
                <div className="absolute right-0 top-[78px] z-50 w-[430px] rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                  <GuestRow
                    title="Adults"
                    subtitle="Ages 13 or above"
                    value={adults}
                    onMinus={() => setAdults(Math.max(0, adults - 1))}
                    onPlus={() => setAdults(adults + 1)}
                  />

                  <GuestRow
                    title="Children"
                    subtitle="Ages 2–12"
                    value={children}
                    onMinus={() => setChildren(Math.max(0, children - 1))}
                    onPlus={() => setChildren(children + 1)}
                  />

                  <GuestRow
                    title="Infants"
                    subtitle="Under 2"
                    value={infants}
                    onMinus={() => setInfants(Math.max(0, infants - 1))}
                    onPlus={() => setInfants(infants + 1)}
                  />

                  <GuestRow
                    title="Pets"
                    subtitle="Bringing a service animal?"
                    value={pets}
                    onMinus={() => setPets(Math.max(0, pets - 1))}
                    onPlus={() => setPets(pets + 1)}
                    underline
                  />

                  <div className="mt-5 flex justify-between">
                    <button
                      onClick={() => {
                        setAdults(0);
                        setChildren(0);
                        setInfants(0);
                        setPets(0);
                      }}
                      className="font-semibold underline"
                    >
                      Clear
                    </button>

                    <button
                      onClick={() => setGuestOpen(false)}
                      className="rounded-xl bg-[#8363F5] px-5 py-2 font-semibold text-white hover:bg-[#7152E8]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mobile Search */}
        <section className="px-4 pb-4 md:hidden">
          <button
            onClick={handleSearch}
            className="flex w-full items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-4 text-left shadow-md"
          >
            <Search size={18} />

            <div>
              <p className="text-sm font-bold">
                {destination || "Where to?"}
              </p>

              <p className="text-xs text-gray-500">
                Kerala · {selectedDate || "Any date"} ·{" "}
                {totalGuests > 0 ? `${totalGuests} guests` : "Add guests"}
              </p>
            </div>
          </button>
        </section>


      </header>

      {/* Body */}
      <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-10 lg:px-20">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-bold tracking-[-.3px]">
            Popular homes in Kerala
          </h2>

          <span
            onClick={() => navigate("/search-results")}
            className="cursor-pointer text-lg text-[#8363F5]"
          >
            →
          </span>
        </div>

        {properties.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-[#FAFAFC] p-10 text-center">
            <h2 className="text-2xl font-bold">No properties found</h2>
            <p className="mt-2 text-gray-500">
              Add listings from hosting section.
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
         <Footer />
    </div>
  );
}

function GuestRow({ title, subtitle, value, onMinus, onPlus, underline }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-5 last:border-b-0">
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>

        <p
          className={`text-sm text-gray-500 ${
            underline ? "underline" : ""
          }`}
        >
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onMinus}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-400"
        >
          −
        </button>

        <span className="w-5 text-center">{value}</span>

        <button
          onClick={onPlus}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-800"
        >
          +
        </button>
      </div>
      
    </div>
  );
}

function Divider() {
  return <div className="h-7 w-px shrink-0 bg-gray-200" />;
  
}