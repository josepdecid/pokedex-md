import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/ui/en.ts';
import { LOCALES } from '../src/i18n/locales.ts';

describe('UI locales', () => {
  for (const locale of LOCALES.filter((l) => l.code !== 'en')) {
    it(`${locale.code} translates every UI string and keeps its {params}`, async () => {
      const ui = await locale.load();
      const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(ui[key], key).toBeTruthy();
        expect(params(ui[key]!), key).toEqual(params(en[key]));
      }
    });
  }
});
