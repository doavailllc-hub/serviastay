import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Globe, DollarSign, Check } from "lucide-react";

export default function LanguageCurrency() {
  const languages = ["English", "Arabic", "Malayalam", "Hindi", "French", "Spanish"];

  const currencies = [
    "Saudi Riyal (SAR)",
    "US Dollar (USD)",
    "Indian Rupee (INR)",
    "UAE Dirham (AED)",
    "Euro (EUR)",
    "British Pound (GBP)",
  ];

  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedCurrency, setSelectedCurrency] = useState("Saudi Riyal (SAR)");

  useEffect(() => {
    setSelectedLanguage(localStorage.getItem("language") || "English");
    setSelectedCurrency(localStorage.getItem("currency") || "Saudi Riyal (SAR)");
  }, []);

  const savePreferences = () => {
    localStorage.setItem("language", selectedLanguage);
    localStorage.setItem("currency", selectedCurrency);
    alert("Preferences saved successfully");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Language & Currency
          </h1>

          <p className="mt-2 text-gray-500">
            Choose your preferred language and currency.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <PreferenceBox
            title="Languages"
            icon={<Globe className="text-[3b71e6]" />}
            items={languages}
            selected={selectedLanguage}
            onSelect={setSelectedLanguage}
          />

          <PreferenceBox
            title="Currency"
            icon={<DollarSign className="text-[3b71e6]" />}
            items={currencies}
            selected={selectedCurrency}
            onSelect={setSelectedCurrency}
          />
        </div>

        <div className="mt-10 flex justify-end">
          <button
            onClick={savePreferences}
            className="px-8 py-4 rounded-xl bg-[3b71e6] hover:bg-[#7152E8] text-white font-semibold shadow-lg transition"
          >
            Save Preferences
          </button>
        </div>
      </main>
    </div>
  );
}

function PreferenceBox({ title, icon, items, selected, onSelect }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-[#F4F1FF] flex items-center justify-center">
          {icon}
        </div>

        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={`w-full flex items-center justify-between rounded-xl border px-5 py-4 transition ${
              selected === item
                ? "border-[3b71e6] bg-[#F4F1FF]"
                : "border-gray-200 hover:border-[3b71e6]"
            }`}
          >
            <span className="font-medium">{item}</span>

            {selected === item && (
              <Check size={20} className="text-[3b71e6]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}