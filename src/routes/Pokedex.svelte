<script lang="ts">
  import PokemonList from '../components/PokemonList.svelte';
  import { i18n, normalize, t } from '../i18n/i18n.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';
  import { clearFilters, filters, type StatusFilter } from './pokedex-filters.svelte.ts';

  let { session }: { session: GameSession } = $props();

  const statuses: StatusFilter[] = ['all', 'missing', 'recruited'];

  const searchable = $derived(
    session.data.pokemon.map((entry) => ({ entry, text: normalize(i18n.entryLabel(entry)) })),
  );

  const visible = $derived.by(() => {
    const q = normalize(filters.query.trim()).replace(/^#/, '');
    const num = /^\d+$/.test(q) ? Number(q) : undefined;
    const rows = searchable.filter(({ entry, text }) => {
      if (q && !(num !== undefined ? entry.dex === num || String(entry.dex).startsWith(q) : text.includes(q))) return false;
      if (filters.type && !entry.types.includes(filters.type)) return false;
      if (filters.status !== 'all' && session.progress.isRecruited(entry.id) !== (filters.status === 'recruited')) return false;
      return true;
    });
    if (filters.sort === 'family') rows.sort((a, b) => a.entry.familyOrder - b.entry.familyOrder);
    else if (filters.sort === 'name') rows.sort((a, b) => i18n.collator.compare(a.text, b.text));
    return rows.map((r) => r.entry);
  });

  const types = $derived(
    [...session.data.types].sort((a, b) => i18n.collator.compare(i18n.name('type', a), i18n.name('type', b))),
  );
  const filtered = $derived(filters.query !== '' || filters.status !== 'all' || filters.type !== '');
</script>

<div class="tools">
  <label class="search">
    <span class="visually-hidden">{t('pokedex.search')}</span>
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
    <input type="search" bind:value={filters.query} placeholder={t('pokedex.search')} autocomplete="off" enterkeyhint="search" />
  </label>

  <div class="segmented" role="radiogroup" aria-label={t('pokedex.status')}>
    {#each statuses as status (status)}
      <label class:active={filters.status === status}>
        <input type="radio" name="status" value={status} bind:group={filters.status} />
        {t(`pokedex.status.${status}`)}
      </label>
    {/each}
  </div>

  <div class="selects">
    <label>
      <span class="visually-hidden">{t('pokedex.type')}</span>
      <select bind:value={filters.type}>
        <option value="">{t('pokedex.type.any')}</option>
        {#each types as type (type)}
          <option value={type}>{i18n.name('type', type)}</option>
        {/each}
      </select>
    </label>
    <label>
      <span class="visually-hidden">{t('pokedex.sort')}</span>
      <select bind:value={filters.sort}>
        <option value="family">{t('pokedex.sort')}: {t('pokedex.sort.family')}</option>
        <option value="dex">{t('pokedex.sort')}: {t('pokedex.sort.dex')}</option>
        <option value="name">{t('pokedex.sort')}: {t('pokedex.sort.name')}</option>
      </select>
    </label>
  </div>
</div>

<p class="summary" aria-live="polite">
  {t('pokedex.showing', { count: visible.length, total: session.data.pokemon.length })}
  {#if filtered}<button type="button" class="link-button" onclick={clearFilters}>{t('pokedex.clear')}</button>{/if}
</p>

{#if visible.length}
  <PokemonList entries={visible} {session} />
{:else}
  <p class="empty">{t('pokedex.empty')}</p>
{/if}

<style>
  .tools {
    display: grid;
    gap: 0.6rem;
    margin-bottom: 0.5rem;
  }
  .search {
    position: relative;
    display: block;
  }
  .search svg {
    position: absolute;
    left: 0.8rem;
    top: 50%;
    transform: translateY(-50%);
    fill: none;
    stroke: var(--muted);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .search input {
    width: 100%;
    padding-left: 2.6rem;
  }
  .segmented {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 3px;
    border-radius: 12px;
    background: var(--track);
  }
  .segmented label {
    display: grid;
    place-items: center;
    min-height: 40px;
    border-radius: 9px;
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--muted);
    cursor: pointer;
  }
  .segmented label.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
  }
  .segmented input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .segmented label:has(input:focus-visible) {
    outline: 3px solid var(--focus);
  }
  .selects {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  .selects select {
    width: 100%;
  }
  .summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0.75rem 0.25rem 0.5rem;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--muted);
  }
</style>
