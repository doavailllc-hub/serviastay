import { Heart, MapPin, Share, Star } from "lucide-react";

export default function PropertyHeader({ property, rating, onShare, onSave }) {
  return (
    <header className="mb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">Stay details</p>

          <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
            {property?.title || "Stay details"}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1 font-medium text-gray-950">
              <Star size={14} fill="currentColor" />
              {rating || "New"}
            </span>

            <span className="text-gray-400">·</span>

            <span className="font-medium">Guest favorite</span>

            <span className="text-gray-400">·</span>

            <span className="inline-flex items-center gap-1">
              <MapPin size={15} />
              {property?.location || "Location not specified"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm font-medium">
          <ActionButton icon={<Share size={16} />} label="Share" onClick={onShare} />
          <ActionButton icon={<Heart size={16} />} label="Save" onClick={onSave} />
        </div>
      </div>
    </header>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-gray-100 md:px-4"
    >
      {icon}
      {label}
    </button>
  );
}