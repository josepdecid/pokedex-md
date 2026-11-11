<script lang="ts">
  import ArtworkCard from '../components/ArtworkCard.svelte';
  import CompletionSections from '../components/CompletionSections.svelte';
  import PinnedSearch from '../components/PinnedSearch.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import { listQueries, nameMatcher } from '../lib/search.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session }: { session: GameSession } = $props();

  // Unlock order (dungeons.yaml).
  const rows = $derived(
    session.data.dungeons.map((dungeon) => {
      const found = (session.encountersByDungeon.get(dungeon.id) ?? []).map((e) => e.entry);
      return { dungeon, done: session.countRecruited(found), total: found.length };
    }),
  );
  const shown = $derived.by(() => {
    const matches = nameMatcher(listQueries.dungeons);
    return rows.filter((r) => matches(i18n.name('dungeon', r.dungeon.id)));
  });
</script>

<PinnedSearch bind:value={listQueries.dungeons} label={t('dungeons.search')} />

<h1>{t('nav.dungeons')}</h1>
<p class="muted intro">{t('dungeons.intro')}</p>

{#if shown.length}
  <CompletionSections rows={shown} key={(r) => r.dungeon.id} storageKey="dungeons">
    {#snippet item({ dungeon, done, total })}
      <ArtworkCard
        href={paths.dungeon(session.id, dungeon.id)}
        title={i18n.name('dungeon', dungeon.id)}
        image={dungeon.image}
        {done}
        {total}
        morph={router.morphDungeonId === dungeon.id}
      />
    {/snippet}
  </CompletionSections>
{:else}
  <p class="muted">{t('dungeons.empty')}</p>
{/if}
