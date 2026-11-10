import { i18n, t } from '../i18n/i18n.svelte.ts';
import type { Obtain } from './game-data.ts';

/** "Floors 8–9 · Lv. 14 · 14.4% recruit rate", with whatever is known. */
export function obtainDetails(o: Obtain): string {
  const parts: string[] = [];
  if (o.floors) {
    const floors = o.floors.replace(/-/g, '–');
    parts.push(t(/[-,]/.test(o.floors) ? 'obtain.floors' : 'obtain.floor', { floors }));
  }
  if (o.level !== undefined) parts.push(t('obtain.level', { level: o.level }));
  if (o.rate !== undefined) {
    const rate = new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(o.rate);
    parts.push(t('obtain.rate', { rate }));
  }
  return parts.join(' · ');
}
