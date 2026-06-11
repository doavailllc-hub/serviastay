import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

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

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/properties/${id}`);
      setForm(res.data);
    } catch (err) {
      console.log("Listing load failed:", err);
    }
  };

  const updateForm = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const saveChanges = async () => {
    try {
      await axios.put(`http://localhost:5000/api/properties/${id}`, form);
      alert("Listing updated successfully");
      navigate("/host-listings");
    } catch (err) {
      console.log("Update failed:", err);
      alert("Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Edit Listing
          </h1>

          <p className="text-gray-500 mt-2">
            Update your property information and pricing.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Listing Title
              </label>

              <input
                type="text"
                value={form.title || ""}
                onChange={(e) => updateForm("title", e.target.value)}
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
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

            <Input
              label="Category"
              value={form.category}
              onChange={(v) => updateForm("category", v)}
            />

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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Image URL
              </label>

              <input
                type="text"
                value={form.image || ""}
                onChange={(e) => updateForm("image", e.target.value)}
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              {form.image && (
                <img
                  src={form.image}
                  alt={form.title}
                  className="mt-4 h-56 w-full rounded-2xl object-cover"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>

              <textarea
                rows={6}
                value={form.description || ""}
                onChange={(e) => updateForm("description", e.target.value)}
                className="w-full p-4 rounded-xl border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10">
            <button
              onClick={() => navigate("/host-listings")}
              className="px-8 h-12 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>

            <button
              onClick={saveChanges}
              className="px-8 h-12 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold shadow-lg transition"
            >
              Save Changes
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
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>

      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
      />
    </div>
  );
}