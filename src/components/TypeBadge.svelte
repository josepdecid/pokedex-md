<script lang="ts">
  import { i18n } from '../i18n/i18n.svelte.ts';

  let { type }: { type: string } = $props();
</script>

<span class="type" style:--type-color="var(--type-{type}, var(--muted))">{i18n.name('type', type)}</span>

<style>
  .type {
    display: inline-block;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: #fff;
    background: var(--type-color);
    text-shadow: 0 1px 1px rgb(0 0 0 / 0.25);
    white-space: nowrap;
  }
</style>
