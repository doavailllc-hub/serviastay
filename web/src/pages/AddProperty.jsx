import { useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function AddProperty() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Apartment",
    location: "",
    price: "",
    guests: 1,
    bedrooms: 1,
    bathrooms: 1,
    image: "",
  });

  const [preview, setPreview] = useState("");

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));

    const data = new FormData();
    data.append("image", file);

    const res = await axios.post("http://localhost:5000/api/upload", data);
    setForm({ ...form, image: res.data.imageUrl });
  };

  const handleSubmit = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      alert("Please login first");
      return;
    }

    await axios.post("http://localhost:5000/api/properties", {
      ...form,
      user_id: user.id,
    });

    alert("Property added successfully");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-2">Add Property</h1>
        <p className="text-gray-500 mb-8">
          Create a new listing for your guests.
        </p>

        <div className="bg-white rounded-3xl border p-8 space-y-5">
          <input
            placeholder="Property title"
            className="w-full h-14 px-4 border rounded-xl"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <textarea
            placeholder="Description"
            className="w-full h-32 p-4 border rounded-xl"
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <input
            placeholder="Location"
            className="w-full h-14 px-4 border rounded-xl"
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <input
            placeholder="Price per night"
            type="number"
            className="w-full h-14 px-4 border rounded-xl"
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Guests"
              className="h-14 px-4 border rounded-xl"
              onChange={(e) => setForm({ ...form, guests: e.target.value })}
            />

            <input
              type="number"
              placeholder="Bedrooms"
              className="h-14 px-4 border rounded-xl"
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
            />

            <input
              type="number"
              placeholder="Bathrooms"
              className="h-14 px-4 border rounded-xl"
              onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
            />
          </div>

          <select
            className="w-full h-14 px-4 border rounded-xl"
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option>Apartment</option>
            <option>Villa</option>
            <option>House</option>
            <option>Cabin</option>
            <option>Hotel</option>
          </select>

          <div className="border-2 border-dashed rounded-3xl p-8 text-center">
            <input type="file" accept="image/*" onChange={handleImageUpload} />

            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-5 h-64 w-full object-cover rounded-2xl"
              />
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full h-14 rounded-xl bg-[#8363F5] text-white font-semibold"
          >
            Publish Listing
          </button>
        </div>
      </main>
    </div>
  );
}