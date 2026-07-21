import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  LocateFixed,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import api from "../api/api";

const BRAND = "#3b71e6";

const steps = [
  "basic",
  "pricing",
  "includes",
  "transport",
  "itinerary",
  "exclusions",
  "terms",
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
  "Pilgrimage",
  "Corporate",
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
  "Travel coordinator",
  "Pickup assistance",
];

function getAuthSession() {
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const user =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(sessionStorage.getItem("user") || "null");

    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

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

    brand_name: "Dovail Travel Hosting Team",
    team_contact: "",
    host_name: "Dovail Travel",

    hotel_name: "",
    transport: "",
    meals: "",
    pickup_location: "",
    pickup_map_url: "",
    pickup_latitude: "",
    pickup_longitude: "",
    language: "English",

    description: "",
    cancellation_policy:
      "Free cancellation support is available according to package rules.",
    exclusions:
      "Flights, visa charges, personal expenses, travel insurance, room upgrades, and anything not mentioned under inclusions are not included.",
    terms_conditions:
      "The itinerary, pickup schedule, accommodation, transportation, and activity timings may be adjusted due to weather conditions, traffic, government regulations, safety concerns, or other unforeseen operational circumstances. Dovail Travel Hosting Team will make every reasonable effort to provide a comparable experience while ensuring the safety and comfort of all guests.",

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

  const progress = Math.round(((step + 1) / steps.length) * 100);

  const canSubmit = useMemo(() => {
    return (
      form.title.trim().length >= 5 &&
      form.location.trim() &&
      form.city.trim() &&
      form.brand_name.trim() &&
      Number(form.price) > 0 &&
      Number(form.package_days) > 0 &&
      Number(form.max_people) > 0 &&
      selectedIncludes.length > 0 &&
      form.exclusions.trim() &&
      form.terms_conditions.trim() &&
      images.length > 0
    );
  }, [form, selectedIncludes, images]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
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

    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!validFiles.length) {
      setError("Please upload valid image files only.");
      return;
    }

    if (images.length + validFiles.length > 10) {
      setError("Maximum 10 images allowed.");
      return;
    }

    const nextImages = [...images, ...validFiles];

    previews.forEach((url) => URL.revokeObjectURL(url));

    setImages(nextImages);
    setPreviews(nextImages.map((file) => URL.createObjectURL(file)));
    e.target.value = "";
  };

  const removeImage = (index) => {
    const nextImages = images.filter((_, i) => i !== index);

    previews.forEach((url) => URL.revokeObjectURL(url));

    setImages(nextImages);
    setPreviews(nextImages.map((file) => URL.createObjectURL(file)));
  };

  const canNext = () => {
    const current = steps[step];

    if (current === "basic") {
      return (
        form.title.trim().length >= 5 &&
        form.location.trim() &&
        form.city.trim() &&
        form.brand_name.trim()
      );
    }

    if (current === "pricing") {
      return (
        Number(form.price) > 0 &&
        Number(form.package_days) > 0 &&
        Number(form.max_people) > 0
      );
    }

    if (current === "includes") return selectedIncludes.length > 0;

    if (current === "itinerary") {
      return itinerary.some(
        (day) => day.title.trim() || day.description.trim()
      );
    }

    if (current === "exclusions") return form.exclusions.trim();

    if (current === "terms") return form.terms_conditions.trim();

    if (current === "photos") return images.length > 0;

    return true;
  };

  const next = () => {
    if (!canNext()) {
      setError("Please complete the required details before continuing.");
      return;
    }

    setError("");
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitPackage = async () => {
    if (submitting) return;

    try {
      setError("");

      const { token, user } = getAuthSession();

      if (!token || !user?.id) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        setError("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      if (!canSubmit) {
        setError("Please complete all required details before submitting.");
        return;
      }

      setSubmitting(true);

      const body = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value ?? "");
      });

      body.append("user_id", user.id);
      body.append("host_id", user.id);
      body.append("status", "Pending");
      body.append("is_verified", "0");
      body.append("includes", selectedIncludes.join(","));
      body.append(
        "itinerary",
        itinerary
          .filter((day) => day.title.trim() || day.description.trim())
          .map(
            (day, index) =>
              `Day ${index + 1}: ${day.title.trim()}\n${day.description.trim()}`
          )
          .join("\n\n")
      );

      images.forEach((file) => body.append("images", file));

      await api.post("/trip-packages", body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.error(
        "Trip package submitted for verification. It will go live after admin approval."
      );

      navigate("/host-dashboard");
    } catch (err) {
      console.error("Trip package create failed:", err);

      if (err.response?.status === 401) {
        setError("Invalid session. Please login again.");
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        navigate("/login");
        return;
      }

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

      <main className="mx-auto flex min-h-[calc(100vh-170px)] max-w-7xl justify-center px-4 pb-28 pt-8 md:px-8">
        <div className="w-full max-w-3xl">
          <StepPills step={step} total={steps.length} progress={progress} />

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8">
            {steps[step] === "basic" && (
              <section>
                <PageTitle
                  eyebrow="Step 1"
                  title="Start with the basic details"
                  description="Add package information, brand details, destination, and language support."
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
                    label="Travel hosting brand"
                    value={form.brand_name}
                    onChange={(e) => updateField("brand_name", e.target.value)}
                    placeholder="Dovail Travel Hosting Team"
                  />

                  <Input
                    label="Team contact"
                    value={form.team_contact}
                    onChange={(e) => updateField("team_contact", e.target.value)}
                    placeholder="support@dovail.com or WhatsApp"
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
                  placeholder="Describe the package, travel experience, highlights, and guest benefits..."
                />
              </section>
            )}

            {steps[step] === "pricing" && (
              <section>
                <PageTitle
                  eyebrow="Step 2"
                  title="Set pricing and duration"
                  description="Add package price, duration, and maximum travelers."
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
                    min="1"
                    value={form.max_people}
                    onChange={(e) => updateField("max_people", e.target.value)}
                  />

                  <Input
                    label="Days"
                    type="number"
                    min="1"
                    value={form.package_days}
                    onChange={(e) =>
                      updateField("package_days", e.target.value)
                    }
                  />

                  <Input
                    label="Nights"
                    type="number"
                    min="0"
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
                  description="Select every service included in this travel package."
                />

                <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {includeOptions.map((item) => {
                    const active = selectedIncludes.includes(item);

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInclude(item)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-[#3b71e6] bg-[#eef4ff] text-[#3b71e6]"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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
                  description="Give guests clear logistics, pickup instructions, and Google Map pickup point."
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
                    label="Pickup point"
                    value={form.pickup_location}
                    onChange={(e) =>
                      updateField("pickup_location", e.target.value)
                    }
                    placeholder="Airport / Hotel lobby / Meeting point"
                  />

                  <div className="md:col-span-2">
                    <MapLocationPicker
                      latitude={form.pickup_latitude}
                      longitude={form.pickup_longitude}
                      onLocationChange={({ latitude, longitude, mapUrl }) => {
                        setForm((prev) => ({
                          ...prev,
                          pickup_latitude: latitude,
                          pickup_longitude: longitude,
                          pickup_map_url: mapUrl,
                        }));
                        if (error) setError("");
                      }}
                    />

                    {form.pickup_map_url && (
                      <a
                        href={form.pickup_map_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-[#3b71e6] transition hover:bg-[#eef4ff]"
                      >
                        <MapPin size={16} />
                        Open pickup point in Google Maps
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
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

            {steps[step] === "exclusions" && (
              <section>
                <PageTitle
                  eyebrow="Step 6"
                  title="What is not included?"
                  description="Clearly mention all exclusions so guests know what they need to pay separately."
                />

                <Textarea
                  label="Exclusion details"
                  value={form.exclusions}
                  onChange={(e) => updateField("exclusions", e.target.value)}
                  placeholder="Flights, visa, travel insurance, personal expenses..."
                />
              </section>
            )}

            {steps[step] === "terms" && (
              <section>
                <PageTitle
                  eyebrow="Step 7"
                  title="Terms and conditions"
                  description="Add important travel rules, guest responsibilities, refund terms, and operational notes."
                />

                <Textarea
                  label="Cancellation policy"
                  value={form.cancellation_policy}
                  onChange={(e) =>
                    updateField("cancellation_policy", e.target.value)
                  }
                  placeholder="Write cancellation rules..."
                />

                <Textarea
                  label="Terms and conditions"
                  value={form.terms_conditions}
                  onChange={(e) =>
                    updateField("terms_conditions", e.target.value)
                  }
                  placeholder="Guests must carry valid ID. Pickup timings may vary..."
                />
              </section>
            )}

            {steps[step] === "photos" && (
              <section>
                <PageTitle
                  eyebrow="Step 8"
                  title="Add package images"
                  description="Upload images for this package. First image is used as the cover."
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
                  eyebrow="Step 9"
                  title="Review and submit"
                  description="Your trip package will be reviewed by admin before going live."
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
                      label="Brand"
                      value={form.brand_name || "Dovail Travel Hosting Team"}
                    />

                    <PreviewRow
                      label="Price"
                      value={`â‚¹${Number(form.price || 0).toLocaleString(
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

                    <PreviewRow
                      label="Pickup"
                      value={form.pickup_location || "Not added"}
                    />

                    <PreviewRow
                      label="Exclusions"
                      value={form.exclusions ? "Added" : "Not added"}
                    />

                    <PreviewRow
                      label="Terms"
                      value={form.terms_conditions ? "Added" : "Not added"}
                    />

                    <PreviewRow label="Status" value="Pending verification" />
                  </div>

                  <div className="mt-5 rounded-2xl border border-blue-100 bg-[#eef4ff] p-4">
                    <div className="flex gap-3">
                      <ShieldCheck size={20} className="text-[#3b71e6]" />
                      <p className="text-sm leading-6 text-gray-600">
                        Guests will see this package only after admin approval.
                        Please make sure all pickup, inclusion, exclusion, and
                        terms details are accurate.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
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
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step === steps.length - 1 ? (
            <button
              type="button"
              onClick={submitPackage}
              disabled={submitting || !canSubmit}
              className="rounded-xl bg-[#3b71e6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Submitting
                </span>
              ) : (
                "Submit for verification"
              )}
            </button>
          ) : (
            <button
              type="button"
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
        type="button"
        onClick={() => navigate("/")}
        className="text-lg font-semibold tracking-tight text-gray-950"
      >
        Dovail Stay
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            window.open("mailto:business@dovail.com?subject=Trip Package Help")
          }
          className="hidden rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:block"
        >
          Questions?
        </button>

        <button
          type="button"
          onClick={() => navigate("/host-dashboard")}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Save & exit
        </button>
      </div>
    </header>
  );
}

function StepPills({ step, total, progress }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-950">
          Step {step + 1} of {total}
        </span>
        <span className="font-medium text-[#3b71e6]">{progress}% complete</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#3b71e6] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
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
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
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
        rows={5}
        {...props}
        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
      />
    </label>
  );
}

function PriceBox({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-white p-5">
      <span className="text-sm font-medium text-gray-500">{label}</span>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-3xl font-semibold text-gray-950">â‚¹</span>

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
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-gray-950">
        {value}
      </span>
    </div>
  );
}

const DEFAULT_MAP_CENTER = { lat: 25.2048, lng: 55.2708 };

let googleMapsLoader;

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsLoader) return googleMapsLoader;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY is missing from the environment.")
    );
  }

  googleMapsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-dovail-google-maps]');

    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps), {
        once: true,
      });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.dataset.dovailGoogleMaps = "true";
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.appendChild(script);
  });

  return googleMapsLoader;
}

function MapLocationPicker({ latitude, longitude, onLocationChange }) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const geocoderInstance = useRef(null);
  const [search, setSearch] = useState("");
  const [mapError, setMapError] = useState("");
  const [locating, setLocating] = useState(false);

  const setPoint = (lat, lng, centerMap = true) => {
    const point = { lat: Number(lat), lng: Number(lng) };

    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;

    markerInstance.current?.setPosition(point);
    markerInstance.current?.setVisible(true);

    if (centerMap) {
      mapInstance.current?.panTo(point);
      mapInstance.current?.setZoom(16);
    }

    const cleanLat = point.lat.toFixed(6);
    const cleanLng = point.lng.toFixed(6);

    onLocationChange({
      latitude: cleanLat,
      longitude: cleanLng,
      mapUrl: `https://www.google.com/maps?q=${cleanLat},${cleanLng}`,
    });
  };

  useEffect(() => {
    let cancelled = false;
    let mapClickListener;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapElement.current) return;

        const hasSavedPoint =
          Number.isFinite(Number(latitude)) &&
          Number.isFinite(Number(longitude)) &&
          latitude !== "" &&
          longitude !== "";
        const initialPoint = hasSavedPoint
          ? { lat: Number(latitude), lng: Number(longitude) }
          : DEFAULT_MAP_CENTER;

        const map = new maps.Map(mapElement.current, {
          center: initialPoint,
          zoom: hasSavedPoint ? 16 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        const marker = new maps.Marker({
          map,
          position: initialPoint,
          visible: hasSavedPoint,
          draggable: true,
          title: "Pickup point",
        });

        mapInstance.current = map;
        markerInstance.current = marker;
        geocoderInstance.current = new maps.Geocoder();

        mapClickListener = map.addListener("click", (event) => {
          setPoint(event.latLng.lat(), event.latLng.lng(), false);
        });

        marker.addListener("dragend", (event) => {
          setPoint(event.latLng.lat(), event.latLng.lng(), false);
        });
      })
      .catch((err) => setMapError(err.message));

    return () => {
      cancelled = true;
      mapClickListener?.remove();
    };
  }, []);

  const searchLocation = () => {
    if (!search.trim() || !geocoderInstance.current) return;

    setMapError("");
    geocoderInstance.current.geocode({ address: search.trim() }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const point = results[0].geometry.location;
        setPoint(point.lat(), point.lng());
        return;
      }

      setMapError("Location not found. Try a more complete address.");
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError("Current location is not supported by this browser.");
      return;
    }

    setLocating(true);
    setMapError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPoint(coords.latitude, coords.longitude);
        setLocating(false);
      },
      () => {
        setMapError("Location access was denied or unavailable.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-gray-700">
        Select exact pickup point
      </span>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              searchLocation();
            }
          }}
          placeholder="Search airport, hotel, landmark or address"
          className="h-11 flex-1 rounded-xl border border-gray-200 px-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
        />
        <button
          type="button"
          onClick={searchLocation}
          className="h-11 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white hover:bg-[#2f5fc2]"
        >
          Search map
        </button>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <LocateFixed size={16} />
          {locating ? "Locating..." : "Use my location"}
        </button>
      </div>

      {mapError ? (
        <div className="mt-3 flex min-h-72 items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {mapError}
        </div>
      ) : (
        <div
          ref={mapElement}
          className="mt-3 h-80 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100"
        />
      )}

      <p className="mt-2 text-xs text-gray-500">
        Search a place, click anywhere on the map, or drag the marker to the exact pickup point.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input label="Latitude" value={latitude} readOnly placeholder="Select on map" />
        <Input label="Longitude" value={longitude} readOnly placeholder="Select on map" />
      </div>
    </div>
  );
}