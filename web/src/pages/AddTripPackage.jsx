import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
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

export default function AddTripPackage() {
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
    cancellation_policy:
      "Free cancellation support is available according to package rules.",
    package_type: "Trip Package",
  });

  const [selectedIncludes, setSelectedIncludes] = useState([
    "Hotel stay",
    "Private transport",
    "Local guide",
    "Breakfast",
  ]);

  const [itinerary, setItinerary] = useState([
    {
      title: "Arrival and check-in",
      description: "Pickup from airport or hotel and start the first day plan.",
    },
    {
      title: "Main sightseeing",
      description: "Explore major attractions with local guide and transport.",
    },
    {
      title: "Checkout and return",
      description: "Final checkout and return transfer.",
    },
  ]);

  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return (
      form.title.trim() &&
      form.location.trim() &&
      Number(form.price) > 0 &&
      images.length > 0
    );
  }, [form, images]);

  const updateField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleInclude = (item) => {
    setSelectedIncludes((prev) =>
      prev.includes(item)
        ? prev.filter((x) => x !== item)
        : [...prev, item]
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

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    const nextFiles = [...images, ...files].slice(0, 10);

    setImages(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const removeImage = (index) => {
    const nextImages = images.filter((_, i) => i !== index);
    setImages(nextImages);
    setPreviews(nextImages.map((file) => URL.createObjectURL(file)));
  };

  const submitPackage = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (!canSubmit) {
        setError("Please add package title, destination, price and at least one image.");
        return;
      }

      setSubmitting(true);

      const body = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value ?? "");
      });

      body.append("includes", selectedIncludes.join(","));
      body.append(
        "itinerary",
        itinerary
          .map(
            (day, index) =>
              `Day ${index + 1}: ${day.title}\n${day.description}`
          )
          .join("\n\n")
      );

      images.forEach((file) => {
        body.append("images", file);
      });

      const res = await api.post("/trip-packages", body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      navigate(`/experiences/${res.data.packageId}`);
    } catch (err) {
      console.error("Trip package create failed:", err);
      setError(
        err.response?.data?.message ||
          "Unable to create trip package. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

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
              Add Trip Package
            </h1>

            <p className="mt-3 max-w-2xl text-gray-500">
              Create complete travel packages with hotel, transport, pickup,
              itinerary, meals and gallery images.
            </p>
          </div>

          <button
            onClick={submitPackage}
            disabled={submitting}
            className="rounded-full px-7 py-3 text-sm font-black text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: BRAND }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={17} />
                Publishing...
              </span>
            ) : (
              "Publish package"
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
                  placeholder="Dubai Family Explorer Package"
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
                  placeholder="Dubai, UAE"
                />

                <Input
                  label="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Dubai"
                />

                <Input
                  label="Hosted by"
                  value={form.host_name}
                  onChange={(e) => updateField("host_name", e.target.value)}
                  placeholder="Dovail Travel"
                />

                <Input
                  label="Guide language"
                  value={form.language}
                  onChange={(e) => updateField("language", e.target.value)}
                  placeholder="English, Arabic"
                />
              </div>

              <Textarea
                label="Package overview"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the package, travel experience and highlights..."
              />
            </Card>

            <Card title="Pricing and duration">
              <div className="grid gap-4 md:grid-cols-4">
                <Input
                  label="Price / person"
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="899"
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
                  placeholder="Hotel name or category"
                />

                <Input
                  label="Transport"
                  value={form.transport}
                  onChange={(e) => updateField("transport", e.target.value)}
                  placeholder="Private car / shared coach"
                />

                <Input
                  label="Meals"
                  value={form.meals}
                  onChange={(e) => updateField("meals", e.target.value)}
                  placeholder="Breakfast included"
                />

                <Input
                  label="Pickup location"
                  value={form.pickup_location}
                  onChange={(e) =>
                    updateField("pickup_location", e.target.value)
                  }
                  placeholder="Airport / Hotel pickup"
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
                      placeholder="Arrival and city tour"
                    />

                    <Textarea
                      label="Day description"
                      value={day.description}
                      onChange={(e) =>
                        updateItinerary(index, "description", e.target.value)
                      }
                      placeholder="Explain the day plan..."
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
                placeholder="Write cancellation rules..."
              />
            </Card>

            <Card title="Gallery images">
              <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-[#7E4FF5]">
                <ImagePlus size={34} className="text-[#7E4FF5]" />
                <p className="mt-3 font-black text-gray-900">
                  Upload package images
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  First image will be used as cover. Max 10 images.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImages}
                  className="hidden"
                />
              </label>

              {previews.length > 0 && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {previews.map((src, index) => (
                    <div
                      key={src}
                      className="relative overflow-hidden rounded-2xl bg-gray-100"
                    >
                      <img
                        src={src}
                        alt={`Preview ${index + 1}`}
                        className="aspect-[4/3] w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm">
                          Cover
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
              <h2 className="text-xl font-black text-gray-900">
                Package preview
              </h2>

              <div className="mt-5 overflow-hidden rounded-2xl bg-gray-100">
                {previews[0] ? (
                  <img
                    src={previews[0]}
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
                <PreviewItem
                  label="Travelers"
                  value={`Max ${form.max_people || 10}`}
                />
              </div>

              <button
                onClick={submitPackage}
                disabled={submitting}
                className="mt-6 w-full rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: BRAND }}
              >
                {submitting ? "Publishing..." : "Publish package"}
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