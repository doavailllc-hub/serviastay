import { useEffect } from "react";
import { X } from "lucide-react";
import { FALLBACK_IMAGE } from "../../constants/resortConstants";

export default function GalleryModal({
  images = [],
  title = "Gallery",
  onClose,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const galleryImages =
    images.length > 0 ? images : [FALLBACK_IMAGE];

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 transition hover:bg-gray-100"
        >
          <X size={22} />
        </button>

        <h2 className="truncate px-4 text-center text-base font-semibold">
          {title}
        </h2>

        <div className="w-10" />
      </div>

      {/* Images */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          {galleryImages.map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt={`${title} ${index + 1}`}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (e.currentTarget.src !== FALLBACK_IMAGE) {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }
              }}
              className={`w-full rounded-2xl object-cover ${
                index === 0
                  ? "max-h-[620px] md:col-span-2"
                  : "h-[300px] md:h-[340px]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}