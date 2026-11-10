<script lang="ts">
  import ArtworkCard from '../components/ArtworkCard.svelte';
  import CompletionSections from '../components/CompletionSections.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session }: { session: GameSession } = $props();

  // Unlock order (dungeons.yaml).
  const rows = $derived(
    session.data.dungeons.map((dungeon) => {
      const found = (session.encountersByDungeon.get(dungeon.id) ?? []).map((e) => e.entry);
      return { dungeon, done: session.countRecruited(found), total: found.length };
    }),
  );
</script>

<h1>{t('nav.dungeons')}</h1>
<p class="muted intro">{t('dungeons.intro')}</p>

<CompletionSections {rows} key={(r) => r.dungeon.id} storageKey="dungeons">
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
