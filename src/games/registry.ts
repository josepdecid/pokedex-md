// Games the app knows about. Only DX is shipped for now, so there is no game
// picker in the UI, but routes, storage keys and data are already per game.

export interface GameInfo {
  /** Matches the folder in data/games/ and the prefix in routes and storage keys. */
  id: string;
}

export const GAMES: readonly GameInfo[] = [{ id: 'dx' }];

export const DEFAULT_GAME_ID = 'dx';

export const isGameId = (id: string | undefined): id is string => GAMES.some((g) => g.id === id);
