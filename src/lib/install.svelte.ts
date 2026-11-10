// Captures Chrome/Android's install prompt so Settings can offer an "Install app" button.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class Install {
  #event = $state.raw<BeforeInstallPromptEvent | null>(null);

  get available(): boolean {
    return this.#event !== null;
  }

  listen(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.#event = e as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => (this.#event = null));
  }

  async prompt(): Promise<void> {
    const event = this.#event;
    if (!event) return;
    await event.prompt();
    if ((await event.userChoice).outcome === 'accepted') this.#event = null;
  }
}

export const install = new Install();
