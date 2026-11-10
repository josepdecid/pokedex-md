<script lang="ts">
  import type { Snippet } from 'svelte';
  import { settings } from '../lib/settings.svelte.ts';

  // A titled section with a count that the user can collapse. Collapsed sections are
  // remembered (settings) under `collapseKey`, so they stay closed after opening an item.
  let {
    title,
    count,
    collapseKey,
    children,
  }: { title: string; count: number; collapseKey: string; children: Snippet } = $props();
</script>

<details
  class="section"
  open={!settings.isCollapsed(collapseKey)}
  ontoggle={(e) => settings.setCollapsed(collapseKey, !e.currentTarget.open)}
>
  <summary>
    <h2>{title} <span class="count">{count}</span></h2>
    <svg class="chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
      <path d="M1 1.5l5 5 5-5" />
    </svg>
  </summary>
  {@render children()}
</details>

<style>
  .section + :global(.section) {
    margin-top: 1rem;
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 44px;
    margin-bottom: 0.25rem;
    list-style: none;
    cursor: pointer;
    border-radius: 8px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary h2 {
    margin: 0;
  }
  .chevron {
    flex: none;
    margin-right: 0.5rem;
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.2s;
  }
  .section:not([open]) .chevron {
    transform: rotate(-90deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
  .count {
    margin-left: 0.25rem;
    color: var(--muted);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>
