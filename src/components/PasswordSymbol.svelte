<script lang="ts">
  import { GLYPHS, SUITS, glyphOf, suitOf, type PasswordSymbol } from '../lib/rescue/dx-password.ts';

  // One password symbol as the game draws it: a white glyph over a suit. Fills its container
  // (which sets the size); empty when `symbol` is null.
  let { symbol, gameId }: { symbol: PasswordSymbol | null; gameId: string } = $props();

  const suit = $derived(symbol === null ? null : SUITS[suitOf(symbol)]);
</script>

<span
  class="symbol"
  aria-hidden="true"
  style:background-image={suit ? `url(${import.meta.env.BASE_URL}rescue/${gameId}/${suit}.webp)` : undefined}
>
  {#if symbol !== null}<span class="glyph">{GLYPHS[glyphOf(symbol)]}</span>{/if}
</span>

<style>
  .symbol {
    container-type: inline-size;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    background: center / contain no-repeat;
  }
  /* White with a dark outline, like the game's glyphs. */
  .glyph {
    margin: 0 0.04em 0 0;
    font-size: 44cqw;
    font-weight: 800;
    line-height: 1;
    color: #fff;
    -webkit-text-stroke: 0.14em #1d1d1d;
    paint-order: stroke fill;
    font-family: 'Arial Rounded MT Bold', 'Nunito', system-ui, sans-serif;
  }
</style>
