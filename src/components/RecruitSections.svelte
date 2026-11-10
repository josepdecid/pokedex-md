<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import type { PokemonEntry } from '../lib/game-data.ts';
  import type { GameSession } from '../lib/session.svelte.ts';
  import CollapsibleSection from './CollapsibleSection.svelte';
  import PokemonList from './PokemonList.svelte';

  // A camp's or dungeon's Pokémon, in their given order, split into collapsible
  // Unrecruited and Recruited sections once both have entries, so the ones still to
  // catch are up front. Marking one recruited moves it to the other section.
  let {
    entries,
    session,
    storageKey,
    note,
  }: {
    entries: readonly PokemonEntry[];
    session: GameSession;
    /** Prefix of the remembered collapsed state: `<storageKey>.unrecruited` / `.recruited`. */
    storageKey: string;
    note?: (entry: PokemonEntry) => string;
  } = $props();

  const unrecruited = $derived(entries.filter((e) => !session.progress.isRecruited(e.id)));
  const recruited = $derived(entries.filter((e) => session.progress.isRecruited(e.id)));
</script>

{#if unrecruited.length && recruited.length}
  {#each [['unrecruited', unrecruited], ['recruited', recruited]] as const as [which, entries] (which)}
    <CollapsibleSection title={t(`sections.${which}`)} count={entries.length} collapseKey={`${storageKey}.${which}`}>
      <PokemonList {entries} {session} {note} />
    </CollapsibleSection>
  {/each}
{:else}
  <PokemonList {entries} {session} {note} />
{/if}
