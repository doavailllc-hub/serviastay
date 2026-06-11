import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { Search, SlidersHorizontal } from "lucide-react";

import Navbar from "../components/Navbar";
import PropertyCard from "../components/PropertyCard";

export default function SearchResults() {
  const location = useLocation();

  const searchData = location.state || {};
  const selectedDestination = searchData.destination || "";
  const selectedDate = searchData.date || "";
  const selectedGuests = searchData.guests || 0;

  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState(selectedDestination);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/properties");
      setProperties(res.data);
    } catch (err) {
      console.log("Search results load failed:", err);
    }
  };

  const filteredProperties = properties.filter((item) => {
    const text = `${item.title} ${item.location} ${item.category}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <Navbar />

        <section className="px-4 pb-5">
          <div className="mx-auto flex h-[58px] max-w-3xl items-center rounded-full border border-gray-200 bg-white px-5 shadow-[0_3px_18px_rgba(0,0,0,0.08)]">
            <Search size={20} className="text-[#8363F5]" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Kerala destinations"
              className="ml-3 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-gray-400"
            />

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8363F5] text-white">
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </section>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-10 lg:px-20">
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500">
            {filteredProperties.length} stays available
          </p>

          <h1 className="text-3xl font-bold text-gray-900">
            Search results
          </h1>

          <p className="mt-2 text-gray-500">
            {selectedDestination || "Kerala"} ·{" "}
            {selectedDate || "Any date"} ·{" "}
            {selectedGuests > 0
              ? `${selectedGuests} guests`
              : "Any guests"}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {["Price", "Type of place", "Rooms", "Rating", "Instant book"].map(
            (item) => (
              <button
                key={item}
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold transition hover:border-[#8363F5] hover:text-[#8363F5]"
              >
                {item}
              </button>
            )
          )}
        </div>

        {filteredProperties.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-[#FAFAFC] p-10 text-center">
            <h2 className="text-2xl font-bold">No homes found</h2>
            <p className="mt-2 text-gray-500">
              Try searching another Kerala destination.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProperties.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}