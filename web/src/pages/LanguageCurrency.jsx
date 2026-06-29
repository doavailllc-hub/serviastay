import { useEffect, useState } from "react";
import { Check, DollarSign, Globe } from "lucide-react";

import Navbar from "../components/Navbar";

const BRAND = "#3b71e6";

const languages = ["English", "Arabic", "Malayalam", "Hindi", "French", "Spanish"];

const currencies = [
  "Saudi Riyal (SAR)",
  "US Dollar (USD)",
  "Indian Rupee (INR)",
  "UAE Dirham (AED)",
  "Euro (EUR)",
  "British Pound (GBP)",
];

export default function LanguageCurrency() {
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedCurrency, setSelectedCurrency] = useState("Saudi Riyal (SAR)");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedLanguage(localStorage.getItem("language") || "English");
    setSelectedCurrency(localStorage.getItem("currency") || "Saudi Riyal (SAR)");
  }, []);

  const savePreferences = () => {
    localStorage.setItem("language", selectedLanguage);
    localStorage.setItem("currency", selectedCurrency);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Preferences</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Language & currency
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Choose how you want language and prices to appear across Dovail Stay.
            </p>
          </div>

          <button
            onClick={savePreferences}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            {saved ? "Saved" : "Save changes"}
          </button>
        </header>

        {saved && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Preferences saved successfully.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <PreferenceBox
            title="Language"
            description="Select your preferred app language."
            icon={<Globe size={20} />}
            items={languages}
            selected={selectedLanguage}
            onSelect={setSelectedLanguage}
          />

          <PreferenceBox
            title="Currency"
            description="Select your preferred pricing currency."
            icon={<DollarSign size={20} />}
            items={currencies}
            selected={selectedCurrency}
            onSelect={setSelectedCurrency}
          />
        </div>
      </main>
    </div>
  );
}

function PreferenceBox({ title, description, icon, items, selected, onSelect }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const active = selected === item;

          return (
            <button
              key={item}
              onClick={() => onSelect(item)}
              className={`flex w-full items-center justify-between py-4 text-left transition ${
                active ? "text-[#3b71e6]" : "text-gray-700 hover:text-[#3b71e6]"
              }`}
            >
              <span className="text-sm font-medium">{item}</span>

              {active && <Check size={18} className="text-[#3b71e6]" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}