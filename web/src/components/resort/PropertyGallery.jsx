import { Images } from "lucide-react";
import { FALLBACK_IMAGE } from "../../constants/resortConstants";

export default function PropertyGallery({ images, title, onShowAll }) {
  const photos = images?.length ? images : [FALLBACK_IMAGE];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-100">
      <div className="grid h-[300px] grid-cols-1 gap-2 md:h-[420px] md:grid-cols-4">
        <GalleryImage
          src={photos[0]}
          alt={title || "Stay photo"}
          onClick={onShowAll}
          className="md:col-span-2 md:row-span-2"
        />

        {photos.slice(1, 5).map((src, index) => (
          <GalleryImage
            key={`${src}-${index}`}
            src={src}
            alt={`${title || "Stay photo"} ${index + 2}`}
            onClick={onShowAll}
            className="hidden md:block"
          />
        ))}

        {Array.from({ length: Math.max(0, 5 - photos.length) }).map(
          (_, index) => (
            <div
              key={`placeholder-${index}`}
              className="hidden bg-gray-100 md:block"
            />
          )
        )}
      </div>

      <button
        type="button"
        onClick={onShowAll}
        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-gray-50"
      >
        <Images size={17} />
        Show all photos
      </button>
    </div>
  );
}

function GalleryImage({ src, alt, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group overflow-hidden bg-gray-100 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          if (event.currentTarget.src !== FALLBACK_IMAGE) {
            event.currentTarget.src = FALLBACK_IMAGE;
          }
        }}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
    </button>
  );
}