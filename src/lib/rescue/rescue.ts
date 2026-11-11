// What a rescue request password says, checked against the game's data.

import type { RescueTable } from '../game-data.ts';
import { decodePassword, teamName, type PasswordSymbol, type RescueRequest } from './dx-password.ts';

export interface RescueInfo {
  request: RescueRequest;
  /** Name of the team that fainted. */
  team: string;
  dungeon: string;
  floor: number;
  /** Entry id of the Pokémon the request shows, or a species id when it isn't a checklist entry. */
  pokemon: string;
  /** When the request was made. */
  date: Date;
}

export type RescueResult =
  | { ok: true; info: RescueInfo }
  /** `invalid`: not a password (a symbol is wrong). `revival`: an A-OK password, not a rescue request. */
  | { ok: false; error: 'invalid' | 'revival' };

/**
 * Reads a rescue request. Besides the checksum, everything in it has to make sense (a real
 * dungeon, floor and Pokémon, a team name followed only by padding), which rules out nearly every
 * misread password that happens to pass the checksum.
 */
export function readRescue(password: readonly PasswordSymbol[], table: RescueTable): RescueResult {
  const decoded = decodePassword(password);
  if (!decoded) return { ok: false, error: 'invalid' };
  if (decoded.kind === 'revival') return { ok: false, error: 'revival' };
  const team = teamName(decoded.team);
  const end = decoded.team.indexOf(0);
  const padded = end < 0 || decoded.team.slice(end).every((c) => c === 0);
  const dungeon = table.dungeons[decoded.dungeon];
  const pokemon = table.pokemon[decoded.pokemon];
  if (!team || !padded || !dungeon || !pokemon || decoded.floor < 1 || decoded.floor > dungeon.floors) {
    return { ok: false, error: 'invalid' };
  }
  return {
    ok: true,
    info: {
      request: decoded,
      team,
      dungeon: dungeon.id,
      floor: decoded.floor,
      pokemon,
      date: new Date(decoded.timestamp * 1000),
    },
  };
}
