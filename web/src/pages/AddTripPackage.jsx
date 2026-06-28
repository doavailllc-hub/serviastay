import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import api from "../api/api";

const BRAND = "#3b71e6";
const BRAND_HOVER = "#2f5fc2";

const steps = [
  "basic",
  "pricing",
  "includes",
  "transport",
  "itinerary",
  "policy",
  "photos",
  "review",
];

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

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const progress = ((step + 1) / steps.length) * 100;

  const canSubmit = useMemo(() => {
    return (
      form.title.trim() &&
      form.location.trim() &&
      Number(form.price) > 0 &&
      images.length > 0
    );
  }, [form, images]);

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

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const nextFiles = [...images, ...files].slice(0, 10);
    setImages(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const removeImage = (index) => {
    const nextImages = images.filter((_, i) => i !== index);
    setImages(nextImages);
    setPreviews(nextImages.map((file) => URL.createObjectURL(file)));
  };

  const canNext = () => {
    const current = steps[step];

    if (current === "basic") {
      return form.title.trim() && form.location.trim() && form.city.trim();
    }

    if (current === "pricing") {
      return (
        Number(form.price) > 0 &&
        Number(form.package_days) > 0 &&
        Number(form.max_people) > 0
      );
    }

    if (current === "includes") {
      return selectedIncludes.length > 0;
    }

    if (current === "itinerary") {
      return itinerary.some(
        (day) => day.title.trim() || day.description.trim()
      );
    }

    if (current === "photos") {
      return images.length > 0;
    }

    return true;
  };

  const next = () => {
    if (!canNext()) return;
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const back = () => {
    setStep((prev) => Math.max(prev - 1, 0));
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
        setError("Please add title, destination, price and at least one image.");
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

      images.forEach((file) => body.append("images", file));

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
      <HostHeader navigate={navigate} />

      <main className="mx-auto flex min-h-[calc(100vh-170px)] max-w-7xl items-center justify-center px-4 pb-28 pt-8 md:px-8">
        <div className="w-full max-w-3xl">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {steps[step] === "basic" && (
            <section>
              <PageTitle
                eyebrow="Step 1"
                title="Start with the basic details"
                description="Add the main information guests will see first."
              />

              <div className="mt-8 grid gap-4 md:grid-cols-2">
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
                  label="Destination"
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
                  label="Language"
                  value={form.language}
                  onChange={(e) => updateField("language", e.target.value)}
                  placeholder="English, Arabic"
                />
              </div>

              <Textarea
                label="Overview"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the package, travel experience and highlights..."
              />
            </section>
          )}

          {steps[step] === "pricing" && (
            <section>
              <PageTitle
                eyebrow="Step 2"
                title="Set pricing and duration"
                description="Add the package price, trip duration and maximum travelers."
              />

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <PriceBox
                  label="Price / person"
                  value={form.price}
                  onChange={(value) => updateField("price", value)}
                />

                <Input
                  label="Max travelers"
                  type="number"
                  value={form.max_people}
                  onChange={(e) => updateField("max_people", e.target.value)}
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
              </div>
            </section>
          )}

          {steps[step] === "includes" && (
            <section>
              <PageTitle
                eyebrow="Step 3"
                title="What is included?"
                description="Select everything included in this trip package."
              />

              <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {includeOptions.map((item) => {
                  const active = selectedIncludes.includes(item);

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInclude(item)}
                      className={`rounded-2xl border p-4 text-left transition hover:bg-gray-50 ${
                        active
                          ? "border-[#3b71e6] bg-[#eef4ff] text-[#3b71e6]"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <CheckCircle2 size={18} />

                      <span className="mt-4 block text-sm font-medium">
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {steps[step] === "transport" && (
            <section>
              <PageTitle
                eyebrow="Step 4"
                title="Add hotel, transport and pickup"
                description="Give guests clear package logistics before they book."
              />

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <Input
                  label="Hotel"
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
                  label="Pickup"
                  value={form.pickup_location}
                  onChange={(e) =>
                    updateField("pickup_location", e.target.value)
                  }
                  placeholder="Airport / Hotel pickup"
                />
              </div>
            </section>
          )}

          {steps[step] === "itinerary" && (
            <section>
              <PageTitle
                eyebrow="Step 5"
                title="Create the itinerary"
                description="Add a simple day-wise plan for this package."
              />

              <div className="mt-8 space-y-4">
                {itinerary.map((day, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-200 bg-white p-5"
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
                      label="Title"
                      value={day.title}
                      onChange={(e) =>
                        updateItinerary(index, "title", e.target.value)
                      }
                      placeholder="Arrival and city tour"
                    />

                    <Textarea
                      label="Description"
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
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-5 text-sm font-medium transition hover:bg-gray-50"
                >
                  <Plus size={16} />
                  Add day
                </button>
              </div>
            </section>
          )}

          {steps[step] === "policy" && (
            <section>
              <PageTitle
                eyebrow="Step 6"
                title="Add cancellation policy"
                description="Explain cancellation rules in a simple and clear way."
              />

              <Textarea
                label="Policy"
                value={form.cancellation_policy}
                onChange={(e) =>
                  updateField("cancellation_policy", e.target.value)
                }
                placeholder="Write cancellation rules..."
              />
            </section>
          )}

          {steps[step] === "photos" && (
            <section>
              <PageTitle
                eyebrow="Step 7"
                title="Add package images"
                description="Upload images for this package. The first image will be used as the cover."
              />

              <label className="mt-8 flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-[#3b71e6] hover:bg-[#f8fbff]">
                <ImagePlus size={42} className="text-[#3b71e6]" />

                <span className="mt-5 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white">
                  Upload images
                </span>

                <p className="mt-3 text-sm text-gray-500">
                  Max 10 images. JPG, PNG or WEBP.
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
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {previews.map((src, index) => (
                    <div
                      key={src}
                      className={`relative overflow-hidden rounded-2xl bg-gray-100 ${
                        index === 0 ? "col-span-2 h-80" : "h-44"
                      }`}
                    >
                      <img
                        src={src}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-sm">
                          Cover
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-3 top-3 rounded-full bg-white p-2 text-red-600 shadow-sm transition hover:bg-gray-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {steps[step] === "review" && (
            <section>
              <PageTitle
                eyebrow="Step 8"
                title="Review and publish"
                description="Check the package details before publishing."
              />

              <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
                <div className="overflow-hidden rounded-2xl bg-gray-100">
                  {previews[0] ? (
                    <img
                      src={previews[0]}
                      alt="Cover preview"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-sm text-gray-400">
                      Cover image
                    </div>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-semibold tracking-tight text-gray-950">
                  {form.title || "Trip package title"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {form.location || "Destination"}
                </p>

                <div className="mt-5 space-y-3 text-sm">
                  <PreviewRow
                    label="Price"
                    value={`₹${Number(form.price || 0).toLocaleString(
                      "en-IN"
                    )}`}
                  />

                  <PreviewRow
                    label="Duration"
                    value={`${form.package_days || 1}D / ${
                      form.package_nights || 0
                    }N`}
                  />

                  <PreviewRow label="Category" value={form.category} />

                  <PreviewRow
                    label="Travelers"
                    value={`Max ${form.max_people || 10}`}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white">
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#3b71e6] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <button
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step === steps.length - 1 ? (
            <button
              onClick={submitPackage}
              disabled={submitting || !canSubmit}
              className="rounded-xl bg-[#3b71e6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Publishing
                </span>
              ) : (
                "Publish"
              )}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!canNext()}
              className="rounded-xl bg-[#3b71e6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function HostHeader({ navigate }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 px-4 md:px-8">
      <button
        onClick={() => navigate("/")}
        className="text-lg font-semibold tracking-tight text-gray-950"
      >
        Dovail Stay
      </button>

      <div className="flex items-center gap-2">
        <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
          Questions?
        </button>

        <button
          onClick={() => navigate("/")}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Save & exit
        </button>
      </div>
    </header>
  );
}

function PageTitle({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{eyebrow}</p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
        {title}
      </h1>

      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      )}
    </div>
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

function PriceBox({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-white p-5">
      <span className="text-sm font-medium text-gray-500">{label}</span>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-3xl font-semibold text-gray-950">₹</span>

        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-3xl font-semibold text-gray-950 outline-none"
        />
      </div>
    </label>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-950">{value}</span>
    </div>
  );
}