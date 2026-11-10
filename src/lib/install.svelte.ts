// Works out how (and whether) the app can be installed in this browser.
// - Chrome, Edge and Android browsers fire `beforeinstallprompt`. We keep that event so the app
//   can open the install dialog from its own button, instead of the browser's banner.
// - iOS and iPadOS never fire it. There, people install from the browser's Share menu, so we
//   show the steps instead of a button.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** `prompt`: we can open the install dialog. `ios`: show the Share menu steps. `null`: nothing to offer. */
export type InstallMethod = 'prompt' | 'ios' | null;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  // iPadOS reports itself as a Mac, but Macs have no touch screen.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

class Install {
  #event = $state.raw<BeforeInstallPromptEvent | null>(null);
  #installed = $state(false);
  #ios = false;

  get method(): InstallMethod {
    if (this.#installed) return null;
    if (this.#event) return 'prompt';
    return this.#ios ? 'ios' : null;
  }

  listen(): void {
    this.#installed = isStandalone();
    this.#ios = isIos();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.#event = e as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.#event = null;
      this.#installed = true;
    });
  }

  /** Opens the browser's install dialog. Resolves to whether the user accepted. */
  async prompt(): Promise<boolean> {
    const event = this.#event;
    if (!event) return false;
    // An event can only prompt once. The browser fires a new one if installing is still possible.
    this.#event = null;
    await event.prompt();
    return (await event.userChoice).outcome === 'accepted';
  }
}

export const install = new Install();
