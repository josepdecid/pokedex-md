<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PokemonEntry } from '../lib/game-data.ts';
  import { dexLabel } from '../lib/format.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';
  import EntryName from './EntryName.svelte';
  import Portrait from './Portrait.svelte';
  import RecruitToggle from './RecruitToggle.svelte';
  import TypeBadge from './TypeBadge.svelte';

  let {
    entries,
    session,
    details,
  }: {
    entries: readonly PokemonEntry[];
    session: GameSession;
    /** Extra lines under each row's name and types. */
    details?: Snippet<[PokemonEntry]>;
  } = $props();
</script>

<ul class="list">
  {#each entries as entry (entry.id)}
    <li class="row" class:done={session.progress.isRecruited(entry.id)}>
      <a class="link" href={paths.pokemon(session.id, entry.id)}>
        <Portrait entryId={entry.id} portrait={entry.portrait} size={40} />
        <span class="main">
          <span class="name" style:view-transition-name={router.morphId === entry.id ? 'pokemon-name' : undefined}>
            <EntryName {entry} />
          </span>
          <span class="meta">
            <span class="dex">{dexLabel(entry.dex)}</span>
            {#each entry.types as type (type)}<TypeBadge {type} />{/each}
          </span>
          {#if details}{@render details(entry)}{/if}
        </span>
      </a>
      <RecruitToggle {entry} {session} />
    </li>
  {/each}
</ul>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-right: 0.35rem;
    border-top: 1px solid var(--border);
    content-visibility: auto;
    contain-intrinsic-size: auto 64px;
  }
  .row:first-child {
    border-top: 0;
  }
  .link {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.25rem 0.55rem 0.75rem;
    color: inherit;
    text-decoration: none;
  }
  .link:hover .name {
    text-decoration: underline;
  }
  .link:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: -3px;
  }
  .dex {
    min-width: 2.6em;
    font-variant-numeric: tabular-nums;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .name {
    align-self: flex-start;
    max-width: 100%;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
  .done .name {
    color: var(--muted);
  }
  .done :global(.portrait) {
    opacity: 0.55;
  }
</style>
