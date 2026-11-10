<script lang="ts">
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
  {#if camp.image}
    <img
      class="hero"
      src="{import.meta.env.BASE_URL}{camp.image}"
      alt=""
      width="700"
      height="273"
      decoding="async"
      data-morph={morph ? '' : undefined}
      style:view-transition-name={morph ? 'camp-image' : undefined}
    />
  {/if}
  <h1 style:view-transition-name={morph ? 'camp-name' : undefined}>{i18n.name('camp', camp.id)}</h1>
  <div class="headline-progress">
    <ProgressBar {done} total={residents.length} label={t('progress.label', { done, total: residents.length })} />
  </div>
  <h2 class="visually-hidden">{t('camp.residents')}</h2>
  <PokemonList entries={residents} {session} />
{:else}
  <p class="muted">{t('camp.notFound')}</p>
{/if}

<style>
  .hero {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 700 / 273;
    object-fit: cover;
    margin: 0.25rem 0 0.5rem;
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  h1 {
    width: fit-content;
    max-width: 100%;
  }
</style>
