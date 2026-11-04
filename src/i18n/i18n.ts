import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { CURRENCY } from "@/lib/currency";

/**
 * Translations live in one file per screen group: locales/<lang>/<namespace>.json
 * (common, marketing, auth, events, billing, insights, guest). Components ask for their namespace:
 * useTranslation("events"). Every key exists in English; a missing Hindi key falls back to English.
 */
const files = import.meta.glob<{ default: Record<string, unknown> }>("./locales/*/*.json", { eager: true });
const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, module] of Object.entries(files)) {
  const [, lang, ns] = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)!;
  (resources[lang] ??= {})[ns] = module.default;
}

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", short: "हिं" },
] as const;
export type Language = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "facedrop-lang";

/** Saved choice first, then the phone's language, then English. */
const initialLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "hi") return saved;
  } catch {
    // Private mode: no storage
  }
  return navigator.language?.toLowerCase().startsWith("hi") ? "hi" : "en";
};

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: "en",
  defaultNS: "common",
  ns: Object.keys(resources.en ?? {}),
  interpolation: {
    escapeValue: false,
    // Prices render as "{{currency}} {{price}}". Change VITE_CURRENCY when the payment gateway changes.
    defaultVariables: { currency: CURRENCY },
  },
  returnNull: false,
});

const applyLanguage = (lng: string) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Private mode: the choice lasts for this visit
  }
};
applyLanguage(i18n.language);
i18n.on("languageChanged", applyLanguage);

export default i18n;
