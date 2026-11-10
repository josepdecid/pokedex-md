<script lang="ts">
  import { i18n } from '../i18n/i18n.svelte.ts';

  // `count: false` hides the "done/total" text, for places that show it elsewhere.
  // `percent` adds the percentage after it, e.g. "12/473 (2%)".
  let {
    done,
    total,
    label,
    count = true,
    percent = false,
  }: { done: number; total: number; label: string; count?: boolean; percent?: boolean } = $props();
  // Nothing to do (0/0) is done: a full bar.
  const pct = $derived(total ? Math.round((done / total) * 100) : 100);
  // Rounded down so 100% only shows when it's all done, and formatted for the UI language ("2 %" in Spanish).
  const percentText = $derived(
    new Intl.NumberFormat(i18n.locale, { style: 'percent' }).format(total ? Math.floor((done / total) * 100) / 100 : 1),
  );
</script>

<div class="progress" role="img" aria-label={label}>
  <div class="track"><div class="fill" style:width="{pct}%"></div></div>
  {#if count}<span class="count" aria-hidden="true">{done}/{total}{#if percent}&nbsp;({percentText}){/if}</span>{/if}
</div>

<style>
  .progress {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .track {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: var(--track);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width 0.2s;
  }
  .count {
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
  }
</style>
