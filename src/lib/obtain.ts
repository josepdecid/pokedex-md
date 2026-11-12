import { i18n, t } from '../i18n/i18n.svelte.ts';
import type { Dungeon, Obtain } from './game-data.ts';

/**
 * The number the game shows for a dungeon's nth floor (n counts from 1, the first floor): going up
 * from the ground floor, 0, 1, 2...; going down, -1, -2, -3... Unknown dungeons count from 1.
 */
export function floorNumber(n: number, dungeon: Dungeon | undefined): number {
  if (!dungeon) return n;
  return dungeon.basement ? -n : n - 1;
}

/** A floor number with the language's short label: "F8", "F-3" ("P8" in Spanish). */
const floorLabel = (n: number) => t('floor.short', { floor: n });

/** A dungeon's last floor ("F8", "F-3"), or undefined when its floors aren't fixed. */
export function lastFloor(dungeon: Dungeon | undefined): string | undefined {
  return dungeon?.floors ? floorLabel(floorNumber(dungeon.floors, dungeon)) : undefined;
}

/**
 * "Floor 5" or "Floors 1..13, 15, 16" ("Pisos 1..13" in Spanish), numbered like the game: `floors`
 * counts from 1, the first floor of `dungeon`, so in a dungeon that goes up from the ground floor "1-3"
 * is "Floors 0..2", and in one that goes down it's "Floors -1..-3". A range of just two floors is
 * listed: "4-5" is "Floors 3, 4".
 */
export function formatFloors(floors: string, dungeon: Dungeon | undefined): string {
  const ranges = floors.split(/,\s*/).map((range) => {
    const [from, to = from] = range.split('-').map((n) => parseInt(n, 10));
    const [a, b] = [floorNumber(from!, dungeon), floorNumber(to!, dungeon)];
    if (from === to) return String(a);
    return to! - from! === 1 ? `${a}, ${b}` : `${a}..${b}`;
  });
  return t(/[-,]/.test(floors) ? 'obtain.floors' : 'obtain.floor', { floors: ranges.join(', ') });
}

/** A recruit rate as a locale number, without the "%". */
export function formatRate(rate: number): string {
  return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(rate);
}

/** Lowest floor in an obtain's `floors` ("2-14, 16-24" -> 2), or Infinity when they aren't known. */
export function firstFloor(o: Obtain): number {
  const n = parseInt(o.floors ?? '', 10);
  return Number.isNaN(n) ? Infinity : n;
}
