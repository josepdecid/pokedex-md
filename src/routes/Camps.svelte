<script lang="ts">
  import ArtworkCard from '../components/ArtworkCard.svelte';
  import CompletionSections from '../components/CompletionSections.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session }: { session: GameSession } = $props();

  // Unlock order (camps.yaml).
  const rows = $derived(
    session.data.camps.map((camp) => {
      const residents = session.entriesByCamp.get(camp.id) ?? [];
      return { camp, done: session.countRecruited(residents), total: residents.length };
    }),
  );
</script>

<h1>{t('nav.camps')}</h1>
<p class="muted intro">{t('camps.intro')}</p>

<CompletionSections {rows} key={(r) => r.camp.id} storageKey="camps">
  {#snippet item({ camp, done, total })}
    <ArtworkCard
      href={paths.camp(session.id, camp.id)}
      title={i18n.name('camp', camp.id)}
      image={camp.image}
      {done}
      {total}
      morph={router.morphCampId === camp.id}
    />
  {/snippet}
</CompletionSections>
