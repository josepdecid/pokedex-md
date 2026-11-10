<script lang="ts">
  import { i18n } from '../i18n/i18n.svelte.ts';

  // A small icon for a way of getting a Pokémon, labelled with the method's name.
  // Uses the game's own icon (an item sprite) when it has one, otherwise a generic
  // drawing, or a plain dot for methods this component doesn't know.
  let { method, icon, size = 16 }: { method: string; icon?: string; size?: number } = $props();

  const KNOWN = ['dungeon', 'strong-foe', 'legendary', 'mystery-house', 'fainted', 'pokemon-square'];
  const label = $derived(i18n.name('method', method));
</script>

{#if icon}
  <img
    class="method-icon"
    src={`${import.meta.env.BASE_URL}${icon}`}
    alt={label}
    title={label}
    width={size}
    height={size}
    decoding="async"
  />
{:else}
  <svg
    class="method-icon"
    data-method={KNOWN.includes(method) ? method : 'other'}
    viewBox="0 0 16 16"
    width={size}
    height={size}
    role="img"
    aria-label={label}
  >
    <title>{label}</title>
    {#if method === 'dungeon'}
      <!-- Paw print: a wild Pokémon. -->
      <ellipse cx="8" cy="11" rx="3.3" ry="2.7" class="fill" />
      <circle cx="3.4" cy="7.2" r="1.4" class="fill" />
      <circle cx="6.1" cy="4.3" r="1.5" class="fill" />
      <circle cx="9.9" cy="4.3" r="1.5" class="fill" />
      <circle cx="12.6" cy="7.2" r="1.4" class="fill" />
    {:else if method === 'strong-foe'}
      <!-- Sparkle: a strong foe, which can be Shiny. -->
      <path class="fill" d="M8 1.2l1.7 4.6 4.6 1.7-4.6 1.7L8 13.8 6.3 9.2 1.7 7.5l4.6-1.7z" />
      <circle class="fill" cx="13.2" cy="13.2" r="1.3" />
    {:else if method === 'legendary'}
      <!-- Crown. -->
      <path class="fill" d="M2 5l3 3 3-5 3 5 3-3-1.2 7.5H3.2z" />
      <rect class="fill" x="3.2" y="13.3" width="9.6" height="1.5" rx="0.6" />
    {:else if method === 'mystery-house'}
      <!-- House. -->
      <path class="fill" d="M8 1.5l6.5 5.6h-1.8v7.4H9.6v-4.3H6.4v4.3H3.3V7.1H1.5z" />
    {:else if method === 'fainted'}
      <!-- First-aid cross: found fainted, waiting for rescue. -->
      <rect class="fill" x="1.5" y="1.5" width="13" height="13" rx="3.5" />
      <path class="cut" d="M8 4.5v7M4.5 8h7" />
    {:else if method === 'pokemon-square'}
      <!-- Shop awning. -->
      <path class="fill" d="M2 2.5h12l1 4a2 2 0 0 1-3.5 1.3 2 2 0 0 1-3.5 0 2 2 0 0 1-3.5 0A2 2 0 0 1 1 6.5z" />
      <path class="fill" d="M3 9.5h10v5H3z" />
    {:else}
      <circle class="fill" cx="8" cy="8" r="4" />
    {/if}
  </svg>
{/if}

<style>
  .method-icon {
    flex: none;
    color: var(--muted);
  }
  img.method-icon {
    object-fit: contain;
  }
  .fill {
    fill: currentColor;
  }
  .cut {
    fill: none;
    stroke: var(--surface);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  [data-method='dungeon'] {
    color: var(--type-grass);
  }
  [data-method='strong-foe'] {
    color: var(--type-electric);
  }
  [data-method='legendary'] {
    color: var(--type-dragon);
  }
  [data-method='mystery-house'] {
    color: var(--type-water);
  }
  [data-method='fainted'] {
    color: var(--type-fire);
  }
  [data-method='pokemon-square'] {
    color: var(--type-fairy);
  }
</style>
