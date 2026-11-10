<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import type { Camp } from '../lib/game-data.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';
  import { settings } from '../lib/settings.svelte.ts';

  let { session }: { session: GameSession } = $props();

  interface CampRow {
    camp: Camp;
    done: number;
    total: number;
  }

  // Unlock order (camps.yaml), split by whether every resident has been recruited.
  const rows = $derived<CampRow[]>(
    session.data.camps.map((camp) => {
      const residents = session.entriesByCamp.get(camp.id) ?? [];
      return { camp, done: session.countRecruited(residents), total: residents.length };
    }),
  );
  const isComplete = (r: CampRow) => r.total > 0 && r.done === r.total;
  const incomplete = $derived(rows.filter((r) => !isComplete(r)));
  const complete = $derived(rows.filter(isComplete));
</script>

{#snippet campList(list: CampRow[])}
  <ul class="cards">
    {#each list as { camp, done, total } (camp.id)}
      {@const morph = router.morphCampId === camp.id}
      <li>
        <a class="card-link camp" class:complete={total > 0 && done === total} href={paths.camp(session.id, camp.id)}>
          {#if camp.image}
            <img
              class="art"
              src="{import.meta.env.BASE_URL}{camp.image}"
              alt=""
              width="700"
              height="273"
              loading="lazy"
              decoding="async"
              data-morph={morph ? '' : undefined}
              style:view-transition-name={morph ? 'camp-image' : undefined}
            />
          {/if}
          <span class="body">
            <span class="title" style:view-transition-name={morph ? 'camp-name' : undefined}>{i18n.name('camp', camp.id)}</span>
            <ProgressBar {done} {total} label={t('progress.label', { done, total })} />
          </span>
        </a>
      </li>
    {/each}
  </ul>
{/snippet}

<h1>{t('nav.camps')}</h1>
<p class="muted intro">{t('camps.intro')}</p>

{#snippet section(key: 'camps.incomplete' | 'camps.complete', list: CampRow[])}
  <!-- Collapsed sections are remembered (settings), so they stay closed after visiting a camp. -->
  <details
    class="section"
    open={!settings.isCollapsed(key)}
    ontoggle={(e) => settings.setCollapsed(key, !e.currentTarget.open)}
  >
    <summary>
      <h2>{t(key)} <span class="count">{list.length}</span></h2>
      <svg class="chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5l5 5 5-5" />
      </svg>
    </summary>
    {@render campList(list)}
  </details>
{/snippet}

{#if incomplete.length && complete.length}
  {@render section('camps.incomplete', incomplete)}
  {@render section('camps.complete', complete)}
{:else}
  {@render campList(rows)}
{/if}

<style>
  .section + .section {
    margin-top: 1rem;
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 44px;
    margin-bottom: 0.25rem;
    list-style: none;
    cursor: pointer;
    border-radius: 8px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary h2 {
    margin: 0;
  }
  .chevron {
    flex: none;
    margin-right: 0.5rem;
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.2s;
  }
  .section:not([open]) .chevron {
    transform: rotate(-90deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
  .count {
    margin-left: 0.25rem;
    color: var(--muted);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .camp {
    --art: min(32%, 9rem);
    position: relative;
    min-height: 5rem;
    overflow: hidden;
  }
  /* Artwork on the left, fading into the card towards the text. */
  .art {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--art);
    height: 100%;
    object-fit: cover;
    mask-image: linear-gradient(to right, #000 40%, transparent);
  }
  /* Text starts once the artwork has faded out (the card's own padding adds the gap). */
  .camp:has(.art) .body {
    padding-left: calc(var(--art) - 0.15rem);
  }
  .title {
    align-self: start;
    justify-self: start;
    max-width: 100%;
  }
  .camp:hover .title {
    text-decoration: underline;
  }
</style>
