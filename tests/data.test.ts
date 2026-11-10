import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildData, DataError } from '../scripts/build-data.ts';

const DATA = resolve(__dirname, '../data');
const PORTRAITS = resolve(__dirname, '../public/portraits');

describe('shipped data', () => {
  const result = buildData(DATA);
  const dx = result.games.find((g) => g.id === 'dx')!;

  it('builds DX', () => {
    expect(dx.pokemon.length).toBeGreaterThan(400);
    expect(dx.dungeons[0]).toEqual({ id: 'tiny-woods', order: 1 });
  });

  it('has an English name for everything it references', () => {
    const names = result.dictionaries.dx!.en!;
    for (const e of dx.pokemon) expect(names[`species.${e.species}`], e.id).toBeTruthy();
    expect(names['dungeon.mt-steel']).toBe('Mt. Steel');
  });

  it('has a credited portrait for every Pokémon', () => {
    for (const e of dx.pokemon) expect(dx.portraitCredits[e.species]?.length, e.id).toBeGreaterThan(0);
  });

  it('has a Spanish name for everything, with Pokémon names kept in English', () => {
    const es = result.dictionaries.dx!.es!;
    expect(result.warnings.filter((w) => w.startsWith('locales/es'))).toEqual([]);
    expect(es['species.pikachu']).toBe('Pikachu');
    expect(es['dungeon.murky-cave']).toBe('Cueva Tenebrosa');
    expect(es['camp.gourd-swamp']).toBe('Ciénaga Calabaza');
  });

  it('keeps entries in National Dex order', () => {
    const dex = dx.pokemon.map((e) => e.dex);
    expect(dex).toEqual([...dex].sort((a, b) => a - b));
  });
});

describe('validation', () => {
  const copy = () => {
    const dir = mkdtempSync(join(tmpdir(), 'pokedex-md-'));
    cpSync(DATA, dir, { recursive: true });
    return dir;
  };

  it('reports unknown references', () => {
    const dir = copy();
    writeFileSync(
      join(dir, 'games/dx/pokemon.yaml'),
      '- id: pikachu\n  types: [electric]\n  camp: nowhere\n  obtain:\n    - { method: dungeon, dungeon: atlantis }\n',
    );
    expect(() => buildData(dir, PORTRAITS)).toThrow(DataError);
    try {
      buildData(dir, PORTRAITS);
    } catch (err) {
      const problems = (err as DataError).problems.join('\n');
      expect(problems).toContain('unknown camp "nowhere"');
      expect(problems).toContain('unknown dungeon "atlantis"');
    }
  });

  it('lets a game override a shared name and falls back to English for other locales', () => {
    const dir = copy();
    writeFileSync(join(dir, 'locales/en/dx.yaml'), `${'species:\n  pikachu: "Pika Override"\n'}`, { flag: 'a' });
    mkdirSync(join(dir, 'locales/fr'));
    writeFileSync(join(dir, 'locales/fr/shared.yaml'), 'type:\n  fire: "Feu"\n');
    const result = buildData(dir, PORTRAITS);
    expect(result.dictionaries.dx!.en!['species.pikachu']).toBe('Pika Override');
    expect(result.dictionaries.dx!.fr!['type.fire']).toBe('Feu');
    expect(result.dictionaries.dx!.fr!['type.water']).toBe('Water');
    expect(result.warnings.some((w) => w.startsWith('locales/fr: ') && w.includes('fall back to English'))).toBe(true);
  });

  it('does not warn about kinds a locale marks as `english`', () => {
    const dir = copy();
    mkdirSync(join(dir, 'locales/fr'));
    cpSync(join(dir, 'locales/es/dx.yaml'), join(dir, 'locales/fr/dx.yaml'));
    writeFileSync(join(dir, 'locales/fr/shared.yaml'), 'type:\n  fire: "Feu"\nspecies: english\n');
    const result = buildData(dir, PORTRAITS);
    const fallback = result.warnings.find((w) => w.startsWith('locales/fr: '));
    // Only the 17 untranslated types fall back; species are English on purpose.
    expect(fallback).toMatch(/^locales\/fr: 17\//);
    expect(result.dictionaries.dx!.fr!['species.pikachu']).toBe('Pikachu');
  });
});
