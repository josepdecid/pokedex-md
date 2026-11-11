<script lang="ts">
  import EntryName from '../components/EntryName.svelte';
  import MethodIcon from '../components/MethodIcon.svelte';
  import Portrait from '../components/Portrait.svelte';
  import RecruitToggle from '../components/RecruitToggle.svelte';
  import TypeBadge from '../components/TypeBadge.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { dexLabel } from '../lib/format.ts';
  import { formatFloors, formatRate } from '../lib/obtain.ts';
  import { paths, router } from '../lib/router.svelte.ts';
  import type { Evolution, Obtain } from '../lib/game-data.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session, id }: { session: GameSession; id: string } = $props();

  const entry = $derived(session.entryById.get(id));
  const index = $derived(entry ? session.data.pokemon.indexOf(entry) : -1);
  const prev = $derived(index > 0 ? session.data.pokemon[index - 1] : undefined);
  const next = $derived(index >= 0 ? session.data.pokemon[index + 1] : undefined);

  const EVOLVE = 'evolve';
  /** Each section of "How to get it", with its obtain entries in dungeon unlock order (no dungeon last). */
  const sections = $derived.by(() => {
    if (!entry) return [];
    const order = (o: Obtain) => (o.dungeon ? (session.dungeonById.get(o.dungeon)?.order ?? 0) : Infinity);
    return session.data.sections.map((id) => {
      const methods = session.data.methods.filter((m) => m.section === id).map((m) => m.id);
      const items = entry.obtain.filter((o) => methods.includes(o.method)).sort((a, b) => order(a) - order(b));
      // The section's first method is its default (plain "Recruit in dungeon"), so only the others get a note.
      const empty = id === EVOLVE ? !entry.evolvesFrom : items.length === 0;
      // Evolve has its own icon; the others use their default method's.
      const icon = id === EVOLVE ? session.data.evolveIcon : session.methodById.get(methods[0]!)?.icon;
      return { id, items, empty, defaultMethod: methods[0], icon };
    }).filter((s) => !(entry.shiny && s.empty)); // A Shiny one lists only how it shows up.
  });
  const evolvesFrom = $derived(entry?.evolvesFrom ? session.entryById.get(entry.evolvesFrom.from) : undefined);

  function requirement({ level, item, count = 1 }: Evolution): string {
    const parts: string[] = [];
    if (level !== undefined) parts.push(t('pokemon.evolveLevel', { level }));
    if (item) parts.push(count === 1 ? i18n.name('item', item) : t('pokemon.evolveItem', { count, item: i18n.name('item', item) }));
    return parts.join(' + ');
  }
</script>

<div class="back-bar">
  <a class="back" href={paths.pokedex(session.id)}>‹ {t('pokemon.back')}</a>
</div>

{#if entry}
  <article class="card">
    <header>
      <Portrait entryId={entry.id} portrait={entry.portrait} size={120} />
      <div class="heading">
        <span class="dex">{dexLabel(entry.dex)}</span>
        <h1 style:view-transition-name={router.morphId === entry.id ? 'pokemon-name' : undefined}><EntryName {entry} /></h1>
        <div class="types">
          {#each entry.types as type (type)}<TypeBadge {type} />{/each}
        </div>
      </div>
    </header>

    <p class="lives">
      <span class="muted">{t('pokemon.camp')}</span>
      <a href={paths.camp(session.id, entry.camp)}>{i18n.name('camp', entry.camp)}</a>
    </p>

    <RecruitToggle {entry} {session} large />

    <section class="obtain">
      <h2>{t('pokemon.obtain')}</h2>
      {#each sections as section (section.id)}
        <section>
          <h3>
            {#if section.icon}<img src={`${import.meta.env.BASE_URL}${section.icon}`} alt="" width="18" height="18" />{/if}
            {i18n.name('section', section.id)}
          </h3>
          {#if !section.empty}
            <ul class="facts">
              {#if section.id === EVOLVE && entry.evolvesFrom}
                <li>
                  <a class="from" href={paths.pokemon(session.id, entry.evolvesFrom.from)}>
                    {#if evolvesFrom}<Portrait entryId={evolvesFrom.id} portrait={evolvesFrom.portrait} size={32} />{/if}
                    {evolvesFrom ? i18n.entryName(evolvesFrom) : entry.evolvesFrom.from}
                  </a>
                  <span class="label">{requirement(entry.evolvesFrom)}</span>
                </li>
              {/if}
              {#each section.items as o, i (i)}
                <!-- The section's default method (plain "Recruit in dungeon") needs no icon. -->
                {@const showIcon = !!o.dungeon && o.method !== section.defaultMethod}
                <li>
                  {#if o.dungeon}
                    <a href={paths.dungeon(session.id, o.dungeon)}>{i18n.name('dungeon', o.dungeon)}</a>
                  {:else if session.methodById.get(o.method)?.dungeon === 'any'}
                    <span class="where">
                      <span>{t('obtain.anyDungeon')}</span>
                      <small class="label">{i18n.name('method', o.method)}</small>
                    </span>
                  {:else}
                    <span>{i18n.name('method', o.method)}</span>
                  {/if}
                  <span class="details">
                    {#if showIcon}<MethodIcon method={o.method} icon={session.methodById.get(o.method)?.icon} />{/if}
                    {#if o.floors}<span>{formatFloors(o.floors)}</span>{/if}
                    {#if o.level !== undefined}<span>{t('obtain.level', { level: o.level })}</span>{/if}
                    {#if o.rate !== undefined}
                      <span class="rate" class:blocked={o.rate < 0} title={t('obtain.rateLabel')}>
                        {t('obtain.rateShort', { rate: formatRate(o.rate) })}
                      </span>
                    {/if}
                  </span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted">{i18n.name('section-none', section.id)}</p>
          {/if}
        </section>
      {/each}
    </section>
  </article>

  <nav class="pager" aria-label="{t('pokemon.prev')} / {t('pokemon.next')}">
    {#if prev}
      <a href={paths.pokemon(session.id, prev.id)} rel="prev">
        <small>‹ {t('pokemon.prev')}</small><span><EntryName entry={prev} /></span>
      </a>
    {:else}<span></span>{/if}
    {#if next}
      <a href={paths.pokemon(session.id, next.id)} rel="next" class="next">
        <small>{t('pokemon.next')} ›</small><span><EntryName entry={next} /></span>
      </a>
    {/if}
  </nav>
{:else}
  <p class="muted">{t('pokemon.notFound')}</p>
{/if}

<style>
  /* Full-bleed over .page's gutter, so the card doesn't show beside it as it scrolls under. */
  .back-bar {
    margin: 0 -16px var(--back-fade);
    padding: 0 16px;
    background: var(--bg);
    --back-fade: 0.5rem;
  }
  /* Stays on screen while the page scrolls; not on short screens (phones in landscape). */
  @media (min-height: 480px) {
    .back-bar {
      position: sticky;
      top: var(--topbar-h);
      z-index: 5;
      /* Browsers floor the topbar's border to whole device pixels, leaving it a fraction short
         of --topbar-h on fractional-density screens. Reaches behind it to close that gap. */
      box-shadow: 0 -1px var(--bg);
    }
    /* Content fades out as it scrolls under. Fills the margin below, so it's invisible at rest. */
    .back-bar::after {
      content: '';
      position: absolute;
      inset: 100% 0 auto;
      height: var(--back-fade);
      background: linear-gradient(var(--bg), transparent);
      pointer-events: none;
    }
  }
  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .heading {
    min-width: 0;
    display: grid;
    gap: 0.35rem;
    justify-items: start;
  }
  .dex {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  h1 {
    margin: 0;
    font-size: 1.8rem;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .types {
    display: flex;
    gap: 0.35rem;
  }
  .facts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .lives {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem;
  }
  .obtain {
    gap: 1rem;
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text);
  }
  h3 img {
    object-fit: contain;
  }
  .facts li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    background: var(--surface-2);
  }
  .label {
    color: var(--muted);
  }
  .where {
    display: grid;
    gap: 0.1rem;
  }
  .details {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  .details > span + span::before {
    content: '·';
    padding: 0 0.4em;
    font-weight: 400;
    opacity: 0.7;
  }
  .details > :global(.method-icon) {
    margin-right: 0.4em;
  }
  .rate {
    font-weight: 600;
    color: var(--text);
  }
  .rate.blocked {
    color: var(--danger);
  }
  .from {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .pager {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    margin-top: 1rem;
  }
  .pager a {
    display: grid;
    gap: 0.1rem;
    padding: 0.7rem 0.85rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pager small {
    color: var(--muted);
    font-weight: 500;
  }
  .pager .next {
    text-align: right;
  }
</style>
