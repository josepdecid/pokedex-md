<script lang="ts">
  import PokemonList from '../components/PokemonList.svelte';
  import ProgressBar from '../components/ProgressBar.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session, id }: { session: GameSession; id: string } = $props();

  const dungeon = $derived(session.dungeonById.get(id));
  const encounters = $derived(session.encountersByDungeon.get(id) ?? []);
  const entries = $derived(encounters.map((e) => e.entry));
  const methodsById = $derived(new Map(encounters.map((e) => [e.entry.id, e.methods])));
  const done = $derived(session.countRecruited(entries));
  // "Recruit in dungeon" is the default, so only call out the special ones.
  const note = (entry: { id: string }) =>
    (methodsById.get(entry.id) ?? [])
      .filter((m) => m !== 'dungeon')
      .map((m) => i18n.name('method', m))
      .join(' · ');
</script>

<a class="back" href={paths.dungeons(session.id)}>‹ {t('dungeon.back')}</a>

{#if dungeon}
  <p class="eyebrow">{t('dungeon.number', { n: dungeon.order })}</p>
  <h1>{i18n.name('dungeon', dungeon.id)}</h1>
  {#if entries.length}
    <div class="headline-progress">
      <ProgressBar {done} total={entries.length} label={t('progress.label', { done, total: entries.length })} />
    </div>
    <PokemonList {entries} {session} {note} />
  {:else}
    <p class="muted">{t('dungeon.none')}</p>
  {/if}
{:else}
  <p class="muted">{t('dungeon.notFound')}</p>
{/if}
