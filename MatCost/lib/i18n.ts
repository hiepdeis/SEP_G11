"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "../public/locales/en/translation.json";
import viTranslation from "../public/locales/vi/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      vi: { translation: viTranslation },
    },
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "cookie", "navigator", "htmlTag"],
      caches: ["localStorage", "cookie"],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
