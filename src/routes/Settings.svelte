<script lang="ts">
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { LOCALES } from '../i18n/locales.ts';
  import type { UiKey } from '../i18n/ui/en.ts';
  import { install } from '../lib/install.svelte.ts';
  import { parseImport, toExport, type ImportResult } from '../lib/progress.ts';
  import type { GameSession } from '../lib/session.svelte.ts';
  import { settings } from '../lib/settings.svelte.ts';
  import { isPersisted } from '../lib/storage.ts';

  let { session }: { session: GameSession } = $props();

  const COFFEE_URL = 'https://buymeacoffee.com/josepdecid';

  const gameName = $derived(i18n.name('game', 'short'));
  const total = $derived(session.data.pokemon.length);

  let persisted = $state(false);
  $effect(() => {
    void session.progress.entries; // re-check after saves, which may have granted persistence
    isPersisted().then((p) => (persisted = p));
  });
  const storageKey = $derived<UiKey>(
    session.progress.saveState === 'memory-only'
      ? 'settings.storage.memory'
      : persisted
        ? 'settings.storage.persisted'
        : 'settings.storage.best',
  );

  async function changeLocale(event: Event) {
    const code = (event.currentTarget as HTMLSelectElement).value;
    await i18n.load(code, session.id);
    await settings.setLocale(code);
  }

  // Back up
  let backupMessage = $state('');
  const backupText = () => JSON.stringify(toExport(session.progress.snapshot()), null, 2);

  function download() {
    const blob = new Blob([backupText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokedex-md-${session.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(backupText());
      backupMessage = t('backup.copied');
    } catch {
      backupMessage = t('backup.copyFailed');
    }
  }

  // Restore
  let pasted = $state('');
  let pending = $state<ImportResult | null>(null);
  let restoreMessage = $state('');

  function check(text: string) {
    restoreMessage = '';
    pending = parseImport(text, session.id, session.knownIds, session.data.idAliases);
  }

  async function openFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) check(await file.text());
  }

  function apply(mode: 'merge' | 'replace') {
    if (!pending?.ok) return;
    if (mode === 'merge') session.progress.merge(pending.entries);
    else session.progress.replace(pending.entries);
    pending = null;
    pasted = '';
    restoreMessage = t('restore.done');
  }

  // Reset
  let confirmingReset = $state(false);
  let resetMessage = $state('');
  function reset() {
    session.progress.reset();
    confirmingReset = false;
    resetMessage = t('reset.done');
  }
</script>

<a class="button coffee" href={COFFEE_URL} target="_blank" rel="noopener">
  <span aria-hidden="true">☕</span>
  {t('settings.coffee')}
</a>

<section class="card">
  <h2><label for="locale">{t('settings.language')}</label></h2>
  <select id="locale" value={i18n.locale} onchange={changeLocale}>
    {#each LOCALES as l (l.code)}
      <option value={l.code}>{l.label}</option>
    {/each}
  </select>
</section>

<section class="card">
  <h2>{t('settings.progress')}</h2>
  <p>{t('settings.summary', { done: session.recruitedCount, total, game: gameName })}</p>
  <p class="muted small">{t(storageKey)}</p>

  <h3>{t('backup.title')}</h3>
  <p class="muted small">{t('backup.hint')}</p>
  <div class="actions">
    <button type="button" class="button primary" onclick={download}>{t('backup.download')}</button>
    <button type="button" class="button" onclick={copy}>{t('backup.copy')}</button>
  </div>
  {#if backupMessage}<p class="status" role="status">{backupMessage}</p>{/if}

  <h3>{t('restore.title')}</h3>
  <div class="actions">
    <label class="button">
      {t('restore.file')}
      <input class="visually-hidden" type="file" accept="application/json,.json,text/plain" onchange={openFile} />
    </label>
  </div>
  <label class="paste">
    <span class="muted small">{t('restore.paste')}</span>
    <textarea rows="3" bind:value={pasted} spellcheck="false"></textarea>
  </label>
  <div class="actions">
    <button type="button" class="button" disabled={!pasted.trim()} onclick={() => check(pasted)}>{t('restore.check')}</button>
  </div>

  {#if pending}
    <div class="notice" role="status">
      {#if pending.ok}
        <p>{t('restore.summary', { count: pending.recruited })}</p>
        {#if pending.unknownIds.length}<p class="muted small">{t('restore.unknown', { count: pending.unknownIds.length })}</p>{/if}
        <div class="actions">
          <button type="button" class="button primary" onclick={() => apply('merge')}>{t('restore.merge')}</button>
          <button type="button" class="button" onclick={() => apply('replace')}>{t('restore.replace')}</button>
          <button type="button" class="button ghost" onclick={() => (pending = null)}>{t('restore.cancel')}</button>
        </div>
      {:else}
        <p>{t(`restore.error.${pending.error}`, { game: pending.gameId ?? '' })}</p>
      {/if}
    </div>
  {/if}
  {#if restoreMessage}<p class="status" role="status">{restoreMessage}</p>{/if}

  <h3>{t('reset.title')}</h3>
  {#if confirmingReset}
    <div class="notice danger">
      <p>{t('reset.confirm', { game: gameName })}</p>
      <div class="actions">
        <button type="button" class="button danger" onclick={reset}>{t('reset.yes')}</button>
        <button type="button" class="button ghost" onclick={() => (confirmingReset = false)}>{t('reset.no')}</button>
      </div>
    </div>
  {:else}
    <div class="actions">
      <button type="button" class="button" onclick={() => ((confirmingReset = true), (resetMessage = ''))}>{t('reset.button')}</button>
    </div>
  {/if}
  {#if resetMessage}<p class="status" role="status">{resetMessage}</p>{/if}
</section>

{#if install.method}
  <section class="card">
    <h2>{t('install.title')}</h2>
    <p class="muted small">{t('install.hint')}</p>
    {#if install.method === 'prompt'}
      <div class="actions">
        <button type="button" class="button primary" onclick={() => install.prompt()}>{t('install.button')}</button>
      </div>
    {:else}
      <p class="small">{t('install.ios')}</p>
    {/if}
  </section>
{/if}

<section class="card">
  <h2>{t('about.title')}</h2>
  <p class="small">{t('about.sources')}</p>
  <p class="small">
    <a href="https://www.serebii.net/dungeonrescueteamdx/" target="_blank" rel="noopener">{t('about.artwork')}</a>
  </p>
  <p class="muted small">{t('about.disclaimer')}</p>
</section>

<style>
  .coffee {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    text-decoration: none;
  }
  h3 {
    margin: 1.4rem 0 0.25rem;
    font-size: 1rem;
  }
  select {
    width: 100%;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .paste {
    display: grid;
    gap: 0.3rem;
    margin-top: 0.75rem;
  }
  textarea {
    width: 100%;
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
  }
  .notice {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 10px;
    background: var(--surface-2);
  }
  .notice p {
    margin: 0 0 0.25rem;
  }
  .notice.danger {
    background: var(--danger-soft);
  }
  .status {
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
    color: var(--accent-text);
  }
  .small {
    font-size: 0.88rem;
  }
</style>
