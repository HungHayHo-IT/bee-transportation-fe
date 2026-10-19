/**
 * The only client-side persistence in BeeOps. The session is an httpOnly cookie,
 * so nothing auth-related is ever written here.
 */
const StorageKey = {
  Language: 'appLang',
} as const;

type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

function writeValue(key: StorageKey, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or blocked site data: the preference simply does not persist.
  }
}

export function writeLanguagePreference(language: string): void {
  writeValue(StorageKey.Language, language);
}
