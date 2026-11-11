<script lang="ts">
  // Search box with a magnifier icon. `label` is its placeholder and accessible name.
  let { value = $bindable(''), label }: { value?: string; label: string } = $props();
</script>

<label class="search">
  <span class="visually-hidden">{label}</span>
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
  <input type="search" bind:value placeholder={label} autocomplete="off" enterkeyhint="search" />
</label>

<style>
  .search {
    position: relative;
    display: block;
    flex: 1;
    min-width: 0;
  }
  svg {
    position: absolute;
    left: 0.8rem;
    top: 50%;
    transform: translateY(-50%);
    fill: none;
    stroke: var(--muted);
    stroke-width: 2;
    stroke-linecap: round;
  }
  input {
    width: 100%;
    padding-left: 2.6rem;
  }
</style>
