<script lang="ts">
  import ArtworkHero from '../components/ArtworkHero.svelte';
  import DetailHeadline from '../components/DetailHeadline.svelte';
  import RecruitSections from '../components/RecruitSections.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session, id }: { session: GameSession; id: string } = $props();

  const camp = $derived(session.campById.get(id));
  const residents = $derived(session.entriesByCamp.get(id) ?? []);
  const done = $derived(session.countRecruited(residents));
  const morph = $derived(router.morphCampId === id);
</script>

{#if camp}
  <ArtworkHero image={camp.image} {morph} />
  <DetailHeadline
    backHref={paths.camps(session.id)}
    backLabel={t('camp.back')}
    title={i18n.name('camp', camp.id)}
    {morph}
    {done}
    total={residents.length}
  />
  <h2 class="visually-hidden">{t('camp.residents')}</h2>
  <RecruitSections entries={residents} {session} storageKey="camp" />
{:else}
  <a class="back" href={paths.camps(session.id)}>‹ {t('camp.back')}</a>
  <p class="muted">{t('camp.notFound')}</p>
{/if}
