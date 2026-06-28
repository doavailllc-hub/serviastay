import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wifi,
  Tv,
  CookingPot,
  WashingMachine,
  Car,
  Snowflake,
  BriefcaseBusiness,
  Waves,
  Flame,
  Plus,
  Minus,
  MapPin,
  X,
  Camera,
  ArrowLeft,
} from "lucide-react";
import {
  GoogleMap,
  Marker,
  Autocomplete,
  useLoadScript,
} from "@react-google-maps/api";

import api from "../api/api";

const BRAND = "#3b71e6";
const BRAND_HOVER = "#2f5fc2";
const libraries = ["places"];

const steps = [
  "location",
  "floor",
  "bathrooms",
  "amenities",
  "photos",
  "finish",
  "pricing",
];

const amenitiesList = [
  { key: "wifi", label: "Wifi", icon: Wifi },
  { key: "tv", label: "TV", icon: Tv },
  { key: "kitchen", label: "Kitchen", icon: CookingPot },
  { key: "washer", label: "Washer", icon: WashingMachine },
  { key: "parking", label: "Free parking", icon: Car },
  { key: "ac", label: "Air conditioning", icon: Snowflake },
  { key: "workspace", label: "Workspace", icon: BriefcaseBusiness },
  { key: "pool", label: "Pool", icon: Waves },
  { key: "firepit", label: "Fire pit", icon: Flame },
];

export default function BecomeHost() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [autocomplete, setAutocomplete] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
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

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const progress = ((step + 1) / steps.length) * 100;

  const center = useMemo(
    () => ({
      lat: Number(form.latitude),
      lng: Number(form.longitude),
    }),
    [form.latitude, form.longitude]
  );

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const counter = (key, type) => {
    setForm((prev) => ({
      ...prev,
      [key]: type === "plus" ? prev[key] + 1 : Math.max(0, prev[key] - 1),
    }));
  };

  const handlePlaceChanged = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    update("location", place.formatted_address || place.name);
    update("latitude", place.geometry.location.lat());
    update("longitude", place.geometry.location.lng());
  };

  const toggleAmenity = (key) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((item) => item !== key)
        : [...prev.amenities, key],
    }));
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (form.images.length + files.length > 10) {
      alert("Maximum 10 photos allowed");
      return;
    }

    const previews = files.map((file) => URL.createObjectURL(file));

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
      previews: [...prev.previews, ...previews],
    }));
  };

  const removePhoto = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      previews: prev.previews.filter((_, i) => i !== index),
    }));
  };

  const canNext = () => {
    if (steps[step] === "location") return form.location && form.latitude;
    if (steps[step] === "floor") return form.guests > 0 && form.bedrooms > 0;
    if (steps[step] === "bathrooms") {
      return form.privateAttachedBath + form.dedicatedBath + form.sharedBath > 0;
    }
    if (steps[step] === "photos") return form.images.length >= 5;
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const back = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const publishListing = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        alert("Please login first");
        navigate("/");
        return;
      }

      const data = new FormData();

      data.append("user_id", user.id);
      data.append("location", form.location);
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

      form.images.forEach((file) => {
        data.append("images", file);
      });

      await api.post("/properties/host-create", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Listing published successfully");
      navigate("/host-listings");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to publish listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <HostHeader navigate={navigate} />

      <main className="mx-auto flex min-h-[calc(100vh-170px)] max-w-7xl items-center justify-center px-4 pb-28 pt-8 md:px-8">
        <div className="w-full max-w-3xl">
          {steps[step] === "location" && (
            <section>
              <PageTitle
                eyebrow="Step 1"
                title="Where is your place located?"
                description="Your exact address is only shared with guests after their reservation is confirmed."
              />

              <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <div className="relative h-[520px]">
                  {isLoaded && (
                    <>
                      <GoogleMap
                        center={center}
                        zoom={13}
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        onClick={(e) => {
                          update("latitude", e.latLng.lat());
                          update("longitude", e.latLng.lng());
                        }}
                        options={{
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: false,
                        }}
                      >
                        <Marker position={center} />
                      </GoogleMap>

                      <div className="absolute left-1/2 top-5 w-[92%] -translate-x-1/2 md:w-[82%]">
                        <Autocomplete
                          onLoad={setAutocomplete}
                          onPlaceChanged={handlePlaceChanged}
                        >
                          <div className="flex h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
                            <MapPin size={18} className="text-gray-500" />

                            <input
                              value={form.location}
                              onChange={(e) =>
                                update("location", e.target.value)
                              }
                              placeholder="Enter your address"
                              className="w-full text-sm outline-none placeholder:text-gray-400"
                            />
                          </div>
                        </Autocomplete>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {steps[step] === "floor" && (
            <section>
              <PageTitle
                eyebrow="Step 2"
                title="Add the basic details"
                description="Tell guests how many people can stay comfortably."
              />

              <div className="mt-8 rounded-2xl border border-gray-200 bg-white">
                <CounterRow
                  label="Guests"
                  value={form.guests}
                  onMinus={() => counter("guests", "minus")}
                  onPlus={() => counter("guests", "plus")}
                />

                <CounterRow
                  label="Bedrooms"
                  value={form.bedrooms}
                  onMinus={() => counter("bedrooms", "minus")}
                  onPlus={() => counter("bedrooms", "plus")}
                />

                <CounterRow
                  label="Beds"
                  value={form.beds}
                  onMinus={() => counter("beds", "minus")}
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
                eyebrow="Step 3"
                title="What bathrooms are available?"
                description="Help guests understand what type of bathroom access they will have."
              />

              <div className="mt-8 rounded-2xl border border-gray-200 bg-white">
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
                eyebrow="Step 4"
                title="What does your place offer?"
                description="Choose the amenities guests can use during their stay."
              />

              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
                {amenitiesList.map((item) => {
                  const Icon = item.icon;
                  const active = form.amenities.includes(item.key);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleAmenity(item.key)}
                      className={`rounded-2xl border p-4 text-left transition hover:bg-gray-50 ${
                        active
                          ? "border-[#3b71e6] bg-[#eef4ff] text-[#3b71e6]"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <Icon size={22} />

                      <span className="mt-4 block text-sm font-medium">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {steps[step] === "photos" && (
            <section>
              {form.previews.length === 0 ? (
                <>
                  <PageTitle
                    eyebrow="Step 5"
                    title="Add photos of your place"
                    description="Upload at least 5 photos. The first photo will be used as the cover."
                  />

                  <label className="mt-8 flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-[#3b71e6] hover:bg-[#f8fbff]">
                    <Camera size={42} className="text-[#3b71e6]" />

                    <span className="mt-5 rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white">
                      Add photos
                    </span>

                    <p className="mt-3 text-sm text-gray-500">
                      JPG, PNG or WEBP. Max 10 photos.
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
                      eyebrow="Step 5"
                      title="Choose at least 5 photos"
                      description={`${form.images.length} selected. Add more or remove photos before continuing.`}
                      compact
                    />

                    <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-50">
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
                        className={`relative overflow-hidden rounded-2xl bg-gray-100 ${
                          index === 0 ? "col-span-2 h-80" : "h-44"
                        }`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                        />

                        {index === 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-sm">
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
                  eyebrow="Step 6"
                  title="Finish up and publish"
                  description="Next, set pricing and publish your listing. You can edit details anytime from your dashboard."
                />
              </div>

              <div className="hidden md:block">
                <div className="flex h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-7xl">
                  🏠
                </div>
              </div>
            </section>
          )}

          {steps[step] === "pricing" && (
            <section>
              <PageTitle
                eyebrow="Step 7"
                title="Set your prices"
                description="Add weekday and weekend pricing for your listing."
              />

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <PriceBox
                  label="Weekday"
                  value={form.weekdayPrice}
                  onChange={(value) => update("weekdayPrice", value)}
                />

                <PriceBox
                  label="Weekend"
                  value={form.weekendPrice}
                  onChange={(value) => update("weekendPrice", value)}
                />
              </div>

              <button className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                <MapPin size={17} className="text-[#3b71e6]" />
                View similar listings
              </button>
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
              onClick={publishListing}
              disabled={loading}
              className="rounded-xl bg-[#3b71e6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Publishing..." : "Publish"}
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

        <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
          Save & exit
        </button>
      </div>
    </header>
  );
}

function PageTitle({ eyebrow, title, description, compact }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{eyebrow}</p>

      <h1
        className={`mt-2 font-semibold tracking-tight text-gray-950 ${
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
      className={`rounded-2xl border p-4 text-left text-sm font-medium transition ${
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
      className={`flex items-center justify-between px-5 py-5 ${
        last ? "" : "border-b border-gray-100"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-gray-950">{label}</p>
        {sub && <p className="mt-1 max-w-md text-sm text-gray-500">{sub}</p>}
      </div>

      <div className="flex items-center gap-4">
        <CounterButton onClick={onMinus}>
          <Minus size={14} />
        </CounterButton>

        <span className="w-5 text-center text-sm font-medium">{value}</span>

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
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950 hover:bg-gray-50"
    >
      {children}
    </button>
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

function UploadModal({ previews, imageCount, onClose, onAdd, onRemove }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-gray-950">Upload photos</p>
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
                className="relative h-32 overflow-hidden rounded-xl bg-gray-100"
              >
                <img src={src} alt="" className="h-full w-full object-cover" />

                <button
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
            onClick={onClose}
            className="text-sm font-medium text-gray-700 hover:underline"
          >
            Cancel
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}