import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Minus,
  MapPin,
  X,
  Camera,
  ArrowLeft,
  Home,
  CheckCircle,
  Check,
  Loader2,
  Search,
} from "lucide-react";

import api from "../api/api";
import { AMENITY_GROUPS } from "../data/amenityData";

const BRAND = "#3b71e6";
const BRAND_HOVER = "#2f5fc2";

const steps = [
  "basic",
  "location",
  "floor",
  "bathrooms",
  "amenities",
  "photos",
  "finish",
  "pricing",
];

export default function BecomeHost() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [uploadModal, setUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [amenitySearch, setAmenitySearch] = useState("");
  const previewsRef = useRef([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    latitude: 24.7136,
    longitude: 46.6753,
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bedroomLock: "",
    privateAttachedBath: 0,
    dedicatedBath: 0,
    sharedBath: 0,
    amenities: [],
    images: [],
    previews: [],
    weekdayPrice: 150,
    weekendPrice: 155,
  });

  const progress = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    previewsRef.current = form.previews;
  }, [form.previews]);

  useEffect(
    () => () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const normalizedAmenitySearch = amenitySearch.trim().toLowerCase();
  const filteredAmenityGroups = useMemo(
    () =>
      AMENITY_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(([, label]) =>
          label.toLowerCase().includes(normalizedAmenitySearch)
        ),
      })).filter((group) => group.items.length > 0),
    [normalizedAmenitySearch]
  );

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const counter = (key, type, min = 0) => {
    setForm((prev) => ({
      ...prev,
      [key]:
        type === "plus"
          ? Number(prev[key] || 0) + 1
          : Math.max(min, Number(prev[key] || 0) - 1),
    }));
  };

  const toggleAmenity = (key) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((item) => item !== key)
        : [...prev.amenities, key],
    }));
  };

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    if (validFiles.length !== files.length) {
      window.alert("Only JPG, PNG and WEBP image files are allowed.");
    }

    if (!validFiles.length) {
      return;
    }

    if (form.images.length + validFiles.length > 10) {
      window.alert("Maximum 10 photos allowed.");
      return;
    }

    const optimizedFiles = await Promise.all(validFiles.map(optimizeImage));
    const totalBytes = [...form.images, ...optimizedFiles].reduce(
      (sum, file) => sum + Number(file.size || 0),
      0
    );

    if (totalBytes > 50 * 1024 * 1024) {
      window.alert("The selected photos are still too large. Please use smaller images.");
      return;
    }

    const previews = optimizedFiles.map((file) => URL.createObjectURL(file));

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...optimizedFiles],
      previews: [...prev.previews, ...previews],
    }));

    e.target.value = "";
  };

  const removePhoto = (index) => {
    setForm((prev) => {
      URL.revokeObjectURL(prev.previews[index]);

      return {
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
        previews: prev.previews.filter((_, i) => i !== index),
      };
    });
  };

  const canNext = () => {
    const current = steps[step];

    if (current === "basic") return form.title.trim().length >= 5;
    if (current === "location") {
      return (
        form.location.trim() &&
        Number.isFinite(Number(form.latitude)) &&
        Number.isFinite(Number(form.longitude))
      );
    }
    if (current === "floor") {
      return form.guests > 0 && form.bedrooms > 0 && form.beds > 0;
    }
    if (current === "bathrooms") {
      return form.privateAttachedBath + form.dedicatedBath + form.sharedBath > 0;
    }
    if (current === "amenities") return form.amenities.length >= 3;
    if (current === "photos") return form.images.length >= 5;
    if (current === "pricing") {
      return Number(form.weekdayPrice) > 0 && Number(form.weekendPrice) > 0;
    }

    return true;
  };

  const next = () => {
    if (!canNext()) return;
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const publishListing = async () => {
    try {
      setLoading(true);
      setUploadProgress(0);

      const user =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!user || !token) {
        window.alert("Please login first.");
        navigate("/login", { replace: true });
        return;
      }

      const data = new FormData();

      data.append("user_id", user.id);
      data.append("title", form.title.trim());
      data.append("description", form.description.trim());
      data.append("location", form.location.trim());
      data.append("latitude", form.latitude);
      data.append("longitude", form.longitude);
      data.append("guests", form.guests);
      data.append("bedrooms", form.bedrooms);
      data.append("beds", form.beds);
      data.append("bedroomLock", form.bedroomLock);
      data.append("privateAttachedBath", form.privateAttachedBath);
      data.append("dedicatedBath", form.dedicatedBath);
      data.append("sharedBath", form.sharedBath);
      data.append("amenities", JSON.stringify(form.amenities));
      data.append("weekdayPrice", form.weekdayPrice);
      data.append("weekendPrice", form.weekendPrice);
      data.append("status", "pending");
      data.append("is_verified", "0");

      form.images.forEach((file) => {
        data.append("images", file);
      });

      await api.post("/properties/host-create", data, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        },
      });

      form.previews.forEach((url) => URL.revokeObjectURL(url));
      window.alert(
        "Listing submitted for verification. It will show publicly after admin approval."
      );
      navigate("/host-listings", { replace: true });
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to submit listing.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <HostHeader navigate={navigate} />

      <main className="mx-auto flex min-h-[calc(100vh-170px)] max-w-7xl items-center justify-center px-4 pb-28 pt-8 md:px-8">
        <div className="w-full max-w-3xl">
          {steps[step] === "basic" && (
            <section>
              <PageTitle
                eyebrow="Step 1"
                title="Name your stay"
                description="Add a clear, professional stay name. This is the first thing guests will see after admin approval."
              />

              <div className="mt-8 space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Stay name
                  </span>

                  <input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    maxLength={90}
                    placeholder="Example: Luxury private villa with pool"
                    className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-4 text-lg font-semibold outline-none transition focus:border-[#3b71e6] focus:ring-4 focus:ring-blue-50"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Minimum 5 characters. {form.title.length}/90
                  </p>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Short description
                  </span>

                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    maxLength={300}
                    rows={5}
                    placeholder="Describe your stay, nearby places, comfort, view, parking, or special features."
                    className="mt-3 w-full resize-none rounded-2xl border border-gray-200 px-4 py-4 text-sm leading-6 outline-none transition focus:border-[#3b71e6] focus:ring-4 focus:ring-blue-50"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Optional, but recommended. {form.description.length}/300
                  </p>
                </label>
              </div>
            </section>
          )}

          {steps[step] === "location" && (
            <section>
              <PageTitle
                eyebrow="Step 2"
                title="Where is your place located?"
                description="Your exact address is only shared with guests after their reservation is confirmed."
              />

              <LocationMapPicker
                location={form.location}
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={({ location, latitude, longitude }) =>
                  setForm((prev) => ({
                    ...prev,
                    location: location ?? prev.location,
                    latitude,
                    longitude,
                  }))
                }
              />
            </section>
          )}

          {steps[step] === "floor" && (
            <section>
              <PageTitle
                eyebrow="Step 3"
                title="Add the basic details"
                description="Tell guests how many people can stay comfortably."
              />

              <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-sm">
                <CounterRow
                  label="Guests"
                  value={form.guests}
                  onMinus={() => counter("guests", "minus", 1)}
                  onPlus={() => counter("guests", "plus")}
                />

                <CounterRow
                  label="Bedrooms"
                  value={form.bedrooms}
                  onMinus={() => counter("bedrooms", "minus", 1)}
                  onPlus={() => counter("bedrooms", "plus")}
                />

                <CounterRow
                  label="Beds"
                  value={form.beds}
                  onMinus={() => counter("beds", "minus", 1)}
                  onPlus={() => counter("beds", "plus")}
                  last
                />
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
                  Does every bedroom have a lock?
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <RadioCard
                    label="Yes"
                    active={form.bedroomLock === "yes"}
                    onClick={() => update("bedroomLock", "yes")}
                  />

                  <RadioCard
                    label="No"
                    active={form.bedroomLock === "no"}
                    onClick={() => update("bedroomLock", "no")}
                  />
                </div>
              </div>
            </section>
          )}

          {steps[step] === "bathrooms" && (
            <section>
              <PageTitle
                eyebrow="Step 4"
                title="What bathrooms are available?"
                description="Help guests understand what type of bathroom access they will have."
              />

              <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-sm">
                <CounterRow
                  label="Private and attached"
                  sub="Connected to the guest’s room and only for them."
                  value={form.privateAttachedBath}
                  onMinus={() => counter("privateAttachedBath", "minus")}
                  onPlus={() => counter("privateAttachedBath", "plus")}
                />

                <CounterRow
                  label="Dedicated"
                  sub="Private bathroom accessed through a shared space."
                  value={form.dedicatedBath}
                  onMinus={() => counter("dedicatedBath", "minus")}
                  onPlus={() => counter("dedicatedBath", "plus")}
                />

                <CounterRow
                  label="Shared"
                  sub="Shared with other guests or residents."
                  value={form.sharedBath}
                  onMinus={() => counter("sharedBath", "minus")}
                  onPlus={() => counter("sharedBath", "plus")}
                  last
                />
              </div>
            </section>
          )}

          {steps[step] === "amenities" && (
            <section>
              <PageTitle
                eyebrow="Step 5"
                title="What does your place offer?"
                description="Choose at least 3 amenities guests can use during their stay."
              />

              <div className="relative mt-7">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={amenitySearch}
                  onChange={(event) => setAmenitySearch(event.target.value)}
                  placeholder="Search amenities"
                  className="h-12 w-full rounded-2xl border border-gray-200 pl-11 pr-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <p className="mt-3 text-sm font-medium text-[#3b71e6]">
                {form.amenities.length} selected
              </p>

              <div className="mt-6 max-h-[560px] space-y-7 overflow-y-auto pr-1">
                {filteredAmenityGroups.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-3 text-sm font-semibold text-gray-950">
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {group.items.map(([key, label]) => {
                        const active = form.amenities.includes(key);

                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleAmenity(key)}
                            className={`flex min-h-20 items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-[#3b71e6] bg-[#eef4ff] text-[#3b71e6] shadow-sm"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <span className="text-sm font-semibold">{label}</span>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                active
                                  ? "border-[#3b71e6] bg-[#3b71e6] text-white"
                                  : "border-gray-300 text-transparent"
                              }`}
                            >
                              <Check size={14} strokeWidth={3} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {filteredAmenityGroups.length === 0 && (
                  <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    No amenities match your search.
                  </div>
                )}
              </div>
            </section>
          )}

          {steps[step] === "photos" && (
            <section>
              {form.previews.length === 0 ? (
                <>
                  <PageTitle
                    eyebrow="Step 6"
                    title="Add photos of your place"
                    description="Upload at least 5 photos. The first photo will be used as the cover."
                  />

                  <label className="mt-8 flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-[#3b71e6] hover:bg-[#f8fbff]">
                    <Camera size={42} className="text-[#3b71e6]" />

                    <span className="mt-5 rounded-2xl bg-[#3b71e6] px-5 py-3 text-sm font-semibold text-white">
                      Add photos
                    </span>

                    <p className="mt-3 text-sm text-gray-500">
                      JPG, PNG or WEBP. Minimum 5, maximum 10 photos.
                    </p>

                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        handleImages(e);
                        setUploadModal(true);
                      }}
                      className="hidden"
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-4">
                    <PageTitle
                      eyebrow="Step 6"
                      title="Choose at least 5 photos"
                      description={`${form.images.length} selected. First image is cover photo.`}
                      compact
                    />

                    <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-50">
                      <Plus size={18} />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImages}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {form.previews.map((src, index) => (
                      <div
                        key={src}
                        className={`relative overflow-hidden rounded-3xl bg-gray-100 ${
                          index === 0 ? "col-span-2 h-80" : "h-44"
                        }`}
                      >
                        <img
                          src={src}
                          alt={`Listing photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />

                        {index === 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
                            Cover
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute right-3 top-3 rounded-full bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-100"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {uploadModal && (
                <UploadModal
                  previews={form.previews}
                  imageCount={form.images.length}
                  onClose={() => setUploadModal(false)}
                  onAdd={handleImages}
                  onRemove={removePhoto}
                />
              )}
            </section>
          )}

          {steps[step] === "finish" && (
            <section className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <PageTitle
                  eyebrow="Step 7"
                  title="Your listing is almost ready"
                  description="Next, set pricing and submit your stay for admin verification. It will not appear publicly until approved."
                />

                <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex gap-3">
                    <CheckCircle className="mt-0.5 text-[#3b71e6]" size={22} />
                    <div>
                      <p className="text-sm font-semibold text-gray-950">
                        Verification required
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Admin will check your stay details, photos, and location
                        before making it live.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <div className="flex h-[320px] items-center justify-center rounded-3xl border border-gray-200 bg-gray-50">
                  <Home size={96} className="text-[#3b71e6]" />
                </div>
              </div>
            </section>
          )}

          {steps[step] === "pricing" && (
            <section>
              <PageTitle
                eyebrow="Step 8"
                title="Set your prices"
                description="Add weekday and weekend pricing for your listing."
              />

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <PriceBox
                  label="Weekday price"
                  value={form.weekdayPrice}
                  onChange={(value) => update("weekdayPrice", value)}
                />

                <PriceBox
                  label="Weekend price"
                  value={form.weekendPrice}
                  onChange={(value) => update("weekendPrice", value)}
                />
              </div>

              <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-semibold text-gray-950">
                  Submit for verification
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  After submission, this stay will remain pending until admin
                  approves it.
                </p>
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
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step === steps.length - 1 ? (
            <button
              onClick={publishListing}
              disabled={loading || !canNext()}
              className="rounded-2xl bg-[#3b71e6] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Submitting{uploadProgress ? ` ${uploadProgress}%` : "..."}
                </span>
              ) : (
                "Send for verification"
              )}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!canNext()}
              className="rounded-2xl bg-[#3b71e6] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
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
        className="text-lg font-bold tracking-tight text-gray-950"
      >
        Dovail Stay
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="hidden rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:block"
        >
          Questions?
        </button>

        <button
          type="button"
          onClick={() => navigate("/host-listings")}
          className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Save & exit
        </button>
      </div>
    </header>
  );
}

let googleMapsPromise;

function loadGoogleMapsOnce() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is missing."));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existing) {
      existing.addEventListener(
        "load",
        () => resolve(window.google.maps),
        { once: true }
      );
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Maps could not be loaded.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "dovail-google-maps";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function LocationMapPicker({ location, latitude, longitude, onChange }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [query, setQuery] = useState(location || "");
  const [mapError, setMapError] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let clickListener;
    let idleListener;

    loadGoogleMapsOnce()
      .then((maps) => {
        if (cancelled || !mapElement.current) return;

        const initial = {
          lat: Number(latitude) || 24.7136,
          lng: Number(longitude) || 46.6753,
        };

        const map = new maps.Map(mapElement.current, {
          center: initial,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });

        mapRef.current = map;
        geocoderRef.current = new maps.Geocoder();

        const publishCenter = (center) => {
          if (!center) return;
          onChangeRef.current({
            latitude: Number(center.lat()).toFixed(7),
            longitude: Number(center.lng()).toFixed(7),
          });
        };

        clickListener = map.addListener("click", (event) => {
          map.panTo(event.latLng);
          publishCenter(event.latLng);
        });

        idleListener = map.addListener("idle", () => {
          publishCenter(map.getCenter());
        });
      })
      .catch((err) => setMapError(err.message));

    return () => {
      cancelled = true;
      clickListener?.remove();
      idleListener?.remove();
    };
  }, []);

  const searchAddress = () => {
    if (!query.trim() || !geocoderRef.current) return;

    setSearching(true);
    setMapError("");
    geocoderRef.current.geocode(
      { address: query.trim() },
      (results, status) => {
        setSearching(false);

        if (status !== "OK" || !results?.[0]) {
          setMapError("Address not found. Try a more complete address.");
          return;
        }

        const result = results[0];
        const point = result.geometry.location;
        const formattedAddress = result.formatted_address || query.trim();

        setQuery(formattedAddress);
        mapRef.current?.panTo(point);
        mapRef.current?.setZoom(17);
        onChangeRef.current({
          location: formattedAddress,
          latitude: Number(point.lat()).toFixed(7),
          longitude: Number(point.lng()).toFixed(7),
        });
      }
    );
  };

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-sm">
      <div className="relative h-[520px]">
        <div ref={mapElement} className="h-full w-full" />

        {!mapError && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-[#3b71e6] drop-shadow-md">
            <MapPin size={40} fill="white" strokeWidth={2.4} />
          </div>
        )}

        <div className="absolute left-1/2 top-5 w-[92%] -translate-x-1/2 md:w-[82%]">
          <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 pl-4 shadow-lg">
            <MapPin size={18} className="shrink-0 text-gray-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  searchAddress();
                }
              }}
              placeholder="Search address, landmark or area"
              className="min-w-0 flex-1 text-sm outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={searchAddress}
              disabled={searching}
              className="h-10 rounded-xl bg-[#3b71e6] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {searching ? "Searching" : "Search"}
            </button>
          </div>

          {mapError && (
            <div className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow">
              {mapError}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-medium text-gray-600 shadow backdrop-blur">
          <span>{Number(latitude).toFixed(6)}</span>
          <span>·</span>
          <span>{Number(longitude).toFixed(6)}</span>
        </div>
      </div>
      <p className="bg-white px-4 py-3 text-xs text-gray-500">
        Search an address, click the map, or drag the map until the pin is exactly on your property.
      </p>
    </div>
  );
}

async function optimizeImage(file) {
  if (file.size <= 1.5 * 1024 * 1024 || !window.createImageBitmap) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2400;
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.84)
    );

    if (!blob || blob.size >= file.size) return file;

    const cleanName = file.name.replace(/\.[^.]+$/, "") || "listing-photo";
    return new File([blob], `${cleanName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function PageTitle({ eyebrow, title, description, compact }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500">{eyebrow}</p>

      <h1
        className={`mt-2 font-bold tracking-tight text-gray-950 ${
          compact ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"
        }`}
      >
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

function RadioCard({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left text-sm font-semibold transition ${
        active
          ? "border-[#3b71e6] bg-[#eef4ff] text-[#3b71e6]"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function CounterRow({ label, sub, value, onMinus, onPlus, last }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-5 ${
        last ? "" : "border-b border-gray-100"
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-gray-950">{label}</p>
        {sub && <p className="mt-1 max-w-md text-sm text-gray-500">{sub}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <CounterButton onClick={onMinus}>
          <Minus size={14} />
        </CounterButton>

        <span className="w-6 text-center text-sm font-semibold">{value}</span>

        <CounterButton onClick={onPlus}>
          <Plus size={14} />
        </CounterButton>
      </div>
    </div>
  );
}

function CounterButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function PriceBox({ label, value, onChange }) {
  return (
    <label className="block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className="text-sm font-semibold text-gray-500">{label}</span>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-950">₹</span>

        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-3xl font-bold text-gray-950 outline-none"
        />
      </div>
    </label>
  );
}

function UploadModal({ previews, imageCount, onClose, onAdd, onRemove }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>

          <div className="text-center">
            <p className="text-sm font-bold text-gray-950">Upload photos</p>
            <p className="text-xs text-gray-500">{imageCount} selected</p>
          </div>

          <label className="cursor-pointer rounded-full p-2 transition hover:bg-gray-100">
            <Plus size={18} />
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onAdd}
              className="hidden"
            />
          </label>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-3">
            {previews.map((src, index) => (
              <div
                key={src}
                className="relative h-32 overflow-hidden rounded-2xl bg-gray-100"
              >
                <img
                  src={src}
                  alt={`Upload ${index + 1}`}
                  className="h-full w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-gray-700 shadow-sm"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-16 items-center justify-between border-t border-gray-200 px-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-700 hover:underline"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-[#3b71e6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f5fc2]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}