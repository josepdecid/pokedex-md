<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import { GLYPHS, SUITS, SYMBOL_COUNT, symbolOf } from '../lib/rescue/dx-password.ts';
  import PasswordSymbol from './PasswordSymbol.svelte';

  // Keys to type a password: pick a shape, then a glyph. Two taps at most per symbol, with keys big
  // enough for a phone (the game's 13×5 grid of every symbol takes too much room).
  let {
    gameId,
    suit,
    onsuit,
    onglyph,
    onbackspace,
  }: {
    gameId: string;
    suit: number;
    onsuit: (suit: number) => void;
    onglyph: (glyph: number) => void;
    onbackspace: () => void;
  } = $props();

  const suitName = (s: number) => t(`rescues.suit.${SUITS[s]!}`);
</script>

<div class="keypad">
  <div class="suits" role="radiogroup" aria-label={t('rescues.suits')}>
    {#each SUITS as _, s (s)}
      <button type="button" class="key" role="radio" aria-checked={suit === s} aria-label={suitName(s)} onclick={() => onsuit(s)}>
        <span class="suit" style:background-image={`url(${import.meta.env.BASE_URL}rescue/${gameId}/${SUITS[s]}.webp)`}></span>
      </button>
    {/each}
  </div>
  <div class="glyphs">
    {#each GLYPHS as glyph, g (g)}
      {@const symbol = symbolOf(suit, g)}
      <button
        type="button"
        class="key"
        aria-label={`${glyph} ${suitName(suit)}`}
        disabled={symbol >= SYMBOL_COUNT}
        onclick={() => onglyph(g)}
      >
        <PasswordSymbol symbol={symbol < SYMBOL_COUNT ? symbol : null} {gameId} />
      </button>
    {/each}
    <button type="button" class="key backspace" aria-label={t('rescues.delete')} onclick={onbackspace}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M9 5h11v14H9l-6-7z" />
        <path d="M12 9.5l5 5M17 9.5l-5 5" />
      </svg>
    </button>
  </div>
</div>

<style>
  .keypad {
    display: grid;
    gap: 0.6rem;
    max-width: 24rem;
    margin: 0 auto;
    width: 100%;
  }
  .suits {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.4rem;
  }
  .glyphs {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.3rem;
  }
  .key {
    display: grid;
    place-items: center;
    min-height: 44px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    touch-action: manipulation;
  }
  .key:disabled {
    visibility: hidden;
  }
  .suits .key[aria-checked='true'] {
    border: 2px solid var(--accent);
    background: var(--accent-soft);
  }
  .suit {
    width: 34px;
    height: 34px;
    background: center / contain no-repeat;
  }
  .backspace svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
</style>
