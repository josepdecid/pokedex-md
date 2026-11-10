<script lang="ts" generics="T extends { done: number; total: number }">
  import type { Snippet } from 'svelte';
  import { t } from '../i18n/i18n.svelte.ts';
  import { settings } from '../lib/settings.svelte.ts';

  // A list of camps or dungeons, in their given (unlock) order, split into collapsible
  // Incomplete and Complete sections once both have rows. A row with nothing to recruit
  // counts as complete: there's nothing left to do there.
  let {
    rows,
    key,
    storageKey,
    item,
  }: {
    rows: T[];
    key: (row: T) => string;
    /** Prefix of the remembered collapsed state: `<storageKey>.incomplete` / `.complete`. */
    storageKey: string;
    item: Snippet<[T]>;
  } = $props();

  const incomplete = $derived(rows.filter((r) => r.done < r.total));
  const complete = $derived(rows.filter((r) => r.done >= r.total));
</script>

{#snippet list(rows: T[])}
  <ol class="cards">
    {#each rows as row (key(row))}
      <li>{@render item(row)}</li>
    {/each}
  </ol>
{/snippet}

{#snippet section(which: 'incomplete' | 'complete', rows: T[])}
  {@const collapseKey = `${storageKey}.${which}`}
  <!-- Collapsed sections are remembered (settings), so they stay closed after opening an item. -->
  <details
    class="section"
    open={!settings.isCollapsed(collapseKey)}
    ontoggle={(e) => settings.setCollapsed(collapseKey, !e.currentTarget.open)}
  >
    <summary>
      <h2>{t(`sections.${which}`)} <span class="count">{rows.length}</span></h2>
      <svg class="chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5l5 5 5-5" />
      </svg>
    </summary>
    {@render list(rows)}
  </details>
{/snippet}

{#if incomplete.length && complete.length}
  {@render section('incomplete', incomplete)}
  {@render section('complete', complete)}
{:else}
  {@render list(rows)}
{/if}

<style>
  .section + .section {
    margin-top: 1rem;
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 44px;
    margin-bottom: 0.25rem;
    list-style: none;
    cursor: pointer;
    border-radius: 8px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary h2 {
    margin: 0;
  }
  .chevron {
    flex: none;
    margin-right: 0.5rem;
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.2s;
  }
  .section:not([open]) .chevron {
    transform: rotate(-90deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
  .count {
    margin-left: 0.25rem;
    color: var(--muted);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>
