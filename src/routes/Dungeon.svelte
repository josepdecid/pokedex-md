<script lang="ts">
  import ArtworkHero from '../components/ArtworkHero.svelte';
  import MethodIcon from '../components/MethodIcon.svelte';
  import ObtainLines from '../components/ObtainLines.svelte';
  import ProgressBar from '../components/ProgressBar.svelte';
  import RecruitSections from '../components/RecruitSections.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import type { Obtain } from '../lib/game-data.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session, id }: { session: GameSession; id: string } = $props();

  const dungeon = $derived(session.dungeonById.get(id));
  const encounters = $derived(session.encountersByDungeon.get(id) ?? []);
  const entries = $derived(encounters.map((e) => e.entry));
  // One line per way of getting it here, in the game's method order (wild first, fainted last).
  const methodOrder = $derived(new Map(session.data.methods.map((m, i) => [m.id, i])));
  const byMethod = (a: Obtain, b: Obtain) => (methodOrder.get(a.method) ?? Infinity) - (methodOrder.get(b.method) ?? Infinity);
  const obtainsById = $derived(new Map(encounters.map((e) => [e.entry.id, [...e.obtains].sort(byMethod)])));
  // Legend for the method icons, listing only the methods found in this dungeon.
  const methods = $derived(
    session.data.methods.map((m) => m.id).filter((m) => encounters.some((e) => e.obtains.some((o) => o.method === m))),
  );
  const done = $derived(session.countRecruited(entries));
  const morph = $derived(router.morphDungeonId === id);
</script>

{#snippet details(entry: { id: string })}
  <ObtainLines obtains={obtainsById.get(entry.id) ?? []} methods={session.methodById} />
{/snippet}

<a class="back" href={paths.dungeons(session.id)}>‹ {t('dungeon.back')}</a>

{#if dungeon}
  <ArtworkHero image={dungeon.image} {morph} />
  <p class="eyebrow">{t('dungeon.number', { n: dungeon.order })}</p>
  <h1 style:view-transition-name={morph ? 'artwork-title' : undefined}>{i18n.name('dungeon', dungeon.id)}</h1>
  {#if entries.length}
    <div class="headline-progress">
      <ProgressBar {done} total={entries.length} label={t('progress.label', { done, total: entries.length })} />
    </div>
    <ul class="legend">
      {#each methods as method (method)}
        <li><MethodIcon {method} icon={session.methodById.get(method)?.icon} />{i18n.name('method', method)}</li>
      {/each}
    </ul>
    <RecruitSections {entries} {session} {details} storageKey="dungeon" />
  {:else}
    <p class="muted">{t('dungeon.none')}</p>
  {/if}
{:else}
  <p class="muted">{t('dungeon.notFound')}</p>
{/if}

<style>
  .legend {
    list-style: none;
    margin: 0 0 0.75rem;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  h1 {
    width: fit-content;
    max-width: 100%;
  }
</style>
