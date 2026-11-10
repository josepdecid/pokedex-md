import { readValue, storageKeys, writeValue } from './storage.ts';

/** App-wide settings (not tied to a game). */
interface SettingsData {
  locale?: string;
  installBannerDismissed?: boolean;
  /** Keys of collapsible sections the user closed, e.g. `camps.complete` (see CompletionSections). */
  collapsedSections?: string[];
}

class Settings {
  locale = $state<string | undefined>(undefined);
  installBannerDismissed = $state(false);
  collapsedSections = $state<string[]>([]);

  async load(): Promise<void> {
    const raw = await readValue<SettingsData>(storageKeys.settings);
    this.locale = typeof raw?.locale === 'string' ? raw.locale : undefined;
    this.installBannerDismissed = raw?.installBannerDismissed === true;
    this.collapsedSections = Array.isArray(raw?.collapsedSections)
      ? raw.collapsedSections.filter((k): k is string => typeof k === 'string')
      : [];
  }

  isCollapsed(key: string): boolean {
    return this.collapsedSections.includes(key);
  }

  async setCollapsed(key: string, collapsed: boolean): Promise<void> {
    if (collapsed === this.isCollapsed(key)) return;
    this.collapsedSections = collapsed
      ? [...this.collapsedSections, key]
      : this.collapsedSections.filter((k) => k !== key);
    await this.#save();
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
      collapsedSections: $state.snapshot(this.collapsedSections),
    } satisfies SettingsData);
  }
}

export const settings = new Settings();
