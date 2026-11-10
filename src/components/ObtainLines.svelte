<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import type { Obtain, ObtainMethod } from '../lib/game-data.ts';
  import { formatFloors, formatRate } from '../lib/obtain.ts';
  import MethodIcon from './MethodIcon.svelte';

  // One line per way of getting a Pokémon in a dungeon: method icon, then
  // floors · level · recruit rate, with whatever is known.
  let { obtains, methods }: { obtains: readonly Obtain[]; methods: ReadonlyMap<string, ObtainMethod> } = $props();
</script>

<ul class="obtains">
  {#each obtains as o, i (i)}
    <li>
      <MethodIcon method={o.method} icon={methods.get(o.method)?.icon} />
      <span class="facts">
        {#if o.floors}<span class="floors">{formatFloors(o.floors)}</span>{/if}
        {#if o.level !== undefined}<span>{t('obtain.level', { level: o.level })}</span>{/if}
        {#if o.rate !== undefined}
          <span class="rate" class:blocked={o.rate <= 0} title={t('obtain.rateLabel')}>
            {t('obtain.rateShort', { rate: formatRate(o.rate) })}
          </span>
        {/if}
      </span>
    </li>
  {/each}
</ul>

<style>
  .obtains {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.15rem;
    font-size: 0.78rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    min-width: 0;
  }
  .facts > span {
    white-space: nowrap;
  }
  .facts > .floors {
    white-space: normal;
  }
  .facts > span + span::before {
    content: '·';
    padding: 0 0.4em;
    color: var(--muted);
    font-weight: 400;
    opacity: 0.7;
  }
  .rate {
    font-weight: 600;
    color: var(--text);
  }
  .rate.blocked {
    color: var(--danger);
  }
</style>
