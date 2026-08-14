import { useMemo, useState } from "react";
import { Check, Coins, Globe2, Languages } from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import { CURRENCIES, REGIONS, formatCurrency, getCurrencyCode, getRegionCode, saveRegionalPreferences } from "../utils/currency";

const languages = ["English", "Arabic", "Malayalam", "Hindi", "French", "Spanish"];

export default function LanguageCurrency() {
  const [region, setRegion] = useState(getRegionCode);
  const [currency, setCurrency] = useState(getCurrencyCode);
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "English");
  const selectedRegion = useMemo(() => REGIONS.find((item) => item.code === region) || REGIONS[0], [region]);

  const selectRegion = (code) => {
    const next = REGIONS.find((item) => item.code === code);
    setRegion(code);
    setCurrency(next.currency);
    setLanguage(next.language);
  };

  const save = () => {
    saveRegionalPreferences({ region, currency, language });
    document.documentElement.lang = language === "Arabic" ? "ar" : "en";
    document.documentElement.dir = language === "Arabic" ? "rtl" : "ltr";
    toast.success("Regional preferences saved");
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:px-8">
        <p className="text-sm font-medium text-gray-500">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Region, language & currency</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">Your region selects a sensible default currency. You can override it at any time.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ChoiceBox title="Region" icon={<Globe2 size={20} />} items={REGIONS.map((item) => ({ value: item.code, label: item.name }))} selected={region} onSelect={selectRegion} />
          <ChoiceBox title="Currency" icon={<Coins size={20} />} items={Object.values(CURRENCIES).map((item) => ({ value: item.code, label: `${item.name} (${item.code})` }))} selected={currency} onSelect={setCurrency} />
          <ChoiceBox title="Language" icon={<Languages size={20} />} items={languages.map((item) => ({ value: item, label: item }))} selected={language} onSelect={setLanguage} />
        </div>

        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Preview for {selectedRegion.name}</p>
            <p className="mt-1 text-sm text-gray-600">A base price of ₹10,000 appears as {formatCurrency(10000, { currency })}.</p>
          </div>
          <button type="button" onClick={save} className="h-11 rounded-xl bg-[#3b71e6] px-6 text-sm font-semibold text-white hover:bg-[#2f5fc2]">Save preferences</button>
        </section>
      </main>
    </div>
  );
}

function ChoiceBox({ title, icon, items, selected, onSelect }) {
  return (
    <section className="rounded-2xl border border-gray-200 p-5">
      <div className="mb-3 flex items-center gap-3 text-gray-950"><span className="text-[#3b71e6]">{icon}</span><h2 className="font-semibold">{title}</h2></div>
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <button type="button" key={item.value} onClick={() => onSelect(item.value)} className={`flex w-full items-center justify-between py-3 text-left text-sm ${selected === item.value ? "font-semibold text-[#3b71e6]" : "text-gray-600 hover:text-gray-950"}`}>
            {item.label}{selected === item.value && <Check size={17} />}
          </button>
        ))}
      </div>
    </section>
  );
}
