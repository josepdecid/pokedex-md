<script lang="ts">
  import SearchInput from './SearchInput.svelte';

  // Search box at the top of a list page, pinned under the top bar while the list scrolls,
  // like the Pokédex tools.
  let { value = $bindable(''), label }: { value?: string; label: string } = $props();

  // It stays on screen mid-list, so a new search starts its results from the top.
  // Skips the first run, which would undo the router restoring the list's scroll position.
  let searched = false;
  $effect(() => {
    void value;
    if (searched) window.scrollTo(0, 0);
    searched = true;
  });
</script>

<div class="pinned-search">
  <SearchInput bind:value {label} />
</div>

<style>
  /* Full-bleed over .page's gutter, so rows don't show beside it as they scroll under.
     The top margin cancels .page's padding, so it rests where it pins and doesn't shift. */
  .pinned-search {
    display: flex;
    margin: -1rem -16px var(--search-fade);
    padding: 0.5rem 16px 0;
    background: var(--bg);
    --search-fade: 1rem;
  }
  /* Not on short screens (phones in landscape), where it would cover most of the list. */
  @media (min-height: 480px) {
    .pinned-search {
      position: sticky;
      top: var(--topbar-h);
      z-index: 5;
      /* Browsers floor the topbar's border to whole device pixels, leaving it a fraction short
         of --topbar-h on fractional-density screens. Reaches behind it to close that gap. */
      box-shadow: 0 -1px var(--bg);
    }
    /* Rows fade out as they scroll under. Fills the margin below, so it's invisible at rest. */
    .pinned-search::after {
      content: '';
      position: absolute;
      inset: 100% 0 auto;
      height: var(--search-fade);
      background: linear-gradient(var(--bg), transparent);
      pointer-events: none;
    }
  }
</style>
