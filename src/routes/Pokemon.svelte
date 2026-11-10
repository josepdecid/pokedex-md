<script lang="ts">
  import Portrait from '../components/Portrait.svelte';
  import RecruitToggle from '../components/RecruitToggle.svelte';
  import TypeBadge from '../components/TypeBadge.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { dexLabel } from '../lib/format.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session, id }: { session: GameSession; id: string } = $props();

  const entry = $derived(session.entryById.get(id));
  const index = $derived(entry ? session.data.pokemon.indexOf(entry) : -1);
  const prev = $derived(index > 0 ? session.data.pokemon[index - 1] : undefined);
  const next = $derived(index >= 0 ? session.data.pokemon[index + 1] : undefined);
  const hasPortrait = $derived(!!entry && !!session.data.portraitCredits[entry.species]);
</script>

<a class="back" href={paths.pokedex(session.id)}>‹ {t('pokemon.back')}</a>

{#if entry}
  <article class="card">
    <header>
      <Portrait entryId={entry.id} species={entry.species} available={hasPortrait} size={120} />
      <div class="heading">
        <span class="dex">{dexLabel(entry.dex)}</span>
        <h1 style:view-transition-name={router.morphId === entry.id ? 'pokemon-name' : undefined}>{i18n.entryName(entry)}</h1>
        <div class="types">
          {#each entry.types as type (type)}<TypeBadge {type} />{/each}
        </div>
      </div>
    </header>

    <RecruitToggle {entry} {session} large />

    <section>
      <h2>{t('pokemon.obtain')}</h2>
      {#if entry.obtain.length}
        <ul class="facts">
          {#each entry.obtain as o, i (i)}
            <li>
              <span class="label">{i18n.name('method', o.method)}</span>
              {#if o.dungeon}
                <a href={paths.dungeon(session.id, o.dungeon)}>{i18n.name('dungeon', o.dungeon)}</a>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">{t('pokemon.obtainNone')}</p>
      {/if}
    </section>

    <section>
      <h2>{t('pokemon.camp')}</h2>
      <p><a href={paths.camp(session.id, entry.camp)}>{i18n.name('camp', entry.camp)}</a></p>
    </section>
  </article>

  <nav class="pager" aria-label="{t('pokemon.prev')} / {t('pokemon.next')}">
    {#if prev}
      <a href={paths.pokemon(session.id, prev.id)} rel="prev">
        <small>‹ {t('pokemon.prev')}</small>{i18n.entryName(prev)}
      </a>
    {:else}<span></span>{/if}
    {#if next}
      <a href={paths.pokemon(session.id, next.id)} rel="next" class="next">
        <small>{t('pokemon.next')} ›</small>{i18n.entryName(next)}
      </a>
    {/if}
  </nav>
{:else}
  <p class="muted">{t('pokemon.notFound')}</p>
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .heading {
    min-width: 0;
    display: grid;
    gap: 0.35rem;
    justify-items: start;
  }
  .dex {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  h1 {
    margin: 0;
    font-size: 1.8rem;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .types {
    display: flex;
    gap: 0.35rem;
  }
  .facts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .facts li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    background: var(--surface-2);
  }
  .label {
    color: var(--muted);
  }
  .pager {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    margin-top: 1rem;
  }
  .pager a {
    display: grid;
    gap: 0.1rem;
    padding: 0.7rem 0.85rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pager small {
    color: var(--muted);
    font-weight: 500;
  }
  .pager .next {
    text-align: right;
  }
</style>
