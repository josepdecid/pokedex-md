<script lang="ts">
  import ArtworkHero from '../components/ArtworkHero.svelte';
  import DetailHeadline from '../components/DetailHeadline.svelte';
  import MethodIcon from '../components/MethodIcon.svelte';
  import ObtainLines from '../components/ObtainLines.svelte';
  import RecruitSections from '../components/RecruitSections.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import type { Obtain } from '../lib/game-data.ts';
  import { firstFloor } from '../lib/obtain.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { DungeonEncounter, GameSession } from '../lib/session.svelte.ts';

  let { session, id }: { session: GameSession; id: string } = $props();

  const dungeon = $derived(session.dungeonById.get(id));
  // Ways of getting a Pokémon here, ranked in the game's method order (recruit, Super Foe, fainted, Mystery House...).
  const methodOrder = $derived(new Map(session.data.methods.map((m, i) => [m.id, i])));
  const rank = (o: Obtain) => methodOrder.get(o.method) ?? Infinity;
  const byMethod = (a: Obtain, b: Obtain) => rank(a) - rank(b) || firstFloor(a) - firstFloor(b);
  // One line per way of getting it here, in that order.
  const encounters = $derived(
    (session.encountersByDungeon.get(id) ?? []).map((e): DungeonEncounter => ({ ...e, obtains: [...e.obtains].sort(byMethod) })),
  );
  // Grouped by their best way of getting it, then from the lowest floor it shows up on, then in dex order.
  // Every encounter has at least one obtain: it's listed here because of one.
  const entries = $derived(
    encounters
      .slice()
      .sort((a, b) => byMethod(a.obtains[0]!, b.obtains[0]!) || a.entry.dex - b.entry.dex)
      .map((e) => e.entry),
  );
  const obtainsById = $derived(new Map(encounters.map((e) => [e.entry.id, e.obtains])));
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

{#if dungeon}
  <ArtworkHero image={dungeon.image} {morph} />
  <DetailHeadline
    backHref={paths.dungeons(session.id)}
    backLabel={t('dungeon.back')}
    title={i18n.name('dungeon', dungeon.id)}
    {morph}
    {done}
    total={entries.length}
  />
  {#if entries.length}
    <RecruitSections {entries} {session} {details} storageKey="dungeon" />
    <ul class="legend">
      {#each methods as method (method)}
        <li><MethodIcon {method} icon={session.methodById.get(method)?.icon} />{i18n.name('method', method)}</li>
      {/each}
    </ul>
  {:else}
    <p class="muted">{t('dungeon.none')}</p>
  {/if}
{:else}
  <a class="back" href={paths.dungeons(session.id)}>‹ {t('dungeon.back')}</a>
  <p class="muted">{t('dungeon.notFound')}</p>
{/if}

<style>
  .legend {
    list-style: none;
    margin: 1rem 0 0;
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
</style>
