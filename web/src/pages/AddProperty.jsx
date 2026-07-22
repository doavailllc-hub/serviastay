import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  X,
  ImagePlus,
  MessageCircle,
  ShieldCheck,
  Check,
  Search,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

import { AMENITY_GROUPS } from "../data/amenityData";

export default function AddProperty() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
  title: "",
  description: "",
  category: "Apartment",
  location: "",
  latitude: "",
  longitude: "",
  price: "",
  guests: 1,
  bedrooms: 1,
  bathrooms: 1,
  host_whatsapp: "",
  amenities: [],
});

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [amenitySearch, setAmenitySearch] = useState("");

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const cleanWhatsAppNumber = (value) => {
    return String(value || "").replace(/\D/g, "");
  };

  const toggleAmenity = (key) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((item) => item !== key)
        : [...prev.amenities, key],
    }));
  };

  const handleFiles = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length !== selectedFiles.length) {
      window.alert("Only image files are allowed");
    }

    const mappedFiles = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...mappedFiles].slice(0, 10));

    e.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      const target = prev[index];

      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadSingleImage = async (file) => {
    const data = new FormData();
    data.append("image", file);

    const res = await api.post("/upload", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data.imageUrl;
  };

  const uploadGalleryImage = async (propertyId, file) => {
    const data = new FormData();
    data.append("image", file);
    data.append("property_id", propertyId);

    await api.post("/property-images", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Property title is required";
    if (!form.description.trim()) return "Description is required";
    if (!form.location.trim()) return "Location is required";

    if (!form.price || Number(form.price) <= 0) {
      return "Valid price is required";
    }

    if (Number(form.guests) < 1) return "Guests must be at least 1";
    if (Number(form.bedrooms) < 1) return "Bedrooms must be at least 1";
    if (Number(form.bathrooms) < 1) return "Bathrooms must be at least 1";

    const whatsapp = cleanWhatsAppNumber(form.host_whatsapp);

    if (!whatsapp) {
      return "Host WhatsApp number is required";
    }

    if (whatsapp.length < 8 || whatsapp.length > 15) {
      return "Enter WhatsApp number with country code";
    }

    if (files.length === 0) {
      return "Please upload at least one image";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();

    if (error) {
      window.alert(error);
      return;
    }

    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!user || !token) {
      window.alert("Please login first");
      navigate("/");
      return;
    }

    try {
      setSubmitting(true);

      const coverImage = await uploadSingleImage(files[0].file);

const propertyRes = await api.post("/properties", {
  user_id: user.id,
  title: form.title.trim(),
  description: form.description.trim(),
  category: form.category,
  location: form.location.trim(),
  latitude: Number(form.latitude),
  longitude: Number(form.longitude),
  price: Number(form.price),
  guests: Number(form.guests),
  bedrooms: Number(form.bedrooms),
  bathrooms: Number(form.bathrooms),
  image: coverImage,
  host_whatsapp: cleanWhatsAppNumber(form.host_whatsapp),
  amenities: JSON.stringify(form.amenities),
});

      const propertyId = propertyRes.data.propertyId;

      for (const item of files) {
        await uploadGalleryImage(propertyId, item.file);
      }

      window.alert("Property added successfully");
      navigate("/host-listings");
    } catch (err) {
      console.log("Property create failed:", err);
      window.alert(err.response?.data?.message || "Property create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const normalizedAmenitySearch = amenitySearch.trim().toLowerCase();
  const filteredAmenityGroups = AMENITY_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(([, label]) =>
      label.toLowerCase().includes(normalizedAmenitySearch)
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Add Property
          </h1>

          <p className="mt-2 text-gray-500">
            Create a professional Staybnb listing with multiple photos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label text="Property title" />

              <input
                value={form.title}
                placeholder="Luxury pool villa near beach"
                className="input"
                onChange={(e) => updateForm("title", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label text="Description" />

              <textarea
                value={form.description}
                placeholder="Describe your property, nearby places, guest experience..."
                className="min-h-36 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-[#3b71e6]"
                onChange={(e) => updateForm("description", e.target.value)}
              />
            </div>

            <Field
              label="Location"
              value={form.location}
              placeholder="Kochi, Kerala"
              onChange={(value) => updateForm("location", value)}
            />
<Field
  label="Latitude"
  value={form.latitude}
  placeholder="9.931233"
  onChange={(value) => updateForm("latitude", value)}
/>

<Field
  label="Longitude"
  value={form.longitude}
  placeholder="76.267303"
  onChange={(value) => updateForm("longitude", value)}
/>
            <Field
              label="Price per night"
              value={form.price}
              placeholder="4500"
              type="number"
              min="1"
              onChange={(value) => updateForm("price", value)}
            />

            <Field
              label="Guests"
              value={form.guests}
              type="number"
              min="1"
              onChange={(value) => updateForm("guests", value)}
            />

            <Field
              label="Bedrooms"
              value={form.bedrooms}
              type="number"
              min="1"
              onChange={(value) => updateForm("bedrooms", value)}
            />

            <Field
              label="Bathrooms"
              value={form.bathrooms}
              type="number"
              min="1"
              onChange={(value) => updateForm("bathrooms", value)}
            />

            <div>
              <Label text="Category" />

              <select
                value={form.category}
                className="input"
                onChange={(e) => updateForm("category", e.target.value)}
              >
                <option>Apartment</option>
                <option>Villa</option>
                <option>House</option>
                <option>Cabin</option>
                <option>Hotel</option>
                <option>Resort</option>
                <option>Beach House</option>
                <option>Farm Stay</option>
              </select>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-gray-200 bg-white p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                    Amenities
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Select everything guests can use. {form.amenities.length} selected.
                  </p>
                </div>

                {form.amenities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateForm("amenities", [])}
                    className="self-start text-sm font-medium text-[#3b71e6] hover:underline sm:self-auto"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="relative mt-5">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={amenitySearch}
                  onChange={(event) => setAmenitySearch(event.target.value)}
                  placeholder="Search amenities"
                  className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                />
              </div>

              <div className="mt-6 max-h-[620px] space-y-7 overflow-y-auto pr-1">
                {filteredAmenityGroups.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-3 text-sm font-semibold text-gray-950">
                      {group.title}
                    </h3>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map(([key, label]) => {
                        const selected = form.amenities.includes(key);

                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleAmenity(key)}
                            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                              selected
                                ? "border-[#3b71e6] bg-[#eef4ff] font-medium text-[#2459bd]"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <span>{label}</span>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                selected
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
                  <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    No amenities match your search.
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-green-100 bg-green-50 p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-green-700">
                  <MessageCircle size={24} />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">
                    Host WhatsApp Number
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-green-700">
                    Booking details will be sent to this number. Customers will
                    not see this WhatsApp number.
                  </p>
                </div>
              </div>

              <input
                value={form.host_whatsapp}
                placeholder="Example: 966555099832"
                className="h-14 w-full rounded-xl border border-green-200 bg-white px-4 text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                onChange={(e) => updateForm("host_whatsapp", e.target.value)}
              />

              <div className="mt-3 flex items-start gap-2 text-sm text-green-700">
                <ShieldCheck size={17} className="mt-0.5" />
                <p>
                  Use country code without plus sign. Example:
                  <strong> 966555099832</strong>
                </p>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label text="Property photos" />

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-[#FAFAFC] p-10 text-center transition hover:border-[#3b71e6] hover:bg-[#F4F1FF]">
                <Upload size={38} className="mb-4 text-[#3b71e6]" />

                <h3 className="text-lg font-bold text-gray-900">
                  Upload multiple photos
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  First image will be used as cover photo. Maximum 10 images.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFiles}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {files.map((item, index) => (
                    <div
                      key={`${item.file.name}-${index}`}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-100"
                    >
                      <img
                        src={item.preview}
                        alt={`Preview ${index + 1}`}
                        className="h-48 w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#3b71e6] px-3 py-1 text-xs font-bold text-white">
                          Cover
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-red-50"
                      >
                        <X size={18} className="text-red-500" />
                      </button>
                    </div>
                  ))}

                  {files.length < 10 && (
                    <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-[#FAFAFC] hover:border-[#3b71e6]">
                      <ImagePlus className="mb-2 text-[#3b71e6]" />

                      <span className="text-sm font-semibold">
                        Add more
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFiles}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/host-listings")}
              className="h-14 rounded-xl border border-gray-300 px-8 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="h-14 rounded-xl bg-[#3b71e6] px-8 font-semibold text-white shadow-lg hover:bg-[#7152E8] disabled:opacity-60"
            >
              {submitting ? "Publishing..." : "Publish Listing"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  min,
}) {
  return (
    <div>
      <Label text={label} />

      <input
        value={value}
        placeholder={placeholder}
        type={type}
        min={min}
        className="input"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Label({ text }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-gray-700">
      {text}
    </label>
  );
}