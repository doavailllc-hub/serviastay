import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star } from "lucide-react";

import api from "../api/api";

export default function SimilarProperties({ propertyId }) {
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propertyId) loadSimilarProperties();
  }, [propertyId]);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadSimilarProperties = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/properties/${propertyId}/similar`);
      setProperties(res.data || []);
    } catch (err) {
      console.log("Similar properties load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="border-t py-10">
        <h2 className="mb-6 text-2xl font-semibold">
          Similar stays you may like
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-3xl bg-gray-100"
            />
          ))}
        </div>
      </section>
    );
  }

  if (properties.length === 0) return null;

  return (
    <section className="border-t py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            Similar stays you may like
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Based on location, category, and price range.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              navigate(`/reserve/${item.id}`);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="overflow-hidden rounded-3xl border border-gray-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <img
              src={
                item.image ||
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80"
              }
              alt={item.title}
              className="h-56 w-full object-cover"
            />

            <div className="p-5">
              <div className="mb-2 flex items-start justify-between gap-4">
                <h3 className="line-clamp-2 font-bold text-gray-900">
                  {item.title || "Property"}
                </h3>

                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Star size={15} fill="black" />
                  {item.rating || "5.0"}
                </span>
              </div>

              <p className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin size={15} />
                {item.location || "Location unavailable"}
              </p>

              <p className="mt-3 text-sm text-gray-500">
                {item.guests || 1} guests · {item.bedrooms || 1} bedroom ·{" "}
                {item.bathrooms || 1} bath
              </p>

              <p className="mt-4 font-bold text-gray-900">
                {formatINR(item.price)}{" "}
                <span className="font-normal text-gray-500">/ night</span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}