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
} from "lucide-react";
import { GoogleMap, Marker, Autocomplete, useLoadScript } from "@react-google-maps/api";
import api from "../api/api";

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
  { key: "workspace", label: "Dedicated workspace", icon: BriefcaseBusiness },
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
    const files = Array.from(e.target.files);

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
    <div className="min-h-screen bg-white text-[#222222]">
      <HostHeader />

      <main className="min-h-[calc(100vh-160px)] flex items-center justify-center px-6 pb-28">
        <div className="w-full max-w-[580px]">
          {steps[step] === "location" && (
            <section>
              <h1 className="text-3xl font-semibold">
                Where&apos;s your place located?
              </h1>
              <p className="text-gray-500 mt-2">
                Your address is only shared with guests after they&apos;ve made a reservation.
              </p>

              <div className="mt-10 h-[560px] rounded-none overflow-hidden relative bg-gray-100">
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

                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[88%]">
                      <Autocomplete
                        onLoad={setAutocomplete}
                        onPlaceChanged={handlePlaceChanged}
                      >
                        <div className="h-16 bg-white rounded-full shadow-xl flex items-center px-7 gap-4">
                          <MapPin size={24} />
                          <input
                            value={form.location}
                            onChange={(e) => update("location", e.target.value)}
                            placeholder="Enter your address"
                            className="w-full outline-none text-sm font-medium"
                          />
                        </div>
                      </Autocomplete>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {steps[step] === "floor" && (
            <section>
              <h1 className="text-3xl font-semibold">
                Let&apos;s start with the basics
              </h1>

              <p className="font-medium mt-10">How many people can stay here?</p>

              <div className="mt-8 space-y-0">
                <CounterRow label="Guests" value={form.guests} onMinus={() => counter("guests", "minus")} onPlus={() => counter("guests", "plus")} />
                <CounterRow label="Bedrooms" value={form.bedrooms} onMinus={() => counter("bedrooms", "minus")} onPlus={() => counter("bedrooms", "plus")} />
                <CounterRow label="Beds" value={form.beds} onMinus={() => counter("beds", "minus")} onPlus={() => counter("beds", "plus")} />
              </div>

              <div className="mt-10">
                <p className="font-semibold">Does every bedroom have a lock?</p>

                <label className="flex items-center gap-3 mt-6 cursor-pointer">
                  <input
                    type="radio"
                    name="lock"
                    checked={form.bedroomLock === "yes"}
                    onChange={() => update("bedroomLock", "yes")}
                    className="w-5 h-5"
                  />
                  Yes
                </label>

                <label className="flex items-center gap-3 mt-5 cursor-pointer">
                  <input
                    type="radio"
                    name="lock"
                    checked={form.bedroomLock === "no"}
                    onChange={() => update("bedroomLock", "no")}
                    className="w-5 h-5"
                  />
                  No
                </label>
              </div>
            </section>
          )}

          {steps[step] === "bathrooms" && (
            <section>
              <h1 className="text-3xl font-semibold leading-tight">
                What kind of bathrooms are available to guests?
              </h1>

              <div className="mt-10">
                <CounterRow
                  label="Private and attached"
                  sub="It’s connected to the guest’s room and is just for them."
                  value={form.privateAttachedBath}
                  onMinus={() => counter("privateAttachedBath", "minus")}
                  onPlus={() => counter("privateAttachedBath", "plus")}
                />

                <CounterRow
                  label="Dedicated"
                  sub="It’s private, but accessed via a shared space, like a hallway."
                  value={form.dedicatedBath}
                  onMinus={() => counter("dedicatedBath", "minus")}
                  onPlus={() => counter("dedicatedBath", "plus")}
                />

                <CounterRow
                  label="Shared"
                  sub="It’s shared with other people."
                  value={form.sharedBath}
                  onMinus={() => counter("sharedBath", "minus")}
                  onPlus={() => counter("sharedBath", "plus")}
                />
              </div>
            </section>
          )}

          {steps[step] === "amenities" && (
            <section>
              <h1 className="text-3xl font-semibold">
                Tell guests what your place has to offer
              </h1>
              <p className="text-gray-500 mt-2">
                You can add more amenities after you publish your listing.
              </p>

              <p className="font-semibold mt-8 mb-5">
                What about these guest favorites?
              </p>

              <div className="grid grid-cols-3 gap-3">
                {amenitiesList.map((item) => {
                  const Icon = item.icon;
                  const active = form.amenities.includes(item.key);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleAmenity(item.key)}
                      className={`h-28 border rounded-xl p-4 text-left hover:border-black transition ${
                        active ? "border-black bg-gray-50" : "border-gray-300"
                      }`}
                    >
                      <Icon size={26} />
                      <span className="block mt-5 text-sm font-semibold">
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
                  <h1 className="text-3xl font-semibold">
                    Add some photos of your house
                  </h1>
                  <p className="text-gray-500 mt-2">
                    You&apos;ll need 5 photos to get started. You can add more or make changes later.
                  </p>

                  <label className="mt-12 h-[500px] border border-dashed border-gray-400 rounded-xl flex flex-col items-center justify-center cursor-pointer">
                    <Camera size={80} className="text-gray-500" />
                    <span className="mt-8 px-5 py-3 rounded-lg bg-gray-100 font-semibold">
                      Add photos
                    </span>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold">
                        Choose at least 5 photos
                      </h1>
                      <p className="text-gray-500">Drag to reorder</p>
                    </div>

                    <label className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer">
                      <Plus size={20} />
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
                        className={`relative rounded-xl overflow-hidden bg-gray-100 ${
                          index === 0 ? "col-span-2 h-80" : "h-44"
                        }`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                        />

                        {index === 0 && (
                          <span className="absolute top-4 left-4 bg-white px-4 py-2 rounded-md text-sm font-semibold">
                            Cover Photo
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-4 right-4 bg-white rounded-full p-2 shadow"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {uploadModal && (
                <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center">
                  <div className="w-[520px] bg-white rounded-3xl overflow-hidden">
                    <div className="h-16 flex items-center justify-between px-6 border-b">
                      <button onClick={() => setUploadModal(false)}>
                        <X size={20} />
                      </button>
                      <div className="text-center">
                        <p className="font-semibold">Upload photos</p>
                        <p className="text-xs text-gray-500">
                          {form.images.length} items selected
                        </p>
                      </div>

                      <label className="cursor-pointer">
                        <Plus size={20} />
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImages}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="p-6 min-h-[230px]">
                      <div className="grid grid-cols-3 gap-3">
                        {form.previews.map((src, index) => (
                          <div key={src} className="relative h-32 rounded-xl overflow-hidden">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-2 right-2 bg-black text-white rounded-full p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-20 border-t flex items-center justify-between px-6">
                      <button onClick={() => setUploadModal(false)}>
                        Cancel
                      </button>
                      <button
                        onClick={() => setUploadModal(false)}
                        className="bg-black text-white px-8 py-3 rounded-lg font-semibold"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {steps[step] === "finish" && (
            <section className="grid grid-cols-1 md:grid-cols-2 items-center gap-10 max-w-5xl mx-auto">
              <div>
                <p className="font-semibold">Step 3</p>
                <h1 className="text-4xl font-semibold mt-5">
                  Finish up and publish
                </h1>
                <p className="text-gray-600 mt-5 leading-7">
                  Finally, you&apos;ll choose booking settings, set up pricing, and publish your listing.
                </p>
              </div>

              <div className="hidden md:block">
                <div className="w-full h-[360px] rounded-3xl bg-gray-100 flex items-center justify-center text-8xl">
                  🏠
                </div>
              </div>
            </section>
          )}

          {steps[step] === "pricing" && (
            <section>
              <h1 className="text-3xl font-semibold">Now, set your prices</h1>
              <p className="text-gray-500 mt-2">
                These suggestions are based on guest demand for similar listings.
              </p>

              <div className="mt-10 space-y-4">
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

              <button className="mx-auto mt-8 flex items-center gap-2 border rounded-full px-5 py-3 shadow-md text-sm font-semibold">
                <MapPin size={18} className="text-[#FF385C]" />
                View similar listings
              </button>
            </section>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white z-40">
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-black transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="h-20 px-10 flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="font-semibold disabled:opacity-30"
          >
            Back
          </button>

          {step === steps.length - 1 ? (
            <button
              onClick={publishListing}
              disabled={loading}
              className="bg-black text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? "Publishing..." : "Publish"}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!canNext()}
              className="bg-black text-white px-8 py-3 rounded-lg font-semibold disabled:bg-gray-100 disabled:text-gray-400"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function HostHeader() {
  return (
    <header className="h-24 px-10 flex items-center justify-between">
      <div className="text-4xl font-bold">⌂</div>

      <div className="flex items-center gap-4">
        <button className="border rounded-full px-5 py-3 text-sm font-semibold">
          Questions?
        </button>

        <button className="border rounded-full px-5 py-3 text-sm font-semibold">
          Save & exit
        </button>
      </div>
    </header>
  );
}

function CounterRow({ label, sub, value, onMinus, onPlus }) {
  return (
    <div className="py-5 border-b flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMinus}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <Minus size={16} />
        </button>

        <span className="w-4 text-center">{value}</span>

        <button
          type="button"
          onClick={onPlus}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function PriceBox({ label, value, onChange }) {
  return (
    <label className="block border rounded-xl p-6">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-3xl font-semibold">SR</span>
        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-3xl font-semibold outline-none w-full"
        />
      </div>
    </label>
  );
}