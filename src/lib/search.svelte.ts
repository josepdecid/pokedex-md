import { i18n, normalize } from '../i18n/i18n.svelte.ts';
import type { PokemonEntry } from './game-data.ts';

/**
 * Whether an entry matches a search box query: part of its name (accents and case ignored),
 * or its dex number when the query is a number (with or without a leading "#").
 * `textOf` gives an entry's normalized label; long lists pass one that reads a cache.
 */
export function entryMatcher(
  query: string,
  textOf: (entry: PokemonEntry) => string = (entry) => normalize(i18n.entryLabel(entry)),
): (entry: PokemonEntry) => boolean {
  const q = normalize(query.trim()).replace(/^#/, '');
  if (!q) return () => true;
  if (/^\d+$/.test(q)) {
    const num = Number(q);
    return (entry) => entry.dex === num || String(entry.dex).startsWith(q);
  }
  return (entry) => textOf(entry).includes(q);
}

/** Whether a name matches a search box query: part of it, accents and case ignored. */
export function nameMatcher(query: string): (name: string) => boolean {
  const q = normalize(query.trim());
  return (name) => !q || normalize(name).includes(q);
}

/** Search box text of the camps and dungeons lists. Module state, so it survives opening one and coming back. */
export const listQueries = $state({ camps: '', dungeons: '' });
