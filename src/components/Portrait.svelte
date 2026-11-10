<script lang="ts">
  import { router } from '../lib/router.svelte.ts';

  let {
    entryId,
    portrait,
    size,
  }: {
    /** Checklist entry, used to match the same portrait across pages in view transitions. */
    entryId: string;
    /** Portrait file name (entry.portrait); a placeholder is shown when undefined. */
    portrait: string | undefined;
    size: number;
  } = $props();

  let failed = $state(false);
  const src = $derived(`${import.meta.env.BASE_URL}portraits/${portrait}.png`);
  const morph = $derived(router.morphId === entryId);
</script>

{#if portrait && !failed}
  <img
    class="portrait"
    {src}
    alt=""
    width={size}
    height={size}
    decoding="async"
    data-morph={morph ? '' : undefined}
    style:--size="{size}px"
    style:view-transition-name={morph ? 'pokemon-portrait' : undefined}
    onerror={() => (failed = true)}
  />
{:else}
  <span
    class="portrait placeholder"
    aria-hidden="true"
    style:--size="{size}px"
    style:view-transition-name={morph ? 'pokemon-portrait' : undefined}
  >?</span>
{/if}

<style>
  .portrait {
    flex: none;
    display: block;
    width: var(--size);
    height: var(--size);
    border-radius: calc(var(--size) / 5);
    background: var(--surface-2);
    /* Pixel art: scale by whole multiples (40px source) and keep the pixels crisp. */
    image-rendering: pixelated;
    box-shadow: 0 0 0 1px var(--border);
  }
  .placeholder {
    display: grid;
    place-items: center;
    color: var(--muted);
    font-weight: 700;
    font-size: calc(var(--size) / 2.5);
  }
</style>
