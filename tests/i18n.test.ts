import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/ui/en.ts';
import { LOCALES, pickLocale } from '../src/i18n/locales.ts';
import { normalize } from '../src/i18n/i18n.svelte.ts';

describe('normalize', () => {
  it('ignores case and accents', () => {
    expect(normalize('Salamèche')).toBe(normalize('salameche'));
  });

  it('finds katakana names from hiragana and full-width characters', () => {
    expect(normalize('フシギダネ')).toContain(normalize('ふしぎ'));
    expect(normalize('ポリゴン２')).toBe(normalize('ぽりごん2'));
  });
});

describe('pickLocale', () => {
  it('matches a regional browser language to its base language', () => {
    expect(pickLocale(['fr-CA'])).toBe('fr');
    expect(pickLocale(['de-AT'])).toBe('de');
    expect(pickLocale(['it-IT'])).toBe('it');
    expect(pickLocale(['ja-JP'])).toBe('ja');
  });
});

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
