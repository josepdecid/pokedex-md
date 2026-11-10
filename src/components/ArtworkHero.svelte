<script lang="ts">
  // The artwork heading a camp or dungeon page, cropped to a banner; a "?" placeholder
  // without artwork. With `morph`, it and the list card's artwork share a
  // view-transition-name, so one morphs into the other.
  let { image, morph = false }: { image?: string; morph?: boolean } = $props();
</script>

{#if image}
  <img
    class="hero"
    src="{import.meta.env.BASE_URL}{image}"
    alt=""
    width="700"
    height="273"
    decoding="async"
    data-morph={morph ? '' : undefined}
    style:view-transition-name={morph ? 'artwork' : undefined}
  />
{:else}
  <div class="hero missing" aria-hidden="true" style:view-transition-name={morph ? 'artwork' : undefined}>?</div>
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
  .missing {
    display: grid;
    place-items: center;
    color: var(--muted);
    font-size: 3rem;
    font-weight: 700;
  }
</style>
