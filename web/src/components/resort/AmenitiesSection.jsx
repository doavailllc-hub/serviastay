import { AirVent, Car, ShieldCheck, Tv, Utensils, Waves, Wifi } from "lucide-react";
import { parseAmenities } from "../../utils/resortUtils";

const AMENITY_META = {
  wifi: { title: "Wifi", text: "High speed internet", icon: <Wifi /> },
  tv: { title: "TV", text: "Entertainment ready", icon: <Tv /> },
  kitchen: { title: "Kitchen", text: "Fully equipped", icon: <Utensils /> },
  parking: { title: "Free parking", text: "On premises", icon: <Car /> },
  ac: { title: "Air conditioning", text: "Comfort cooling", icon: <AirVent /> },
  pool: { title: "Pool", text: "Private or shared access", icon: <Waves /> },
  security: {
    title: "Security cameras",
    text: "Extra safety support",
    icon: <ShieldCheck />,
  },
};

export default function AmenitiesSection({ amenities }) {
  const list = parseAmenities(amenities);

  const visibleAmenities = list.length
    ? list.map((key) => ({
        key,
        ...(AMENITY_META[key] || {
          title: String(key).replaceAll("_", " "),
          text: "Available during your stay",
          icon: <ShieldCheck />,
        }),
      }))
    : [
        { key: "wifi", ...AMENITY_META.wifi },
        { key: "parking", ...AMENITY_META.parking },
        { key: "kitchen", ...AMENITY_META.kitchen },
      ];

  return (
    <section className="border-b border-gray-200 py-8">
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
        What this place offers
      </h2>

      <div className="mt-1 grid gap-x-12 gap-y-6 sm:grid-cols-2">
        {visibleAmenities.map((item) => (
          <Amenity
            key={item.key}
            icon={item.icon}
            title={item.title}
            text={item.text}
          />
        ))}
      </div>
    </section>
  );
}

function Amenity({ icon, title, text }) {
  return (
    <div className="flex items-start gap-4 rounded-xl py-1">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-gray-800">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-sm font-semibold capitalize text-gray-950">
          {title}
        </p>
        <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
      </div>
    </div>
  );
}