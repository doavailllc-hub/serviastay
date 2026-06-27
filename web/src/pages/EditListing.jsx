import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Upload, X, ImagePlus } from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function EditListing() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    title: "",
    location: "",
    price: "",
    description: "",
    category: "",
    guests: 1,
    bedrooms: 1,
    bathrooms: 1,
    image: "",
  });

  const [gallery, setGallery] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadListing();
    loadGallery();
  }, [id]);

  const loadListing = async () => {
    try {
      const res = await api.get(`/properties/${id}`);
      setForm(res.data);
    } catch (err) {
      console.log("Listing load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadGallery = async () => {
    try {
      const res = await api.get(`/property-images/${id}`);
      setGallery(res.data || []);
    } catch (err) {
      console.log("Gallery load failed:", err);
    }
  };

  const updateForm = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleNewFiles = (e) => {
    const selected = Array.from(e.target.files || []);

    const mapped = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setNewFiles((prev) => [...prev, ...mapped].slice(0, 10));
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteGalleryImage = async (imageId) => {
    const confirmDelete = window.confirm("Delete this image?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/property-images/${imageId}`);
      loadGallery();
    } catch (err) {
      console.log("Image delete failed:", err);
      alert("Image delete failed");
    }
  };

  const setCoverImage = (imageUrl) => {
    setForm({ ...form, image: imageUrl });
  };

  const uploadGalleryImage = async (file) => {
    const data = new FormData();
    data.append("image", file);
    data.append("property_id", id);

    await api.post("/property-images", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  };

  const saveChanges = async () => {
    if (!form.title?.trim()) {
      alert("Title is required");
      return;
    }

    if (!form.location?.trim()) {
      alert("Location is required");
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      alert("Valid price is required");
      return;
    }

    try {
      setSaving(true);

      await api.put(`/properties/${id}`, {
        ...form,
        price: Number(form.price),
        guests: Number(form.guests),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
      });

      for (const item of newFiles) {
        await uploadGalleryImage(item.file);
      }

      alert("Listing updated successfully");
      navigate("/host-listings");
    } catch (err) {
      console.log("Update failed:", err);
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-20">
          Loading listing...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Edit Listing
          </h1>

          <p className="mt-2 text-gray-500">
            Update your property information, pricing, and gallery.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label text="Listing Title" />
              <input
                type="text"
                value={form.title || ""}
                onChange={(e) => updateForm("title", e.target.value)}
                className="input"
              />
            </div>

            <Input
              label="Location"
              value={form.location}
              onChange={(v) => updateForm("location", v)}
            />

            <Input
              label="Price per Night"
              type="number"
              value={form.price}
              onChange={(v) => updateForm("price", v)}
            />

            <div>
              <Label text="Category" />
              <select
                value={form.category || "Apartment"}
                onChange={(e) => updateForm("category", e.target.value)}
                className="input"
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

            <Input
              label="Guests"
              type="number"
              value={form.guests}
              onChange={(v) => updateForm("guests", v)}
            />

            <Input
              label="Bedrooms"
              type="number"
              value={form.bedrooms}
              onChange={(v) => updateForm("bedrooms", v)}
            />

            <Input
              label="Bathrooms"
              type="number"
              value={form.bathrooms}
              onChange={(v) => updateForm("bathrooms", v)}
            />

            <div className="md:col-span-2">
              <Label text="Cover Image" />

              {form.image ? (
                <img
                  src={form.image}
                  alt={form.title}
                  className="h-72 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                  No cover image selected
                </div>
              )}

              <p className="mt-3 text-sm text-gray-500">
                Click any gallery image below to make it the cover photo.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label text="Existing Gallery Images" />

              {gallery.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  No gallery images yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {gallery.map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-100"
                    >
                      <img
                        src={item.image_url}
                        alt="Gallery"
                        className="h-48 w-full cursor-pointer object-cover"
                        onClick={() => setCoverImage(item.image_url)}
                      />

                      {form.image === item.image_url && (
                        <span className="absolute left-3 top-3 rounded-full bg-[3b71e6] px-3 py-1 text-xs font-bold text-white">
                          Cover
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteGalleryImage(item.id)}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-red-50"
                      >
                        <X size={18} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <Label text="Add New Images" />

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-[#FAFAFC] p-10 text-center transition hover:border-[3b71e6] hover:bg-[#F4F1FF]">
                <Upload size={38} className="mb-4 text-[3b71e6]" />

                <h3 className="text-lg font-bold text-gray-900">
                  Upload more photos
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Add new gallery photos for this listing.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleNewFiles}
                />
              </label>

              {newFiles.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {newFiles.map((item, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-100"
                    >
                      <img
                        src={item.preview}
                        alt={`Preview ${index + 1}`}
                        className="h-48 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-red-50"
                      >
                        <X size={18} className="text-red-500" />
                      </button>
                    </div>
                  ))}

                  <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-[#FAFAFC] hover:border-[3b71e6]">
                    <ImagePlus className="mb-2 text-[3b71e6]" />
                    <span className="text-sm font-semibold">
                      Add more
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleNewFiles}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <Label text="Description" />

              <textarea
                rows={6}
                value={form.description || ""}
                onChange={(e) => updateForm("description", e.target.value)}
                className="w-full resize-none rounded-xl border border-gray-300 p-4 outline-none focus:ring-2 focus:ring-[3b71e6]"
              />
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-end gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/host-listings")}
              className="h-12 rounded-xl border border-gray-300 px-8 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={saveChanges}
              disabled={saving}
              className="h-12 rounded-xl bg-[3b71e6] px-8 font-semibold text-white shadow-lg hover:bg-[#7152E8] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label text={label} />

      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="input"
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