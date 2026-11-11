import { i18n, t } from '../i18n/i18n.svelte.ts';
import type { Obtain } from './game-data.ts';

/** "Floor 5" or "Floors 2–14, 16–24". */
export function formatFloors(floors: string): string {
  return t(/[-,]/.test(floors) ? 'obtain.floors' : 'obtain.floor', { floors: floors.replace(/-/g, '–') });
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
