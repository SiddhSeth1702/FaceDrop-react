import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";

/** Intl locale for the current language: Hindi dates read "4 नव॰ 2026"; digits stay 0–9. */
export const currentLocale = () => (i18n.language === "hi" ? "hi-IN" : "en-IN");

/** A date in the current language. Accepts anything Date can parse. */
export const formatDate = (value: string | number | Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(value).toLocaleDateString(currentLocale(), options);

export const formatNumber = (n: number | null | undefined) => (n ?? 0).toLocaleString(currentLocale());

/** Re-renders when the language changes, so formatted dates and numbers switch too. */
export const useLocale = () => {
  const { i18n: instance } = useTranslation();
  return { lang: instance.language, locale: currentLocale(), formatDate, formatNumber };
};
