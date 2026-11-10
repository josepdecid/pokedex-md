<script lang="ts">
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import type { PokemonEntry } from '../lib/game-data.ts';

  // A checklist entry's name, with the Shiny icon after it for a Shiny one.
  let { entry }: { entry: PokemonEntry } = $props();
</script>

{i18n.entryName(entry)}{#if entry.shiny}<img
    class="shiny"
    src={`${import.meta.env.BASE_URL}icons/shiny.webp`}
    alt={t('pokemon.shiny')}
    title={t('pokemon.shiny')}
    width="64"
    height="64"
  />{/if}

<style>
  .shiny {
    width: 0.9em;
    height: 0.9em;
    margin-left: 0.25em;
    vertical-align: -0.05em;
  }
</style>
