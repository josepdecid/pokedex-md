<script lang="ts" generics="T extends { done: number; total: number }">
  import type { Snippet } from 'svelte';
  import { t } from '../i18n/i18n.svelte.ts';
  import CollapsibleSection from './CollapsibleSection.svelte';

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

{#if incomplete.length && complete.length}
  {#each [['incomplete', incomplete], ['complete', complete]] as const as [which, rows] (which)}
    <CollapsibleSection title={t(`sections.${which}`)} count={rows.length} collapseKey={`${storageKey}.${which}`}>
      {@render list(rows)}
    </CollapsibleSection>
  {/each}
{:else}
  {@render list(rows)}
{/if}
