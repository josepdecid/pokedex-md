<script lang="ts">
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import type { PokemonEntry } from '../lib/game-data.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { entry, session, large = false }: { entry: PokemonEntry; session: GameSession; large?: boolean } = $props();

  const on = $derived(session.progress.isRecruited(entry.id));
  const name = $derived(i18n.entryLabel(entry));

  // Only play the "caught" wobble after a user click, never on first render
  // (otherwise every already-recruited row would wobble when the list mounts).
  let caught = $state(false);

  function toggle() {
    session.progress.toggle(entry.id);
    caught = session.progress.isRecruited(entry.id);
  }
</script>

<button
  type="button"
  class="toggle"
  class:large
  class:on
  class:caught
  aria-pressed={on}
  aria-label={large ? undefined : t(on ? 'toggle.unmark' : 'toggle.mark', { name })}
  onclick={toggle}
>
  <!-- An empty checkbox that rounds into a Poké Ball when checked. -->
  <span class="box" aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <rect class="lid" x="-2" y="-2" width="26" height="14" />
      <rect class="band" x="-2" y="10.5" width="28" height="3" />
      <circle class="button" cx="12" cy="12" r="4" />
      <circle class="glint" cx="12" cy="12" r="1.5" onanimationend={() => (caught = false)} />
    </svg>
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

  /*
   * Unchecking runs the steps backwards: the button and band go, the lid
   * swings open, then the box squares off again.
   */
  .box {
    display: block;
    width: 28px;
    height: 28px;
    overflow: hidden;
    border-radius: 8px;
    border: 2px solid var(--border-strong);
    background: var(--surface);
    transform-origin: 50% 100%;
    transition:
      border-radius 0.18s 0.14s ease-out,
      border-color 0.18s 0.14s,
      background 0.18s 0.14s;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  svg * {
    transform-box: view-box;
  }
  .lid {
    fill: var(--ball-top);
    transform-origin: 24px 12px;
    transform: rotate(110deg);
    transition: transform 0.16s ease-out;
  }
  .band {
    fill: var(--ball-line);
    transform-origin: 12px 12px;
    transform: scaleX(0);
    transition: transform 0.1s;
  }
  .button {
    fill: var(--ball-bottom);
    stroke: var(--ball-line);
    stroke-width: 2;
    transform-origin: 12px 12px;
    transform: scale(0);
    transition: transform 0.1s;
  }
  .glint {
    fill: var(--ball-line);
    transform-origin: 12px 12px;
    transform: scale(0);
    transition: transform 0.1s;
  }

  /*
   * Checking: the box rounds into a ball, the red lid swings shut from the
   * hinge at the back, then the band and the button pop in.
   */
  .on .box {
    border-radius: 50%;
    border-color: var(--ball-line);
    background: var(--ball-bottom);
    transition:
      border-radius 0.18s ease-out,
      border-color 0.18s,
      background 0.18s;
  }
  .on .lid {
    transform: none;
    transition: transform 0.2s 0.12s cubic-bezier(0.55, 0, 0.9, 0.5);
  }
  .on .band {
    transform: none;
    transition: transform 0.12s 0.3s ease-out;
  }
  .on .button,
  .on .glint {
    transform: none;
    transition: transform 0.18s 0.34s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  /* Just caught: a few wobbles on the floor, then the button clicks. */
  .caught .box {
    animation: wobble 0.62s 0.5s ease-in-out;
  }
  .caught .glint {
    animation: click 0.3s 1.12s ease-out;
  }
  @keyframes wobble {
    0%,
    100% {
      transform: none;
    }
    20% {
      transform: rotate(-16deg);
    }
    45% {
      transform: rotate(12deg);
    }
    68% {
      transform: rotate(-6deg);
    }
    86% {
      transform: rotate(2deg);
    }
  }
  @keyframes click {
    0%,
    100% {
      transform: none;
      fill: var(--ball-line);
    }
    40% {
      transform: scale(1.7);
      fill: var(--ball-top);
    }
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
    .on .box,
    svg *,
    .on svg * {
      transition: none;
    }
    .caught .box,
    .caught .glint {
      animation: none;
    }
  }
</style>
