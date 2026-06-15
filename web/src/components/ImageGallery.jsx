import { useEffect, useState } from "react";
import { X, Grid3X3 } from "lucide-react";
import api from "../api/api";

export default function ImageGallery({ propertyId, coverImage }) {
  const [images, setImages] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImages();
  }, [propertyId]);

  const loadImages = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/property-images/${propertyId}`);

      const galleryImages = (res.data || []).map((item) => item.image_url);

      if (galleryImages.length === 0 && coverImage) {
        setImages([coverImage]);
      } else {
        setImages(galleryImages);
      }
    } catch (err) {
      console.log("Gallery load failed:", err);

      if (coverImage) {
        setImages([coverImage]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fallbackImage =
    coverImage ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

  const finalImages = images.length > 0 ? images : [fallbackImage];

  if (loading) {
    return (
      <section className="mb-12 grid grid-cols-1 gap-2 overflow-hidden rounded-3xl md:grid-cols-4">
        <div className="h-80 animate-pulse bg-gray-200 md:col-span-2 md:row-span-2 md:h-[430px]" />
        <div className="hidden h-[211px] animate-pulse bg-gray-200 md:block" />
        <div className="hidden h-[211px] animate-pulse bg-gray-200 md:block" />
        <div className="hidden h-[211px] animate-pulse bg-gray-200 md:block" />
        <div className="hidden h-[211px] animate-pulse bg-gray-200 md:block" />
      </section>
    );
  }

  return (
    <>
      <section className="relative mb-12 grid grid-cols-1 gap-2 overflow-hidden rounded-3xl md:grid-cols-4">
        <div className="h-80 md:col-span-2 md:row-span-2 md:h-[430px]">
          <img
            src={finalImages[0]}
            alt="Property"
            className="h-full w-full object-cover transition hover:brightness-90"
          />
        </div>

        {Array.from({ length: 4 }).map((_, index) => {
          const img = finalImages[index + 1] || finalImages[0];

          return (
            <div key={index} className="hidden h-[211px] md:block">
              <img
                src={img}
                alt="Property"
                className="h-full w-full object-cover transition hover:brightness-90"
              />
            </div>
          );
        })}

        <button
          onClick={() => setShowAll(true)}
          className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-gray-900 bg-white px-5 py-3 text-sm font-bold shadow-md hover:bg-gray-100"
        >
          <Grid3X3 size={18} />
          Show all photos
        </button>
      </section>

      {showAll && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-white px-6">
            <button
              onClick={() => setShowAll(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X size={22} />
            </button>

            <h2 className="text-lg font-bold">
              {finalImages.length} photos
            </h2>

            <div className="w-10" />
          </div>

          <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
            {finalImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Property ${index + 1}`}
                className="w-full rounded-3xl object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}