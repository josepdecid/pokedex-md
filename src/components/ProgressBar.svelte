<script lang="ts">
  let { done, total, label }: { done: number; total: number; label: string } = $props();
  // Nothing to do (0/0) is done: a full bar.
  const pct = $derived(total ? Math.round((done / total) * 100) : 100);
</script>

<div class="progress" role="img" aria-label={label}>
  <div class="track"><div class="fill" style:width="{pct}%"></div></div>
  <span class="count" aria-hidden="true">{done}/{total}</span>
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
