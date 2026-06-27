import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const categories = [
  { id: "house", name: "House", icon: "🏠" },
  { id: "apartment", name: "Apartment", icon: "🏢" },
  { id: "barn", name: "Barn", icon: "🚜" },
  { id: "bnb", name: "Bed & breakfast", icon: "☕" },
  { id: "boat", name: "Boat", icon: "⛵" },
  { id: "cabin", name: "Cabin", icon: "🪵" },
  { id: "camping", name: "Camper/RV", icon: "🚐" },
  { id: "castle", name: "Castle", icon: "🏰" },
  { id: "hotel", name: "Hotel", icon: "🏨" },
];

export default function CategorySelect() {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFC] flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-12">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 max-w-3xl mb-10">
          Which of these best describes your place?
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className={`h-36 rounded-3xl border-2 bg-white p-5 flex flex-col items-start justify-between text-left transition-all ${
                selected === cat.id
                  ? "border-[3b71e6] shadow-lg scale-[1.02]"
                  : "border-gray-200 hover:border-gray-900 hover:shadow-md"
              }`}
            >
              <span className="text-4xl">{cat.icon}</span>

              <span className="font-semibold text-gray-900">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-4 md:px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="font-semibold underline text-gray-900"
          >
            Back
          </button>

          <button
            disabled={!selected}
            onClick={() =>
              navigate("/become-a-host", {
                state: { category: selected },
              })
            }
            className={`px-10 py-4 rounded-xl font-semibold transition ${
              selected
                ? "bg-[3b71e6] hover:bg-[#7152E8] text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}