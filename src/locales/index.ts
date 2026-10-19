import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from './vi.json';
import en from './en.json';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    fallbackLng: 'vi',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      // localStorage only: a first visit always lands on Vietnamese regardless of
      // the browser language, and the switcher persists the choice.
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'appLang',
    },
  });

// Lets a sentence embed a label mid-phrase — "Từ {{field, lowercase}}" turns
// "Ngày tạo" into "Từ ngày tạo" — without keeping a second, lowercase copy of it.
i18n.services.formatter?.add('lowercase', (value: unknown, lng: string | undefined) =>
  String(value).toLocaleLowerCase(lng),
);

export default i18n;
