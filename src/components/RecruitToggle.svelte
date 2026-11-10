<script lang="ts">
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import type { PokemonEntry } from '../lib/game-data.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { entry, session, large = false }: { entry: PokemonEntry; session: GameSession; large?: boolean } = $props();

  const on = $derived(session.progress.isRecruited(entry.id));
  const name = $derived(i18n.entryName(entry));
</script>

<button
  type="button"
  class="toggle"
  class:large
  class:on
  aria-pressed={on}
  aria-label={large ? undefined : t(on ? 'toggle.unmark' : 'toggle.mark', { name })}
  onclick={() => session.progress.toggle(entry.id)}
>
  <span class="box" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  </span>
  {#if large}
    <span>{t(on ? 'toggle.recruited' : 'toggle.notRecruited')}</span>
  {/if}
</button>

<style>
  .toggle {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    min-width: 48px;
    min-height: 48px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
  }
  .box {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 2px solid var(--border-strong);
    background: var(--surface);
    transition: background 0.12s, border-color 0.12s;
  }
  svg {
    fill: none;
    stroke: #fff;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 0.12s, transform 0.12s;
  }
  .on .box {
    background: var(--accent);
    border-color: var(--accent);
  }
  .on svg {
    opacity: 1;
    transform: none;
  }
  .large {
    padding: 0.4rem 1rem 0.4rem 0.6rem;
    border-radius: 999px;
    border: 2px solid var(--border-strong);
    background: var(--surface);
  }
  .large.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  .toggle:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
    border-radius: 10px;
  }
  @media (prefers-reduced-motion: reduce) {
    .box,
    svg {
      transition: none;
    }
  }
</style>
