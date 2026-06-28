import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND = "#7E4FF5";

const categoryOptions = [
  "Family",
  "Honeymoon",
  "Adventure",
  "Weekend",
  "Luxury",
  "Group",
  "Budget",
];

const statusOptions = ["active", "inactive"];

const includeOptions = [
  "Hotel stay",
  "Airport pickup",
  "Private transport",
  "Local guide",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Entry tickets",
  "Activities",
  "Travel support",
];

export default function EditTripPackage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category: "Family",
    location: "",
    city: "",
    price: "",
    package_days: 3,
    package_nights: 2,
    max_people: 10,
    hotel_name: "",
    transport: "",
    meals: "",
    pickup_location: "",
    language: "English",
    host_name: "Dovail Travel",
    description: "",
    cancellation_policy: "",
    package_type: "Trip Package",
    status: "active",
  });

  const [selectedIncludes, setSelectedIncludes] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [packageImages, setPackageImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPackage();
  }, [id]);

  const canSubmit = useMemo(() => {
    return form.title.trim() && form.location.trim() && Number(form.price) > 0;
  }, [form]);

  const loadPackage = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await api.get(`/experiences/${id}`);

      const data = res.data || {};

      setForm({
        title: data.title || "",
        category: data.category || "Family",
        location: data.location || "",
        city: data.city || "",
        price: data.price || "",
        package_days: data.package_days || 3,
        package_nights: data.package_nights || 2,
        max_people: data.max_people || 10,
        hotel_name: data.hotel_name || "",
        transport: data.transport || "",
        meals: data.meals || "",
        pickup_location: data.pickup_location || "",
        language: data.language || "English",
        host_name: data.host_name || "Dovail Travel",
        description: data.description || "",
        cancellation_policy: data.cancellation_policy || "",
        package_type: data.package_type || "Trip Package",
        status: data.status || "active",
      });

      setSelectedIncludes(parseList(data.includes));
      setItinerary(parseItinerary(data.itinerary));
      setPackageImages(Array.isArray(data.images) ? data.images : []);
    } catch (err) {
      console.error("Load trip package failed:", err);
      setError("Unable to load trip package.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleInclude = (item) => {
    setSelectedIncludes((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const updateItinerary = (index, key, value) => {
    setItinerary((prev) =>
      prev.map((day, i) => (i === index ? { ...day, [key]: value } : day))
    );
  };

  const addDay = () => {
    setItinerary((prev) => [
      ...prev,
      {
        title: "",
        description: "",
      },
    ]);
  };

  const removeDay = (index) => {
    setItinerary((prev) => prev.filter((_, i) => i !== index));
  };

  const savePackage = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (!canSubmit) {
        setError("Please add package title, destination and valid price.");
        return;
      }

      setSaving(true);

      await api.put(
        `/trip-packages/${id}`,
        {
          ...form,
          includes: selectedIncludes.join(","),
          itinerary: itinerary
            .map(
              (day, index) =>
                `Day ${index + 1}: ${day.title}\n${day.description}`
            )
            .join("\n\n"),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/host-trip-packages");
    } catch (err) {
      console.error("Trip package update failed:", err);
      setError(
        err.response?.data?.message ||
          "Unable to update trip package. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-semibold">Loading trip package...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
              Host / Admin
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              Edit Trip Package
            </h1>

            <p className="mt-3 max-w-2xl text-gray-500">
              Update travel package details, pricing, duration, includes and
              day-wise itinerary.
            </p>
          </div>

          <button
            onClick={savePackage}
            disabled={saving}
            className="rounded-full px-7 py-3 text-sm font-black text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: BRAND }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={17} />
                Saving...
              </span>
            ) : (
              "Save changes"
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <Card title="Basic information">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Package title"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />

                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  options={categoryOptions}
                />

                <Input
                  label="Destination / Location"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />

                <Input
                  label="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />

                <Input
                  label="Hosted by"
                  value={form.host_name}
                  onChange={(e) => updateField("host_name", e.target.value)}
                />

                <Input
                  label="Guide language"
                  value={form.language}
                  onChange={(e) => updateField("language", e.target.value)}
                />

                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  options={statusOptions}
                />
              </div>

              <Textarea
                label="Package overview"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </Card>

            <Card title="Pricing and duration">
              <div className="grid gap-4 md:grid-cols-4">
                <Input
                  label="Price / person"
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                />

                <Input
                  label="Days"
                  type="number"
                  value={form.package_days}
                  onChange={(e) =>
                    updateField("package_days", e.target.value)
                  }
                />

                <Input
                  label="Nights"
                  type="number"
                  value={form.package_nights}
                  onChange={(e) =>
                    updateField("package_nights", e.target.value)
                  }
                />

                <Input
                  label="Max travelers"
                  type="number"
                  value={form.max_people}
                  onChange={(e) => updateField("max_people", e.target.value)}
                />
              </div>
            </Card>

            <Card title="Package includes">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {includeOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInclude(item)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-bold transition ${
                      selectedIncludes.includes(item)
                        ? "border-[#7E4FF5] bg-[#F7F5FF] text-[#7E4FF5]"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-900"
                    }`}
                  >
                    <CheckCircle2 size={18} />
                    {item}
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Hotel, transport and pickup">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Hotel name"
                  value={form.hotel_name}
                  onChange={(e) => updateField("hotel_name", e.target.value)}
                />

                <Input
                  label="Transport"
                  value={form.transport}
                  onChange={(e) => updateField("transport", e.target.value)}
                />

                <Input
                  label="Meals"
                  value={form.meals}
                  onChange={(e) => updateField("meals", e.target.value)}
                />

                <Input
                  label="Pickup location"
                  value={form.pickup_location}
                  onChange={(e) =>
                    updateField("pickup_location", e.target.value)
                  }
                />
              </div>
            </Card>

            <Card title="Day-wise itinerary">
              <div className="space-y-4">
                {itinerary.map((day, index) => (
                  <div
                    key={index}
                    className="rounded-3xl border border-gray-200 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-black text-gray-900">
                        Day {index + 1}
                      </h3>

                      {itinerary.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDay(index)}
                          className="flex items-center gap-1 text-sm font-bold text-red-600"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      )}
                    </div>

                    <Input
                      label="Day title"
                      value={day.title}
                      onChange={(e) =>
                        updateItinerary(index, "title", e.target.value)
                      }
                    />

                    <Textarea
                      label="Day description"
                      value={day.description}
                      onChange={(e) =>
                        updateItinerary(index, "description", e.target.value)
                      }
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addDay}
                  className="flex items-center gap-2 rounded-full border border-gray-300 px-5 py-3 text-sm font-black transition hover:border-gray-900"
                >
                  <Plus size={17} />
                  Add day
                </button>
              </div>
            </Card>

            <Card title="Cancellation policy">
              <Textarea
                label="Policy"
                value={form.cancellation_policy}
                onChange={(e) =>
                  updateField("cancellation_policy", e.target.value)
                }
              />
            </Card>

            {packageImages.length > 0 && (
              <Card title="Current gallery">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {packageImages.map((image, index) => (
                    <div
                      key={image.id || index}
                      className="overflow-hidden rounded-2xl bg-gray-100"
                    >
                      <img
                        src={image.image_url}
                        alt={`Package ${index + 1}`}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
              <h2 className="text-xl font-black text-gray-900">
                Package preview
              </h2>

              <div className="mt-5 overflow-hidden rounded-2xl bg-gray-100">
                {packageImages[0]?.image_url ? (
                  <img
                    src={packageImages[0].image_url}
                    alt="Cover preview"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-sm font-bold text-gray-400">
                    Cover image preview
                  </div>
                )}
              </div>

              <h3 className="mt-5 text-lg font-black text-gray-900">
                {form.title || "Trip package title"}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {form.location || "Destination"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <PreviewItem
                  label="Price"
                  value={`₹${Number(form.price || 0).toLocaleString("en-IN")}`}
                />
                <PreviewItem
                  label="Duration"
                  value={`${form.package_days || 1}D / ${
                    form.package_nights || 0
                  }N`}
                />
                <PreviewItem label="Category" value={form.category} />
                <PreviewItem label="Status" value={form.status} />
              </div>

              <button
                onClick={savePackage}
                disabled={saving}
                className="mt-6 w-full rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: BRAND }}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                onClick={() => navigate(`/experiences/${id}`)}
                className="mt-3 w-full rounded-2xl border border-gray-300 py-4 font-black transition hover:border-gray-900"
              >
                View package
              </button>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-2xl font-black text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <input
        {...props}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#7E4FF5]"
      />
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <select
        {...props}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#7E4FF5]"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, ...props }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <textarea
        rows={5}
        {...props}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#7E4FF5]"
      />
    </label>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function parseList(value) {
  if (!value) return [];

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseItinerary(value) {
  if (!value) {
    return [
      {
        title: "Arrival and check-in",
        description: "Pickup and start the first day of the package.",
      },
    ];
  }

  const chunks = String(value)
    .split(/Day\s*\d+:/i)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!chunks.length) {
    return [
      {
        title: "Package itinerary",
        description: value,
      },
    ];
  }

  return chunks.map((chunk) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);

    return {
      title: lines[0] || "Day plan",
      description: lines.slice(1).join("\n") || lines[0] || "",
    };
  });
}