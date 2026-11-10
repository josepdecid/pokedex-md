<script lang="ts">
  import ProgressBar from './components/ProgressBar.svelte';
  import { i18n, t } from './i18n/i18n.svelte.ts';
  import { pickLocale } from './i18n/locales.ts';
  import { loadGame } from './lib/data.ts';
  import { ProgressStore } from './lib/progress.svelte.ts';
  import { paths, router } from './lib/router.svelte.ts';
  import { GameSession } from './lib/session.svelte.ts';
  import { settings } from './lib/settings.svelte.ts';
  import Camp from './routes/Camp.svelte';
  import Camps from './routes/Camps.svelte';
  import Dungeon from './routes/Dungeon.svelte';
  import Dungeons from './routes/Dungeons.svelte';
  import NotFound from './routes/NotFound.svelte';
  import Pokedex from './routes/Pokedex.svelte';
  import Pokemon from './routes/Pokemon.svelte';
  import Settings from './routes/Settings.svelte';

  let session = $state.raw<GameSession | null>(null);
  let failed = $state(false);

  const route = $derived(router.route);
  const gameId = $derived(route.gameId);

  async function open(id: string) {
    failed = false;
    try {
      await settings.load();
      const data = await loadGame(id);
      await i18n.load(settings.locale ?? pickLocale(navigator.languages), id);
      const progress = new ProgressStore(id, data.idAliases);
      await progress.load();
      session = new GameSession(data, progress);
    } catch (err) {
      console.error(err);
      failed = true;
    }
  }

  $effect(() => {
    if (session?.id !== gameId) void open(gameId);
  });

  const section = $derived(
    route.name === 'pokemon' ? 'pokedex' : route.name === 'dungeon' ? 'dungeons' : route.name === 'camp' ? 'camps' : route.name,
  );
  const tabs = $derived([
    { id: 'pokedex', href: paths.pokedex(gameId), label: t('nav.pokedex'), icon: 'M4 6h16M4 12h16M4 18h10' },
    { id: 'dungeons', href: paths.dungeons(gameId), label: t('nav.dungeons'), icon: 'M4 20h4v-4h4v-4h4V8h4' },
    { id: 'camps', href: paths.camps(gameId), label: t('nav.camps'), icon: 'M3 20L12 5l9 15zM12 20v-5' },
    { id: 'settings', href: paths.settings(gameId), label: t('nav.settings'), icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1' },
  ] as const);

  $effect(() => {
    document.title = t('app.name');
  });
</script>

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href={paths.pokedex(gameId)}>
      <span class="brand-name">{t('app.name')}</span>
      {#if session}<span class="brand-game">{i18n.name('game', 'short')}</span>{/if}
    </a>
    {#if session}
      <ProgressBar
        done={session.recruitedCount}
        total={session.data.pokemon.length}
        label={t('progress.label', { done: session.recruitedCount, total: session.data.pokemon.length })}
      />
    {/if}
  </div>
</header>

<main class="page">
  {#if failed}
    <div class="center">
      <p>{t('app.loadError')}</p>
      <button type="button" class="button primary" onclick={() => open(gameId)}>{t('app.retry')}</button>
    </div>
  {:else if !session}
    <p class="center muted">{t('app.loading')}</p>
  {:else if route.name === 'pokedex'}
    <Pokedex {session} />
  {:else if route.name === 'pokemon'}
    {#key route.id}<Pokemon {session} id={route.id} />{/key}
  {:else if route.name === 'dungeons'}
    <Dungeons {session} />
  {:else if route.name === 'dungeon'}
    <Dungeon {session} id={route.id} />
  {:else if route.name === 'camps'}
    <Camps {session} />
  {:else if route.name === 'camp'}
    <Camp {session} id={route.id} />
  {:else if route.name === 'settings'}
    <Settings {session} />
  {:else}
    <NotFound {gameId} />
  {/if}
</main>

<nav class="tabbar" aria-label={t('nav.label')}>
  {#each tabs as tab (tab.id)}
    <a href={tab.href} aria-current={section === tab.id ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d={tab.icon} /></svg>
      <span>{tab.label}</span>
    </a>
  {/each}
</nav>
