import { readValue, storageKeys, writeValue } from './storage.ts';

/** App-wide settings (not tied to a game). */
interface SettingsData {
  locale?: string;
  installBannerDismissed?: boolean;
}

class Settings {
  locale = $state<string | undefined>(undefined);
  installBannerDismissed = $state(false);

  async load(): Promise<void> {
    const raw = await readValue<SettingsData>(storageKeys.settings);
    this.locale = typeof raw?.locale === 'string' ? raw.locale : undefined;
    this.installBannerDismissed = raw?.installBannerDismissed === true;
  }

  async setLocale(locale: string): Promise<void> {
    this.locale = locale;
    await this.#save();
  }

  async dismissInstallBanner(): Promise<void> {
    this.installBannerDismissed = true;
    await this.#save();
  }

  async #save(): Promise<void> {
    await writeValue(storageKeys.settings, {
      locale: this.locale,
      installBannerDismissed: this.installBannerDismissed,
    } satisfies SettingsData);
  }
}

export const settings = new Settings();
