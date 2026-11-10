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
  <svg class="ball" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
    <g class="body">
      <path class="lid" d="M3 17a13 13 0 0 1 26 0z" />
      <path class="base" d="M3 17a13 13 0 0 0 26 0z" />
      <circle class="button" cx="16" cy="17" r="4.25" />
      <circle class="glint" cx="16" cy="17" r="1.6" onanimationend={() => (caught = false)} />
    </g>
  </svg>
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

  .ball {
    flex: none;
    overflow: visible;
  }
  .ball * {
    transform-box: view-box;
  }
  .lid,
  .base,
  .button {
    fill: var(--surface);
    stroke: var(--border-strong);
    stroke-width: 2;
    stroke-linejoin: round;
    transition:
      fill 0.15s,
      stroke 0.15s;
  }
  .glint {
    fill: var(--border-strong);
    transition: fill 0.15s;
  }

  /* Open: the lid hinges up from the back of the ball. */
  .lid {
    transform-origin: 29px 17px;
    transform: rotate(32deg);
    transition:
      transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.2),
      fill 0.15s,
      stroke 0.15s;
  }

  /* Closed: snaps shut and takes on the Poké Ball colours. */
  .on .lid {
    transform: none;
    fill: var(--ball-top);
    transition:
      transform 0.18s cubic-bezier(0.55, 0, 0.9, 0.5),
      fill 0.12s 0.06s,
      stroke 0.12s;
  }
  .on .base,
  .on .button {
    fill: var(--ball-bottom);
  }
  .on .lid,
  .on .base,
  .on .button {
    stroke: var(--ball-line);
  }
  .on .glint {
    fill: var(--ball-line);
  }

  /* Just caught: a few wobbles on the floor, then the button clicks. */
  .body {
    transform-origin: 16px 30px;
  }
  .caught .body {
    animation: wobble 0.62s 0.18s ease-in-out;
  }
  .caught .glint {
    transform-origin: 16px 17px;
    animation: click 0.3s 0.78s ease-out;
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
    padding: 0.4rem 1rem 0.4rem 0.5rem;
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
    .ball *,
    .on .lid {
      transition: none;
    }
    .caught .body,
    .caught .glint {
      animation: none;
    }
  }
</style>
