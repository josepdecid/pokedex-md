// Pokédex list filters. Module state, so they survive opening a Pokémon and coming back.

import type { PokemonEntry } from '../lib/game-data.ts';

export type StatusFilter = 'all' | 'missing' | 'recruited';
export type SortOrder = 'family' | 'dex' | 'name';
/** Which Pokémon to list: all of them, one generation (`gen-<n>`), later generations' (`extras`) or the Shiny ones. */
export type GroupFilter = 'all' | `gen-${number}` | 'extras' | 'shiny';

export const filters = $state({
  query: '',
  status: 'all' as StatusFilter,
  type: '',
  group: 'all' as GroupFilter,
  sort: 'family' as SortOrder,
});

// Whether the selects are shown. Hidden by default.
export const filterPanel = $state({ open: false });

export function clearFilters(): void {
  filters.query = '';
  filters.status = 'all';
  filters.type = '';
  filters.group = 'all';
}

// Last National Dex number of each generation the game is about. Later ones are extras.
const GENERATION_ENDS = [151, 251, 386];

/** The groups with at least one entry, in display order. */
export function groupsOf(pokemon: PokemonEntry[]): GroupFilter[] {
  const gens = GENERATION_ENDS.map((_, i): GroupFilter => `gen-${i + 1}`);
  return ['all', ...gens.concat('extras', 'shiny').filter((g) => pokemon.some((e) => inGroup(e, g)))];
}

/** Generations and extras list each Pokémon once; the Shiny ones only show under `all` and `shiny`. */
export function inGroup(entry: PokemonEntry, group: GroupFilter): boolean {
  if (group === 'all') return true;
  if (group === 'shiny') return entry.shiny === true;
  if (entry.shiny) return false;
  const gen = GENERATION_ENDS.findIndex((end) => entry.dex <= end) + 1;
  return group === (gen === 0 ? 'extras' : `gen-${gen}`);
}
