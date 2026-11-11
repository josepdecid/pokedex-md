<script lang="ts">
  import { untrack } from 'svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import ProgressBar from './components/ProgressBar.svelte';
  import { i18n, t } from './i18n/i18n.svelte.ts';
  import { pickLocale } from './i18n/locales.ts';
  import { gameInfo } from './games/registry.ts';
  import { loadGame } from './lib/data.ts';
  import { install } from './lib/install.svelte.ts';
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
  import Rescues from './routes/Rescues.svelte';
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
    { id: 'pokedex', href: paths.pokedex(gameId), label: t('nav.pokedex') },
    { id: 'dungeons', href: paths.dungeons(gameId), label: t('nav.dungeons') },
    { id: 'camps', href: paths.camps(gameId), label: t('nav.camps') },
    ...(gameInfo(gameId)?.rescue ? [{ id: 'rescues', href: paths.rescues(gameId), label: t('nav.rescues') }] : []),
    { id: 'settings', href: paths.settings(gameId), label: t('nav.settings') },
  ]);

  $effect(() => {
    document.title = t('app.name');
  });

  // Suggest installing once someone is clearly using the app, not on their first visit.
  // The count is read when the Pokédex opens (untracked), so the banner never appears mid-list
  // and pushes rows away while someone is ticking them off.
  const INSTALL_BANNER_AFTER = 3; // recruited Pokémon
  const showInstallBanner = $derived(
    route.name === 'pokedex' &&
      install.method !== null &&
      !settings.installBannerDismissed &&
      session !== null &&
      untrack(() => session!.recruitedCount) >= INSTALL_BANNER_AFTER,
  );
</script>

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href={paths.pokedex(gameId)}>
      <img class="brand-logo" src="{import.meta.env.BASE_URL}logos/pokemon.webp" alt="" height="48" />
      <h1 class="visually-hidden">{t('app.name')}</h1>
    </a>
    {#if session}
      <div class="topbar-progress">
        <p class="topbar-game">{i18n.name('game', 'short')}</p>
        <ProgressBar
          done={session.recruitedCount}
          total={session.data.pokemon.length}
          label={t('progress.label', { done: session.recruitedCount, total: session.data.pokemon.length })}
          percent
        />
      </div>
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
    {#if showInstallBanner}<InstallBanner />{/if}
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
  {:else if route.name === 'rescues'}
    <Rescues {session} />
  {:else if route.name === 'settings'}
    <Settings {session} />
  {:else}
    <NotFound {gameId} />
  {/if}
</main>

<nav class="tabbar" aria-label={t('nav.label')} style:--tabs={tabs.length}>
  {#each tabs as tab (tab.id)}
    <a href={tab.href} aria-current={section === tab.id ? 'page' : undefined}>
      <img src={`${import.meta.env.BASE_URL}icons/${gameId}/${tab.id}.webp`} alt="" width="151" height="96" />
      <span>{tab.label}</span>
    </a>
  {/each}
</nav>
