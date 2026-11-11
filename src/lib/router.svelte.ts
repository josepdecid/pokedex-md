import { tick } from 'svelte';
import { DEFAULT_GAME_ID, gameInfo, isGameId } from '../games/registry.ts';

// Hash-based routes, so GitHub Pages needs no server-side rewrites.
// Every route is prefixed with the game id: #/dx, #/dx/pokemon/pikachu, ...

export type Route =
  | { name: 'pokedex'; gameId: string }
  | { name: 'pokemon'; gameId: string; id: string }
  | { name: 'dungeons'; gameId: string }
  | { name: 'dungeon'; gameId: string; id: string }
  | { name: 'camps'; gameId: string }
  | { name: 'camp'; gameId: string; id: string }
  | { name: 'rescues'; gameId: string }
  | { name: 'settings'; gameId: string }
  | { name: 'not-found'; gameId: string };

export function parseHash(hash: string): Route | null {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [gameId, section, id, ...rest] = parts;
  if (!gameId) return null; // caller redirects to the default game
  if (!isGameId(gameId)) return { name: 'not-found', gameId: DEFAULT_GAME_ID };
  if (rest.length) return { name: 'not-found', gameId };
  switch (section) {
    case undefined:
      return { name: 'pokedex', gameId };
    case 'pokemon':
      return id ? { name: 'pokemon', gameId, id } : { name: 'pokedex', gameId };
    case 'dungeons':
      return id ? { name: 'dungeon', gameId, id } : { name: 'dungeons', gameId };
    case 'camps':
      return id ? { name: 'camp', gameId, id } : { name: 'camps', gameId };
    case 'rescues':
      return id || !gameInfo(gameId)?.rescue ? { name: 'not-found', gameId } : { name: 'rescues', gameId };
    case 'settings':
      return id ? { name: 'not-found', gameId } : { name: 'settings', gameId };
    default:
      return { name: 'not-found', gameId };
  }
}

const enc = encodeURIComponent;
export const paths = {
  pokedex: (g: string) => `#/${enc(g)}`,
  pokemon: (g: string, id: string) => `#/${enc(g)}/pokemon/${enc(id)}`,
  dungeons: (g: string) => `#/${enc(g)}/dungeons`,
  dungeon: (g: string, id: string) => `#/${enc(g)}/dungeons/${enc(id)}`,
  camps: (g: string) => `#/${enc(g)}/camps`,
  camp: (g: string, id: string) => `#/${enc(g)}/camps/${enc(id)}`,
  rescues: (g: string) => `#/${enc(g)}/rescues`,
  settings: (g: string) => `#/${enc(g)}/settings`,
};

/**
 * The Pokémon whose portrait and name morph between two pages: going from any list
 * into a Pokémon page, or back out of it. Moving between two Pokémon pages just crossfades.
 */
export function sharedEntry(from: Route | null, to: Route): string | null {
  if (!from) return null;
  if (to.name === 'pokemon' && from.name !== 'pokemon') return to.id;
  if (from.name === 'pokemon' && to.name !== 'pokemon') return from.id;
  return null;
}

/** The id shown on both pages when moving between a list and one of its items, either way. */
function sharedItem(list: 'camps' | 'dungeons', item: 'camp' | 'dungeon', from: Route | null, to: Route): string | null {
  if (from?.name === list && to.name === item) return to.id;
  if (from?.name === item && to.name === list) return from.id;
  return null;
}

/** The camp whose artwork and name morph between the camp list and its page, either way. */
export const sharedCamp = (from: Route | null, to: Route) => sharedItem('camps', 'camp', from, to);

/** The dungeon whose artwork and name morph between the dungeon list and its page, either way. */
export const sharedDungeon = (from: Route | null, to: Route) => sharedItem('dungeons', 'dungeon', from, to);

const canAnimate = () =>
  typeof document.startViewTransition === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Wait (briefly) for morphing images to decode, so the new snapshot isn't captured blank. */
async function morphImagesReady(): Promise<void> {
  const images = [...document.querySelectorAll<HTMLImageElement>('img[data-morph]')];
  const timeout = new Promise((resolve) => setTimeout(resolve, 150));
  await Promise.race([Promise.all(images.map((img) => img.decode().catch(() => undefined))), timeout]);
}

class Router {
  route = $state<Route>({ name: 'pokedex', gameId: DEFAULT_GAME_ID });
  /** Entry id whose portrait/name carry a view-transition-name right now (see sharedEntry). */
  morphId = $state<string | null>(null);
  /** Camp id whose artwork/name carry a view-transition-name right now (see sharedCamp). */
  morphCampId = $state<string | null>(null);
  /** Dungeon id whose artwork/name carry a view-transition-name right now (see sharedDungeon). */
  morphDungeonId = $state<string | null>(null);
  #scroll = new Map<string, number>();
  #current = '';

  start(): void {
    const sync = () => {
      const parsed = parseHash(location.hash);
      if (!parsed) {
        history.replaceState(null, '', paths.pokedex(DEFAULT_GAME_ID));
        void this.#apply(paths.pokedex(DEFAULT_GAME_ID), { name: 'pokedex', gameId: DEFAULT_GAME_ID });
        return;
      }
      void this.#apply(location.hash, parsed);
    };
    window.addEventListener('hashchange', sync);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    sync();
  }

  async #apply(hash: string, route: Route): Promise<void> {
    const from = this.#current ? this.route : null;
    if (this.#current) this.#scroll.set(this.#current, window.scrollY);
    this.#current = hash;
    // Pages visited before (e.g. the list, when coming back from a Pokémon) reopen where they were left.
    const y = this.#scroll.get(hash) ?? 0;
    const update = async () => {
      this.route = route;
      await tick();
      window.scrollTo(0, y);
    };

    if (!from || !canAnimate()) {
      this.morphId = null;
      this.morphCampId = null;
      this.morphDungeonId = null;
      await update();
      return;
    }

    // Name the shared elements on the old page before the browser snapshots it.
    this.morphId = sharedEntry(from, route);
    this.morphCampId = sharedCamp(from, route);
    this.morphDungeonId = sharedDungeon(from, route);
    await tick();
    const transition = document.startViewTransition(async () => {
      await update();
      if (this.morphId || this.morphCampId || this.morphDungeonId) await morphImagesReady();
    });
    transition.finished.finally(() => {
      if (this.#current !== hash) return;
      this.morphId = null;
      this.morphCampId = null;
      this.morphDungeonId = null;
    });
  }
}

export const router = new Router();
