<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import ProgressBar from './ProgressBar.svelte';

  // Top of a camp's or dungeon's page: back link on the left, its name on the right, and how
  // many of its Pokémon are recruited below. Stays pinned under the top bar while the list scrolls.
  let {
    backHref,
    backLabel,
    title,
    subtitle,
    morph = false,
    done,
    total,
  }: {
    backHref: string;
    backLabel: string;
    title: string;
    /** Small line under the name. */
    subtitle?: string;
    /** Whether the name morphs from the card it was opened from. */
    morph?: boolean;
    done: number;
    total: number;
  } = $props();
</script>

<div class="headline" class:pinned={total > 0}>
  <div class="title-row">
    <a class="back" href={backHref}>‹ {backLabel}</a>
    <div class="heading">
      <h1 style:view-transition-name={morph ? 'artwork-title' : undefined}>{title}</h1>
      {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
    </div>
  </div>
  {#if total > 0}
    <div class="headline-progress">
      <ProgressBar {done} {total} label={t('progress.label', { done, total })} />
    </div>
  {/if}
</div>

<style>
  /* Full-bleed over .page's gutter, so rows don't show beside it as they scroll under. */
  .headline {
    margin: 0 -16px;
    padding: 0 16px;
    background: var(--bg);
    --headline-fade: 1rem;
  }
  .headline-progress {
    margin-bottom: 0;
    padding-bottom: 0.75rem;
  }
  /* Not pinned on short screens (phones in landscape), where it would cover most of the list. */
  @media (min-height: 480px) {
    .headline.pinned {
      position: sticky;
      top: var(--topbar-h);
      z-index: 5;
      margin-bottom: var(--headline-fade);
      /* Browsers floor the topbar's border to whole device pixels, leaving it a fraction short
         of --topbar-h on fractional-density screens. Reaches behind it to close that gap. */
      box-shadow: 0 -1px var(--bg);
    }
    /* Rows fade out as they scroll under. Fills the margin below, so it's invisible at rest. */
    .headline.pinned::after {
      content: '';
      position: absolute;
      inset: 100% 0 auto;
      height: var(--headline-fade);
      background: linear-gradient(var(--bg), transparent);
      pointer-events: none;
    }
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-top: 0.25rem;
  }
  .back {
    flex: none;
  }
  .heading {
    min-width: 0;
    margin-left: auto;
    text-align: right;
  }
  h1 {
    margin: 0;
    font-size: 1.25rem;
  }
  .subtitle {
    margin: 0.1rem 0 0;
    font-size: 0.8rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
</style>
