import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function BecomeHost() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    price: "150",
    category: "Villa",
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    image: "",
  });

  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));

    const data = new FormData();
    data.append("image", file);

    const res = await axios.post("http://localhost:5000/api/upload", data);
    updateForm("image", res.data.imageUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        alert("Please login first");
        navigate("/");
        return;
      }

      if (!form.image) {
        alert("Please upload property image");
        return;
      }

      await axios.post("http://localhost:5000/api/properties", {
        ...form,
        user_id: user.id,
      });

      alert("Listing published successfully");
      navigate("/host-listings");
    } catch (err) {
      console.log(err);
      alert("Failed to publish listing");
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
                Add your space, upload photos, set pricing, and start receiving
                reservations from guests.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <div className="rounded-2xl bg-white/15 backdrop-blur p-5">
                <h3 className="text-3xl font-bold">Top 1%</h3>
                <p className="text-white/75 mt-2 text-sm">
                  Earning security metrics
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 backdrop-blur p-5">
                <h3 className="text-3xl font-bold">24/7</h3>
                <p className="text-white/75 mt-2 text-sm">
                  Dedicated host support
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Tell us about your space
            </h2>

            <p className="text-gray-500 mt-3 leading-7">
              Share details about your property to publish it on the marketplace.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Title
                </label>

                <input
                  type="text"
                  placeholder="e.g., Luxury Sunset Premium Suite Villa"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  required
                  className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>

                <textarea
                  placeholder="Describe your property..."
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  required
                  className="w-full h-28 p-4 rounded-xl border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Physical Location
                </label>

                <input
                  type="text"
                  placeholder="e.g., Riyadh, Saudi Arabia"
                  value={form.location}
                  onChange={(e) => updateForm("location", e.target.value)}
                  required
                  className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Property Category
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <CategoryButton
                    active={form.category === "Villa"}
                    icon="🏡"
                    label="Entire Villa"
                    onClick={() => updateForm("category", "Villa")}
                  />

                  <CategoryButton
                    active={form.category === "Apartment"}
                    icon="🏢"
                    label="Apartment"
                    onClick={() => updateForm("category", "Apartment")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <NumberInput
                  label="Guests"
                  value={form.guests}
                  onChange={(value) => updateForm("guests", value)}
                />

                <NumberInput
                  label="Bedrooms"
                  value={form.bedrooms}
                  onChange={(value) => updateForm("bedrooms", value)}
                />

                <NumberInput
                  label="Bathrooms"
                  value={form.bathrooms}
                  onChange={(value) => updateForm("bathrooms", value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Set Your Price Per Night
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="10"
                    value={form.price}
                    onChange={(e) => updateForm("price", e.target.value)}
                    required
                    className="w-full h-16 pl-10 pr-4 rounded-xl border border-gray-300 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Image
                </label>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-3xl p-6 cursor-pointer hover:border-[#8363F5] transition">
                  <UploadCloud size={36} className="text-[#8363F5]" />
                  <p className="font-semibold mt-3">Upload property photo</p>
                  <p className="text-sm text-gray-500 mt-1">
                    JPG, PNG or WEBP
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="mt-5 h-52 w-full object-cover rounded-2xl"
                    />
                  )}
                </label>
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