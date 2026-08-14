export const BASE_CURRENCY = "INR";

export const CURRENCIES = {
  INR: { code: "INR", name: "Indian Rupee", locale: "en-IN", rate: 1 },
  SAR: { code: "SAR", name: "Saudi Riyal", locale: "ar-SA", rate: 0.0436 },
  AED: { code: "AED", name: "UAE Dirham", locale: "ar-AE", rate: 0.0427 },
  USD: { code: "USD", name: "US Dollar", locale: "en-US", rate: 0.01163 },
  EUR: { code: "EUR", name: "Euro", locale: "de-DE", rate: 0.0107 },
  GBP: { code: "GBP", name: "British Pound", locale: "en-GB", rate: 0.0091 },
};

export const REGIONS = [
  { code: "IN", name: "India", currency: "INR", language: "English" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", language: "Arabic" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", language: "English" },
  { code: "US", name: "United States", currency: "USD", language: "English" },
  { code: "GB", name: "United Kingdom", currency: "GBP", language: "English" },
  { code: "EU", name: "European Union", currency: "EUR", language: "English" },
];

export function detectRegion() {
  const localeRegion = navigator.language?.split("-")[1]?.toUpperCase();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (localeRegion && REGIONS.some((item) => item.code === localeRegion)) return localeRegion;
  if (timeZone === "Asia/Riyadh") return "SA";
  if (timeZone === "Asia/Dubai") return "AE";
  if (["Asia/Calcutta", "Asia/Kolkata"].includes(timeZone)) return "IN";
  return "IN";
}

export function getRegionCode() {
  return localStorage.getItem("region") || detectRegion();
}

export function getCurrencyCode() {
  const saved = localStorage.getItem("currency") || "";
  const code = saved.match(/\(([A-Z]{3})\)$/)?.[1] || saved;
  if (CURRENCIES[code]) return code;
  return REGIONS.find((item) => item.code === getRegionCode())?.currency || BASE_CURRENCY;
}

export function saveRegionalPreferences({ region, currency, language }) {
  localStorage.setItem("region", region);
  localStorage.setItem("currency", currency);
  localStorage.setItem("language", language);
  window.dispatchEvent(new CustomEvent("regional-preferences-changed", { detail: { region, currency, language } }));
}

export function convertFromBase(amount, currency = getCurrencyCode()) {
  return Number(amount || 0) * (CURRENCIES[currency]?.rate || 1);
}

export function formatCurrency(amount, options = {}) {
  const currency = options.currency || getCurrencyCode();
  const config = CURRENCIES[currency] || CURRENCIES[BASE_CURRENCY];
  const converted = options.sourceCurrency && options.sourceCurrency !== BASE_CURRENCY
    ? Number(amount || 0)
    : convertFromBase(amount, currency);
  return new Intl.NumberFormat(config.locale, {
    style: "currency", currency: config.code, maximumFractionDigits: converted < 100 ? 2 : 0,
  }).format(converted);
}

export function currencySymbol(currency = getCurrencyCode()) {
  return new Intl.NumberFormat(CURRENCIES[currency]?.locale || "en-IN", {
    style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0,
  }).formatToParts(0).find((part) => part.type === "currency")?.value || currency;
}
