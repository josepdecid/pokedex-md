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

/** "Floors 8–9 · Lv. 14 · 14.4% recruit rate", with whatever is known. */
export function obtainDetails(o: Obtain): string {
  const parts: string[] = [];
  if (o.floors) parts.push(formatFloors(o.floors));
  if (o.level !== undefined) parts.push(t('obtain.level', { level: o.level }));
  if (o.rate !== undefined) parts.push(t('obtain.rate', { rate: formatRate(o.rate) }));
  return parts.join(' · ');
}
