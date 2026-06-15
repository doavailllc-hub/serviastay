import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  X,
  ImagePlus,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function AddProperty() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Apartment",
    location: "",
    price: "",
    guests: 1,
    bedrooms: 1,
    bathrooms: 1,
    host_whatsapp: "",
  });

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const cleanWhatsAppNumber = (value) => {
    return String(value || "").replace(/\D/g, "");
  };

  const handleFiles = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length !== selectedFiles.length) {
      alert("Only image files are allowed");
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
      alert(error);
      return;
    }

    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!user || !token) {
      alert("Please login first");
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
        price: Number(form.price),
        guests: Number(form.guests),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        image: coverImage,
        host_whatsapp: cleanWhatsAppNumber(form.host_whatsapp),
      });

      const propertyId = propertyRes.data.propertyId;

      for (const item of files) {
        await uploadGalleryImage(propertyId, item.file);
      }

      alert("Property added successfully");
      navigate("/host-listings");
    } catch (err) {
      console.log("Property create failed:", err);
      alert(err.response?.data?.message || "Property create failed");
    } finally {
      setSubmitting(false);
    }
  };

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
                className="min-h-36 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:ring-2 focus:ring-[#8363F5]"
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

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-[#FAFAFC] p-10 text-center transition hover:border-[#8363F5] hover:bg-[#F4F1FF]">
                <Upload size={38} className="mb-4 text-[#8363F5]" />

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
                        <span className="absolute left-3 top-3 rounded-full bg-[#8363F5] px-3 py-1 text-xs font-bold text-white">
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
                    <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-[#FAFAFC] hover:border-[#8363F5]">
                      <ImagePlus className="mb-2 text-[#8363F5]" />

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
              className="h-14 rounded-xl bg-[#8363F5] px-8 font-semibold text-white shadow-lg hover:bg-[#7152E8] disabled:opacity-60"
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