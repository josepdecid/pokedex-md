<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import { GLYPHS, PASSWORD_LENGTH, SUITS, glyphOf, suitOf, type PasswordSymbol as Symbol } from '../lib/rescue/dx-password.ts';
  import PasswordSymbol from './PasswordSymbol.svelte';

  // The 30 symbols of a password in the game's groups of 5. Wide enough, it's laid out like the game
  // (two rows of three groups); on a phone, one group per line, top row first. With `onselect`, each
  // symbol is a button and `selected` is highlighted.
  let {
    symbols,
    gameId,
    label,
    selected = null,
    marked = new Set<number>(),
    onselect,
  }: {
    symbols: readonly (Symbol | null)[];
    gameId: string;
    /** Accessible name of the whole password. */
    label: string;
    selected?: number | null;
    /** Symbols to double-check (hard to read in a picture). */
    marked?: ReadonlySet<number>;
    onselect?: (index: number) => void;
  } = $props();

  const groups = Array.from({ length: PASSWORD_LENGTH / 5 }, (_, g) => Array.from({ length: 5 }, (_, i) => g * 5 + i));

  function describe(i: number): string {
    const s = symbols[i];
    const name = s === null || s === undefined ? t('rescues.empty') : `${GLYPHS[glyphOf(s)]} ${t(`rescues.suit.${SUITS[suitOf(s)]!}`)}`;
    return `${i + 1}: ${name}${marked.has(i) ? ` (${t('rescues.unsure')})` : ''}`;
  }
</script>

<div class="frame">
<div class="password" role="group" aria-label={label}>
  {#each groups as group, g (g)}
    <div class="group">
      {#each group as i (i)}
        {#if onselect}
          <button
            type="button"
            class="cell"
            class:marked={marked.has(i)}
            aria-label={describe(i)}
            aria-pressed={selected === i}
            onclick={() => onselect(i)}
          >
            <PasswordSymbol symbol={symbols[i] ?? null} {gameId} />
          </button>
        {:else}
          <span class="cell" class:marked={marked.has(i)} role="img" aria-label={describe(i)}>
            <PasswordSymbol symbol={symbols[i] ?? null} {gameId} />
          </span>
        {/if}
      {/each}
    </div>
  {/each}
</div>
</div>

<style>
  /* The container the layout depends on (a container query can't style its own container). */
  .frame {
    container-type: inline-size;
  }
  .password {
    display: grid;
    gap: 0.4rem;
  }
  .group {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.25rem;
    width: 100%;
    max-width: 19rem;
    margin: 0 auto;
  }
  /* A bigger gap where the game's bottom row starts. */
  .group:nth-child(4) {
    margin-top: 0.6rem;
  }
  @container (min-width: 34rem) {
    .password {
      grid-template-columns: repeat(3, 1fr);
      column-gap: 0.6rem;
    }
    .group:nth-child(4) {
      margin-top: 0;
    }
  }
  .cell {
    display: block;
    padding: 6%;
    border: 2px solid transparent;
    border-radius: 22%;
    background: var(--surface-2);
    color: inherit;
    font: inherit;
  }
  button.cell {
    cursor: pointer;
    touch-action: manipulation;
  }
  .cell.marked {
    border-color: var(--focus);
    border-style: dashed;
  }
  .cell[aria-pressed='true'] {
    border-color: var(--accent);
    border-style: solid;
    background: var(--accent-soft);
  }
</style>
