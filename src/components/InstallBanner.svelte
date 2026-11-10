<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import { install } from '../lib/install.svelte.ts';
  import { settings } from '../lib/settings.svelte.ts';

  const icon = `${import.meta.env.BASE_URL}icon.svg`;
  const ios = $derived(install.method === 'ios');

  async function installApp() {
    await install.prompt();
    // Installed or turned down in the browser's dialog: either way, don't ask again.
    await settings.dismissInstallBanner();
  }
</script>

<aside class="install-banner" aria-labelledby="install-banner-title">
  <img src={icon} alt="" width="44" height="44" />
  <div class="text">
    <h2 id="install-banner-title">{t('install.bannerTitle')}</h2>
    <p>{ios ? t('install.ios') : t('install.hint')}</p>
    <div class="actions">
      {#if !ios}
        <button type="button" class="button primary" onclick={installApp}>{t('install.button')}</button>
      {/if}
      <button type="button" class="button ghost" onclick={() => settings.dismissInstallBanner()}>
        {ios ? t('install.ok') : t('install.later')}
      </button>
    </div>
  </div>
</aside>

<style>
  .install-banner {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-bottom: 1rem;
    padding: 0.85rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--accent-soft);
  }
  img {
    flex: none;
    border-radius: 10px;
  }
  .text {
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 1rem;
  }
  p {
    margin: 0.15rem 0 0;
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
</style>
