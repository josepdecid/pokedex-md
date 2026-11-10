import { en, type UiStrings } from './ui/en.ts';

// Languages offered in the UI. English is bundled (it is every locale's fallback); other
// locales should use `load: async () => (await import('./ui/<code>.ts')).<code>` so they load on demand.
// To add one: add src/i18n/ui/<code>.ts, data/locales/<code>/,
// and an entry here. `label` is the language's own name for itself.
export interface LocaleInfo {
  code: string;
  label: string;
  load: () => Promise<UiStrings>;
}

export const DEFAULT_LOCALE = 'en';

export const LOCALES: readonly LocaleInfo[] = [
  { code: 'en', label: 'English', load: async () => en },
];

export function pickLocale(preferred: readonly string[]): string {
  for (const tag of preferred) {
    const exact = LOCALES.find((l) => l.code.toLowerCase() === tag.toLowerCase());
    if (exact) return exact.code;
    const base = LOCALES.find((l) => l.code === tag.split('-')[0]?.toLowerCase());
    if (base) return base.code;
  }
  return DEFAULT_LOCALE;
}
