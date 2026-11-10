<script lang="ts">
  import ArtworkHero from '../components/ArtworkHero.svelte';
  import PokemonList from '../components/PokemonList.svelte';
  import ProgressBar from '../components/ProgressBar.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session, id }: { session: GameSession; id: string } = $props();

  const camp = $derived(session.campById.get(id));
  const residents = $derived(session.entriesByCamp.get(id) ?? []);
  const done = $derived(session.countRecruited(residents));
  const morph = $derived(router.morphCampId === id);
</script>

<a class="back" href={paths.camps(session.id)}>‹ {t('camp.back')}</a>

{#if camp}
  <ArtworkHero image={camp.image} {morph} />
  <h1 style:view-transition-name={morph ? 'artwork-title' : undefined}>{i18n.name('camp', camp.id)}</h1>
  <div class="headline-progress">
    <ProgressBar {done} total={residents.length} label={t('progress.label', { done, total: residents.length })} />
  </div>
  <h2 class="visually-hidden">{t('camp.residents')}</h2>
  <PokemonList entries={residents} {session} />
{:else}
  <p class="muted">{t('camp.notFound')}</p>
{/if}

<style>
  h1 {
    width: fit-content;
    max-width: 100%;
  }
</style>
