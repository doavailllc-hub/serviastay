import AsyncStorage from "@react-native-async-storage/async-storage";

export type CurrencyCode = "INR" | "SAR" | "AED" | "USD" | "EUR" | "GBP";

type CurrencyConfig = {
  locale: string;
  rate: number;
};

export const CURRENCY_STORAGE_KEY = "dovail_currency";

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { locale: "en-IN", rate: 1 },
  SAR: { locale: "ar-SA", rate: 0.0436 },
  AED: { locale: "ar-AE", rate: 0.0427 },
  USD: { locale: "en-US", rate: 0.01163 },
  EUR: { locale: "de-DE", rate: 0.0107 },
  GBP: { locale: "en-GB", rate: 0.0091 },
};

const EUROPEAN_REGION_CODES = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE",
  "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

let activeCurrency: CurrencyCode = detectCurrencyCode();
const listeners = new Set<() => void>();

export function detectRegionCode() {
  const options = Intl.DateTimeFormat().resolvedOptions();
  const locale = options.locale || "en-IN";
  const timeZone = options.timeZone || "";
  let region = "";

  try {
    region = new Intl.Locale(locale).region?.toUpperCase() || "";
  } catch {
    region = locale.split("-")[1]?.toUpperCase() || "";
  }

  if (timeZone === "Asia/Riyadh") return "SA";
  if (timeZone === "Asia/Dubai") return "AE";
  if (["Asia/Calcutta", "Asia/Kolkata"].includes(timeZone)) return "IN";
  if (timeZone === "Europe/London") return "GB";
  if (EUROPEAN_REGION_CODES.has(region) || timeZone.startsWith("Europe/")) return region || "EU";
  return region || "IN";
}

export function detectCurrencyCode(): CurrencyCode {
  const region = detectRegionCode();
  if (region === "SA") return "SAR";
  if (region === "AE") return "AED";
  if (region === "US") return "USD";
  if (region === "GB") return "GBP";
  if (EUROPEAN_REGION_CODES.has(region) || region === "EU") return "EUR";
  return "INR";
}

export async function initializeDisplayCurrency() {
  const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
  if (saved && saved in CURRENCIES) {
    activeCurrency = saved as CurrencyCode;
  } else {
    activeCurrency = detectCurrencyCode();
  }
  listeners.forEach((listener) => listener());
  return activeCurrency;
}

export async function saveDisplayCurrency(currency: CurrencyCode) {
  activeCurrency = currency;
  await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  listeners.forEach((listener) => listener());
}

export function subscribeToCurrency(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDisplayCurrency() {
  return activeCurrency;
}

export function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value || 0) * CURRENCIES[activeCurrency].rate;
  return new Intl.NumberFormat(CURRENCIES[activeCurrency].locale, {
    style: "currency",
    currency: activeCurrency,
    maximumFractionDigits: amount < 100 ? 2 : 0,
  }).format(amount);
}

export function currencySymbol() {
  return new Intl.NumberFormat(CURRENCIES[activeCurrency].locale, {
    style: "currency",
    currency: activeCurrency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).formatToParts(0).find((part) => part.type === "currency")?.value || activeCurrency;
}
