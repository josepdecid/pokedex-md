import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
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
    expect(dx.dungeons[0]).toEqual({ id: 'tiny-woods', order: 1, image: 'dungeons/dx/tiny-woods.webp' });
  });

  it('has an English name for everything it references', () => {
    const names = result.dictionaries.dx!.en!;
    for (const e of dx.pokemon) expect(names[`species.${e.species}`], e.id).toBeTruthy();
    expect(names['dungeon.mt-steel']).toBe('Mt. Steel');
  });

  it('lists camps in unlock order, each with its artwork', () => {
    expect(dx.camps[0]?.id).toBe('wild-plains');
    expect(dx.camps.at(-1)?.id).toBe('enclosed-island');
    for (const c of dx.camps) expect(c.image, c.id).toBe(`camps/dx/${c.id}.webp`);
  });

  it('lists dungeons in unlock order, each with its artwork unless Serebii has none', () => {
    const ids = dx.dungeons.map((d) => d.id);
    expect(ids.at(-1)).toBe('illusory-grotto');
    // Serebii's order: the post-game lake/sea dungeons come before Howling Forest.
    expect(ids.indexOf('far-off-sea')).toBeLessThan(ids.indexOf('howling-forest'));
    const noArtwork = ['rock-path', 'snow-path'];
    for (const d of dx.dungeons) {
      expect(d.image, d.id).toBe(noArtwork.includes(d.id) ? undefined : `dungeons/dx/${d.id}.webp`);
    }
  });

  it('builds the shipped data without warnings', () => {
    expect(result.warnings).toEqual([]);
  });

  it('has a credited portrait for every Pokémon', () => {
    for (const e of dx.pokemon) expect(dx.portraitCredits[e.portrait!]?.length, e.id).toBeGreaterThan(0);
  });

  it('gives each Unown form its own portrait, with A using the species one', () => {
    const portraits = dx.pokemon.filter((e) => e.species === 'unown').map((e) => e.portrait);
    expect(portraits[0]).toBe('unown');
    expect(portraits[1]).toBe('unown-b');
    expect(portraits.at(-1)).toBe('unown-question');
    expect(new Set(portraits).size).toBe(28);
  });

  it('has a Spanish name for everything, with Pokémon names kept in English', () => {
    const es = result.dictionaries.dx!.es!;
    expect(result.warnings.filter((w) => w.startsWith('locales/es'))).toEqual([]);
    expect(es['species.pikachu']).toBe('Pikachu');
    expect(es['dungeon.murky-cave']).toBe('Cueva Tenebrosa');
    expect(es['camp.gourd-swamp']).toBe('Ciénaga Calabaza');
  });

  it('lists every Unown form, in letter order, under one dex number', () => {
    const unown = dx.pokemon.filter((e) => e.species === 'unown');
    const names = result.dictionaries.dx!.en!;
    expect(unown.map((e) => names[`form.${e.form}`]).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ!?');
    expect(new Set(unown.map((e) => e.dex))).toEqual(new Set([201]));
    expect(dx.idAliases.unown).toBe('unown-a');
  });

  it('says how each evolved Pokémon evolves, and only those', () => {
    const byId = new Map(dx.pokemon.map((e) => [e.id, e]));
    expect(byId.get('beedrill')!.evolvesFrom).toEqual({ from: 'kakuna', level: 10 });
    expect(byId.get('machamp')!.evolvesFrom).toEqual({ from: 'machoke', item: 'evolution-crystal', count: 4 });
    expect(byId.get('hitmontop')!.evolvesFrom).toEqual({ from: 'tyrogue', level: 20, item: 'evolution-crystal', count: 2 });
    expect(byId.get('weedle')!.evolvesFrom).toBeUndefined();
    expect(dx.pokemon.filter((e) => e.evolvesFrom).length).toBe(215);
    expect(result.dictionaries.dx!.es!['item.evolution-crystal']).toBe('Evolito');
  });

  it('puts every method in a section and names the Mystery House dungeons', () => {
    expect(dx.sections).toEqual(['recruit', 'evolve', 'mystery-house', 'fainted']);
    for (const m of dx.methods) expect(dx.sections, m.id).toContain(m.section);
    const beedrill = dx.pokemon.find((e) => e.id === 'beedrill')!;
    expect(beedrill.obtain).toContainEqual(expect.objectContaining({ method: 'mystery-house', dungeon: 'silver-trench' }));
    const names = result.dictionaries.dx!.en!;
    for (const s of dx.sections) expect(names[`section-none.${s}`], s).toBeTruthy();
  });

  it('resolves method and evolve icons to files in public/', () => {
    const icon = (id: string) => dx.methods.find((m) => m.id === id)?.icon;
    expect(icon('dungeon')).toBe('icons/dx/band.png');
    expect(icon('mystery-house')).toBe('icons/dx/invitation.png');
    expect(icon('fainted')).toBe('icons/dx/apple.png');
    expect(icon('strong-foe')).toBe('icons/dx/strong-foe.png');
    expect(icon('legendary')).toBeUndefined();
    expect(dx.evolveIcon).toBe('icons/dx/evolution-crystal.png');
    expect(result.warnings.filter((w) => w.includes('icons/'))).toEqual([]);
  });

  it('has floors, level and recruit rate from Bulbapedia, including fainted Pokémon', () => {
    const obtain = (id: string) => dx.pokemon.find((e) => e.id === id)!.obtain;
    expect(obtain('beedrill')).toContainEqual({ method: 'dungeon', dungeon: 'silent-chasm', floors: '8-9', level: 14, rate: 14.4 });
    expect(obtain('gligar')).toContainEqual({ method: 'fainted', dungeon: 'silent-chasm', floors: '2-9', level: 15, rate: 100 });
    expect(obtain('metagross')).toContainEqual({ method: 'strong-foe', dungeon: 'silent-chasm', floors: '6, 8-9', level: 45, rate: -6.4 });
    // Every fainted Pokémon is tied to a dungeon now (Serebii only said "fainted in a dungeon").
    const fainted = dx.pokemon.flatMap((e) => e.obtain).filter((o) => o.method === 'fainted');
    expect(fainted.length).toBeGreaterThan(400);
    for (const o of fainted) expect(o.dungeon).toBeTruthy();
  });

  it('keeps entries in National Dex order', () => {
    const dex = dx.pokemon.map((e) => e.dex);
    expect(dex).toEqual([...dex].sort((a, b) => a - b));
  });

  it('keeps evolution lines together in family order', () => {
    const byFamily = [...dx.pokemon].sort((a, b) => a.familyOrder - b.familyOrder).map((e) => e.species);
    const run = (...ids: string[]) => {
      const start = byFamily.indexOf(ids[0]!);
      expect(byFamily.slice(start, start + ids.length)).toEqual(ids);
      return start;
    };
    expect(byFamily[0]).toBe('bulbasaur');
    // A line sits where its lowest-numbered member would: Elekid's line between Mr. Mime and Jynx's.
    expect(run('elekid', 'electabuzz', 'electivire')).toBeGreaterThan(byFamily.indexOf('mr-mime'));
    run('pichu', 'pikachu', 'raichu');
    run('oddish', 'gloom', 'vileplume', 'bellossom');
    run('wurmple', 'silcoon', 'beautifly', 'cascoon', 'dustox');
    expect(new Set(dx.pokemon.map((e) => e.familyOrder)).size).toBe(dx.pokemon.length);
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

  it('reports evolve on a Pokémon with no pre-evolution in the game, and a missing one', () => {
    const dir = copy();
    const file = join(dir, 'games/dx/pokemon.yaml');
    const yaml = readFileSync(file, 'utf8')
      .replace('- id: weedle\n  types: [bug, poison]\n  camp: stump-forest\n', '- id: weedle\n  types: [bug, poison]\n  camp: stump-forest\n  evolve: { level: 3 }\n')
      .replace('  evolve: { level: 10 }\n', '');
    writeFileSync(file, yaml);
    expect(() => buildData(dir, PORTRAITS)).toThrow('weedle: has evolve but doesn\'t evolve from a Pokémon in this game');
    writeFileSync(file, yaml.replace('  evolve: { level: 3 }\n', ''));
    expect(buildData(dir, PORTRAITS).warnings.join('\n')).toContain('butterfree: evolves from "metapod" but has no evolve requirement');
  });

  it('reports malformed floors', () => {
    const dir = copy();
    const file = join(dir, 'games/dx/pokemon.yaml');
    const yaml = readFileSync(file, 'utf8');
    writeFileSync(file, yaml.replace('floors: "8-9", level: 14', 'floors: "B8F", level: 14'));
    expect(() => buildData(dir, PORTRAITS)).toThrow('floors look like "1-3, 5"');
  });

  it('reports a method in an unknown section', () => {
    const dir = copy();
    const file = join(dir, 'games/dx/game.yaml');
    writeFileSync(file, readFileSync(file, 'utf8').replace('section: fainted', 'section: nowhere'));
    expect(() => buildData(dir, PORTRAITS)).toThrow('method "fainted": unknown section "nowhere"');
  });

  it('warns about missing artwork unless it is marked `artwork: false`', () => {
    const empty = mkdtempSync(join(tmpdir(), 'pokedex-md-artwork-'));
    const missing = buildData(DATA, PORTRAITS, empty).warnings.filter((w) => w.includes('npm run artwork'));
    expect(missing.some((w) => w.includes(': tiny-woods: '))).toBe(true);
    expect(missing.some((w) => w.includes(': wild-plains: '))).toBe(true);
    expect(missing.some((w) => w.includes(': rock-path: '))).toBe(false);
  });

  it('reports an unknown evolvesFrom', () => {
    const dir = copy();
    writeFileSync(join(dir, 'shared/species.yaml'), '- { id: missingno, dex: 999, evolvesFrom: nobody }\n', { flag: 'a' });
    expect(() => buildData(dir, PORTRAITS)).toThrow('unknown evolvesFrom "nobody"');
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
    writeFileSync(join(dir, 'locales/fr/shared.yaml'), 'type:\n  fire: "Feu"\nspecies: english\nform: english\n');
    const result = buildData(dir, PORTRAITS);
    const fallback = result.warnings.find((w) => w.startsWith('locales/fr: '));
    // Only the 17 untranslated types fall back; species and forms are English on purpose.
    expect(fallback).toMatch(/^locales\/fr: 17\//);
    expect(result.dictionaries.dx!.fr!['species.pikachu']).toBe('Pikachu');
  });
});
