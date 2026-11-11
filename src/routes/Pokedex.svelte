<script lang="ts">
  import { slide } from 'svelte/transition';
  import PokemonList from '../components/PokemonList.svelte';
  import SearchInput from '../components/SearchInput.svelte';
  import { i18n, normalize, t } from '../i18n/i18n.svelte.ts';
  import { entryMatcher } from '../lib/search.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';
  import { clearFilters, filterPanel, filters, type StatusFilter } from './pokedex-filters.svelte.ts';

  let { session }: { session: GameSession } = $props();

  const statuses: StatusFilter[] = ['all', 'missing', 'recruited'];

  const searchable = $derived(
    session.data.pokemon.map((entry) => ({ entry, text: normalize(i18n.entryLabel(entry)) })),
  );

  const texts = $derived(new Map(searchable.map((r) => [r.entry, r.text])));

  const visible = $derived.by(() => {
    const matches = entryMatcher(filters.query, (entry) => texts.get(entry) ?? '');
    const rows = searchable.filter(({ entry }) => {
      if (!matches(entry)) return false;
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
  // Flags the filters button while the panel is closed but still narrowing or reordering the list.
  const hiddenActive = $derived(!filterPanel.open && (filters.type !== '' || filters.sort !== 'family'));

  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The tools stay on screen mid-list, so a new filter starts its results from the top.
  // Skips the first run, which would undo the router restoring the list's scroll position.
  let filtersApplied = false;
  $effect(() => {
    void [filters.query, filters.status, filters.type, filters.sort];
    if (filtersApplied) window.scrollTo(0, 0);
    filtersApplied = true;
  });
</script>

<div class="tools">
  <div class="search-row">
    <SearchInput bind:value={filters.query} label={t('pokedex.search')} />
    <button
      type="button"
      class="filters-button"
      class:open={filterPanel.open}
      aria-expanded={filterPanel.open}
      aria-controls="pokedex-filters"
      aria-label={t('pokedex.filters')}
      title={t('pokedex.filters')}
      onclick={() => (filterPanel.open = !filterPanel.open)}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </svg>
      {#if hiddenActive}<span class="dot" aria-hidden="true"></span>{/if}
    </button>
  </div>

  {#if filterPanel.open}
    <div class="selects" id="pokedex-filters" transition:slide={{ duration: reducedMotion ? 0 : 180 }}>
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
  {/if}

  <div class="segmented" role="radiogroup" aria-label={t('pokedex.status')}>
    {#each statuses as status (status)}
      <label class:active={filters.status === status}>
        <input type="radio" name="status" value={status} bind:group={filters.status} />
        {t(`pokedex.status.${status}`)}
      </label>
    {/each}
  </div>

  <p class="summary" aria-live="polite">
    {t('pokedex.showing', { count: visible.length, total: session.data.pokemon.length })}
    {#if filtered}<button type="button" class="link-button" onclick={clearFilters}>{t('pokedex.clear')}</button>{/if}
  </p>
</div>

{#if visible.length}
  <PokemonList entries={visible} {session} />
{:else}
  <p class="empty">{t('pokedex.empty')}</p>
{/if}

<style>
  /* Full-bleed over .page's gutter, so rows don't show beside it as they scroll under.
     The top margin cancels .page's padding, so it rests where it pins and doesn't shift. */
  .tools {
    display: grid;
    gap: 0.6rem;
    margin: -1rem -16px var(--tools-fade);
    padding: 0.5rem 16px 0;
    background: var(--bg);
    --tools-fade: 1rem;
  }
  /* Not on short screens (phones in landscape), where it would cover most of the list. */
  @media (min-height: 480px) {
    .tools {
      position: sticky;
      top: var(--topbar-h);
      z-index: 5;
      /* Browsers floor the topbar's border to whole device pixels, leaving it a fraction short
         of --topbar-h on fractional-density screens. Reaches behind it to close that gap. */
      box-shadow: 0 -1px var(--bg);
    }
    /* Rows fade out as they scroll under. Fills the margin above, so it's invisible at rest. */
    .tools::after {
      content: '';
      position: absolute;
      inset: 100% 0 auto;
      height: var(--tools-fade);
      background: linear-gradient(var(--bg), transparent);
      pointer-events: none;
    }
  }
  .search-row {
    display: flex;
    gap: 0.5rem;
  }
  .filters-button {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    min-height: 44px;
    padding: 0;
    border-radius: 12px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
  }
  .filters-button svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .filters-button.open {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  .dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px var(--surface);
  }
  /* One select per line on phones, side by side from tablet width up. */
  .selects {
    display: grid;
    gap: 0.6rem;
  }
  @media (min-width: 600px) {
    .selects {
      grid-template-columns: 1fr 1fr;
    }
  }
  .selects select {
    width: 100%;
  }
  .summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0 0.25rem;
    /* Room for the clear button, so the row doesn't grow and nudge the list when it appears. */
    min-height: 1.75rem;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--muted);
  }
</style>
