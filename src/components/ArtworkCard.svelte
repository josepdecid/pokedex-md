<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import ProgressBar from './ProgressBar.svelte';

  // A camp or dungeon in a list: its artwork on the left, fading out before the name.
  // Without artwork, a "?" placeholder takes its place, so the list lines up.
  // With nothing to recruit (0/0) the card counts as complete, like in CompletionSections.
  // `morph` names the artwork and title for the view transition into its page (see ArtworkHero).
  let {
    href,
    title,
    subtitle,
    image,
    done,
    total,
    morph = false,
  }: {
    href: string;
    title: string;
    /** Small line after the name. */
    subtitle?: string;
    /** Path under public/; no artwork if absent. */
    image?: string;
    done: number;
    total: number;
    morph?: boolean;
  } = $props();
</script>

<a class="card-link art-card" class:complete={done >= total} {href}>
  {#if image}
    <img
      class="art"
      src="{import.meta.env.BASE_URL}{image}"
      alt=""
      width="700"
      height="273"
      loading="lazy"
      decoding="async"
      data-morph={morph ? '' : undefined}
      style:view-transition-name={morph ? 'artwork' : undefined}
    />
  {:else}
    <span class="art missing" aria-hidden="true" style:view-transition-name={morph ? 'artwork' : undefined}>?</span>
  {/if}
  <span class="body">
    <span class="heading">
      <span class="title" style:view-transition-name={morph ? 'artwork-title' : undefined}>{title}</span>
      {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
    </span>
    <ProgressBar {done} {total} label={t('progress.label', { done, total })} />
  </span>
</a>

<style>
  .art-card {
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
  /* Centred in the part of the placeholder that hasn't faded out yet. */
  .missing {
    display: grid;
    place-items: center;
    padding-right: calc(var(--art) * 0.3);
    background: var(--surface-2);
    color: var(--muted);
    font-size: 1.6rem;
    font-weight: 700;
  }
  /* Text starts once the artwork has faded out (the card's own padding adds the gap). */
  .body {
    padding-left: calc(var(--art) - 0.15rem);
  }
  /* Name on the left; the subtitle on the right of the same line, in the progress count's font.
     A long name wraps rather than pushing the subtitle down. */
  .heading {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  .subtitle {
    flex: none;
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
  }
  .art-card:hover .title {
    text-decoration: underline;
  }
</style>
