import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, X } from "lucide-react";
import { GoogleMap, Marker, Autocomplete, useLoadScript } from "@react-google-maps/api";
import api from "../api/api";
import Navbar from "../components/Navbar";

const libraries = ["places"];

const initialForm = {
  title: "",
  description: "",
  location: "",
  price: 150,
  category: "Villa",
  guests: 2,
  bedrooms: 1,
  bathrooms: 1,
  images: [],
  latitude: null,
  longitude: null,
};

export default function BecomeHost() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const mapCenter = useMemo(
    () => ({
      lat: form.latitude || 24.7136,
      lng: form.longitude || 46.6753,
    }),
    [form.latitude, form.longitude]
  );

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files);

    if (!files.length) return;

    if (files.length + form.images.length > 8) {
      alert("Maximum 8 images allowed");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        alert("Only JPG, PNG, and WEBP images are allowed");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Each image must be less than 5MB");
        return;
      }
    }

    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...previewUrls]);

    const data = new FormData();
    files.forEach((file) => data.append("images", file));

    try {
      const res = await api.post(`${apiUrl}/api/upload/multiple`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      updateForm("images", [...form.images, ...res.data.imageUrls]);
    } catch (err) {
      alert("Image upload failed");
    }
  };

  const removeImage = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    updateForm(
      "images",
      form.images.filter((_, i) => i !== index)
    );
  };

  const handlePlaceChanged = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (!place.geometry) return;

    updateForm("location", place.formatted_address || place.name);
    updateForm("latitude", place.geometry.location.lat());
    updateForm("longitude", place.geometry.location.lng());
  };

  const handleMapClick = (e) => {
    updateForm("latitude", e.latLng.lat());
    updateForm("longitude", e.latLng.lng());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      alert("Please login first");
      navigate("/");
      return;
    }

    if (form.images.length < 3) {
      alert("Please upload at least 3 property images");
      return;
    }

    if (!form.latitude || !form.longitude) {
      alert("Please select property location on Google Map");
      return;
    }

    try {
      setLoading(true);

      await api.post(`${apiUrl}/api/properties`, {
        ...form,
        user_id: user.id,
        price: Number(form.price),
        guests: Number(form.guests),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
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
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_560px] gap-10">
          <section className="rounded-3xl bg-gradient-to-br from-[#8363F5] to-[#5F40E2] text-white p-8 md:p-12 min-h-[620px] flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-white/80">
                Staybnb Hosting
              </span>

              <h1 className="text-4xl md:text-6xl font-bold leading-tight mt-6">
                Open your door
                <br />
                to hosting.
              </h1>

              <p className="text-white/85 text-lg mt-6 max-w-xl leading-8">
                Add your property photos, exact map location, price, and guest
                details to publish your listing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <div className="rounded-2xl bg-white/15 backdrop-blur p-5">
                <h3 className="text-3xl font-bold">8 Photos</h3>
                <p className="text-white/75 mt-2 text-sm">
                  Airbnb-style gallery
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 backdrop-blur p-5">
                <h3 className="text-3xl font-bold">Map</h3>
                <p className="text-white/75 mt-2 text-sm">
                  Google location picker
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Tell us about your space
            </h2>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Input
                label="Property Title"
                value={form.title}
                onChange={(value) => updateForm("title", value)}
                placeholder="Luxury Sunset Premium Suite Villa"
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  required
                  placeholder="Describe your property..."
                  className="w-full h-28 p-4 rounded-xl border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>

                {isLoaded && (
                  <Autocomplete
                    onLoad={setAutocomplete}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => updateForm("location", e.target.value)}
                      placeholder="Search property location"
                      required
                      className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
                    />
                  </Autocomplete>
                )}
              </div>

              {isLoaded && (
                <div className="h-72 rounded-3xl overflow-hidden border">
                  <GoogleMap
                    center={mapCenter}
                    zoom={13}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    onClick={handleMapClick}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {form.latitude && form.longitude && (
                      <Marker
                        position={{
                          lat: form.latitude,
                          lng: form.longitude,
                        }}
                      />
                    )}
                  </GoogleMap>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <CategoryButton
                  active={form.category === "Villa"}
                  icon="🏡"
                  label="Villa"
                  onClick={() => updateForm("category", "Villa")}
                />

                <CategoryButton
                  active={form.category === "Apartment"}
                  icon="🏢"
                  label="Apartment"
                  onClick={() => updateForm("category", "Apartment")}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <NumberInput label="Guests" value={form.guests} onChange={(v) => updateForm("guests", v)} />
                <NumberInput label="Bedrooms" value={form.bedrooms} onChange={(v) => updateForm("bedrooms", v)} />
                <NumberInput label="Bathrooms" value={form.bathrooms} onChange={(v) => updateForm("bathrooms", v)} />
              </div>

              <NumberInput
                label="Price Per Night"
                value={form.price}
                onChange={(v) => updateForm("price", v)}
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Images
                </label>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-3xl p-6 cursor-pointer hover:border-[#8363F5] transition">
                  <UploadCloud size={36} className="text-[#8363F5]" />
                  <p className="font-semibold mt-3">
                    Upload multiple property photos
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum 3, maximum 8 images
                  </p>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImagesUpload}
                    className="hidden"
                  />
                </label>

                {previews.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {previews.map((src, index) => (
                      <div key={src} className="relative group">
                        <img
                          src={src}
                          alt={`Property ${index + 1}`}
                          className="h-36 w-full object-cover rounded-2xl"
                        />

                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold text-lg shadow-lg transition disabled:opacity-60"
              >
                {loading ? "Publishing..." : "Publish Your Listing"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
      />
    </div>
  );
}

function CategoryButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-5 text-left transition ${
        active
          ? "border-[#8363F5] bg-[#F4F1FF] shadow-md"
          : "border-gray-200 hover:border-gray-900"
      }`}
    >
      <span className="text-4xl">{icon}</span>
      <span className="block mt-4 font-semibold">{label}</span>
    </button>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-2">
        {label}
      </label>

      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
      />
    </div>
  );
}