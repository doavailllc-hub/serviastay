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

const BRAND = "#3b71e6";

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
    setForm((prev) => ({ ...prev, [name]: value }));
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
    setItinerary((prev) => [...prev, { title: "", description: "" }]);
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
            <Loader2 className="animate-spin text-[#3b71e6]" size={22} />
            <span className="text-sm font-medium">Loading trip package...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Edit trip package
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Update package details, pricing, inclusions and itinerary.
            </p>
          </div>

          <button
            onClick={savePackage}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
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
                  label="Destination"
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
                  onChange={(e) => updateField("package_days", e.target.value)}
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
                {includeOptions.map((item) => {
                  const active = selectedIncludes.includes(item);

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInclude(item)}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition active:scale-[0.99] ${
                        active
                          ? "border-[#3b71e6] bg-[#eef4ff] text-[#3b71e6]"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <CheckCircle2 size={18} />
                      {item}
                    </button>
                  );
                })}
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
                    className="rounded-2xl border border-gray-200 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-950">
                        Day {index + 1}
                      </h3>

                      {itinerary.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDay(index)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-600"
                        >
                          <Trash2 size={15} />
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
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-5 text-sm font-medium transition hover:bg-gray-50"
                >
                  <Plus size={16} />
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
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">
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
                  <div className="flex aspect-[4/3] items-center justify-center text-sm text-gray-400">
                    Cover image preview
                  </div>
                )}
              </div>

              <h3 className="mt-5 line-clamp-2 text-base font-semibold text-gray-950">
                {form.title || "Trip package title"}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {form.location || "Destination"}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
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
                className="mt-6 h-11 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                onClick={() => navigate(`/experiences/${id}`)}
                className="mt-3 h-11 w-full rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-gray-950">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <input
        {...props}
        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
      />
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <select
        {...props}
        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
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
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <textarea
        rows={4}
        {...props}
        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
      />
    </label>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-950">{value}</p>
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
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      title: lines[0] || "Day plan",
      description: lines.slice(1).join("\n") || lines[0] || "",
    };
  });
}