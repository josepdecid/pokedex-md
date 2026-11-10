import { readValue, storageKeys, writeValue } from './storage.ts';

/** App-wide settings (not tied to a game). */
interface SettingsData {
  locale?: string;
}

class Settings {
  locale = $state<string | undefined>(undefined);

  async load(): Promise<void> {
    const raw = await readValue<SettingsData>(storageKeys.settings);
    this.locale = typeof raw?.locale === 'string' ? raw.locale : undefined;
  }

  async setLocale(locale: string): Promise<void> {
    this.locale = locale;
    await writeValue(storageKeys.settings, { locale } satisfies SettingsData);
  }
}

export const settings = new Settings();
