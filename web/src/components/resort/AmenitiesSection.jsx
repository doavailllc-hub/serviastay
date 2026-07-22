import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  AirVent,
  Baby,
  Bath,
  BedDouble,
  Briefcase,
  Car,
  Check,
  Flame,
  Gamepad2,
  Home,
  Search,
  ShieldCheck,
  Tv,
  Trees,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  X,
} from "lucide-react";

import { AMENITY_META } from "../../data/amenityData";
import { parseAmenities } from "../../utils/resortUtils";

const CATEGORY_ICON = {
  Essentials: Wifi,
  Bathroom: Bath,
  "Bedroom and laundry": BedDouble,
  Entertainment: Gamepad2,
  "Kitchen and dining": Utensils,
  "Heating and cooling": AirVent,
  "Home safety": ShieldCheck,
  "Internet and office": Briefcase,
  Outdoor: Trees,
  "Parking and facilities": Car,
  Accessibility,
  Family: Baby,
  Services: Home,
  "Location features": Waves,
};

const SPECIAL_ICON = {
  wifi: Wifi,
  tv: Tv,
  kitchen: Utensils,
  ac: AirVent,
  air_conditioning: AirVent,
  parking: Car,
  free_parking: Car,
  washer: WashingMachine,
  washing_machine: WashingMachine,
  pool: Waves,
  swimming_pool: Waves,
  hot_tub: Waves,
  dedicated_workspace: Briefcase,
  workspace: Briefcase,
  fireplace: Flame,
  fire_pit: Flame,
  firepit: Flame,
  security: ShieldCheck,
  accessible: Accessibility,
  accessibility: Accessibility,
};

const LEGACY_AMENITY_META = {
  accessible: {
    key: "accessible",
    title: "Accessible",
    category: "Accessibility",
  },
  air_conditioning: {
    key: "air_conditioning",
    title: "Air conditioning",
    category: "Heating and cooling",
  },
  free_parking: {
    key: "free_parking",
    title: "Free parking",
    category: "Parking and facilities",
  },
  washing_machine: {
    key: "washing_machine",
    title: "Washing machine",
    category: "Bedroom and laundry",
  },
  swimming_pool: {
    key: "swimming_pool",
    title: "Swimming pool",
    category: "Parking and facilities",
  },
  workspace: {
    key: "workspace",
    title: "Workspace",
    category: "Internet and office",
  },
  firepit: {
    key: "firepit",
    title: "Fire pit",
    category: "Outdoor",
  },
};

const formatKey = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AmenitiesSection({ amenities }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const amenityList = useMemo(() => {
    const seen = new Set();

    return parseAmenities(amenities)
      .map((value) => {
        const key = String(value?.key || value || "").trim().toLowerCase();
        if (!key || seen.has(key)) return null;
        seen.add(key);

        return (
          AMENITY_META[key] || LEGACY_AMENITY_META[key] || {
            key,
            title: formatKey(key),
            category: "Other amenities",
          }
        );
      })
      .filter(Boolean);
  }, [amenities]);

  const groupedAmenities = useMemo(() => {
    const query = search.trim().toLowerCase();
    const groups = new Map();

    amenityList
      .filter(
        (item) =>
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
      .forEach((item) => {
        if (!groups.has(item.category)) groups.set(item.category, []);
        groups.get(item.category).push(item);
      });

    return Array.from(groups.entries());
  }, [amenityList, search]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (amenityList.length === 0) {
    return (
      <section className="border-b border-gray-200 py-8">
        <h2 className="text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
          What this place offers
        </h2>
        <p className="mt-4 text-sm text-gray-500">
          The host has not added amenity details yet.
        </p>
      </section>
    );
  }

  return (
    <section className="border-b border-gray-200 py-8">
      <h2 className="text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
        What this place offers
      </h2>

      <div className="mt-6 grid gap-x-12 gap-y-5 sm:grid-cols-2">
        {amenityList.slice(0, 10).map((item) => (
          <Amenity key={item.key} item={item} />
        ))}
      </div>

      {amenityList.length > 10 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-7 h-12 rounded-xl border border-gray-950 px-6 text-sm font-semibold text-gray-950 transition hover:bg-gray-50"
        >
          Show all {amenityList.length} amenities
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="amenities-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[86vh] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
              <h2 id="amenities-title" className="text-xl font-semibold text-gray-950">
                What this place offers
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
                aria-label="Close amenities"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search amenities"
                  autoFocus
                  className="h-12 w-full rounded-xl border border-gray-300 pl-11 pr-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 sm:px-6">
              {groupedAmenities.map(([category, items]) => (
                <section key={category} className="border-b border-gray-100 py-6 last:border-0">
                  <h3 className="mb-5 text-base font-semibold text-gray-950">
                    {category}
                  </h3>
                  <div className="space-y-5">
                    {items.map((item) => (
                      <Amenity key={item.key} item={item} compact />
                    ))}
                  </div>
                </section>
              ))}

              {groupedAmenities.length === 0 && (
                <div className="py-14 text-center text-sm text-gray-500">
                  No amenities match your search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Amenity({ item, compact = false }) {
  const Icon =
    SPECIAL_ICON[item.key] || CATEGORY_ICON[item.category] || Check;

  return (
    <div className={`flex items-center gap-4 ${compact ? "" : "min-h-9"}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-800">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <span className="text-sm text-gray-800">{item.title}</span>
    </div>
  );
}