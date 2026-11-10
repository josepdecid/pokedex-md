import { describe, expect, it } from 'vitest';
import { parseHash, paths, sharedCamp, sharedDungeon, sharedEntry } from '../src/lib/router.svelte.ts';

describe('parseHash', () => {
  it('parses game-prefixed routes', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#/dx')).toEqual({ name: 'pokedex', gameId: 'dx' });
    expect(parseHash('#/dx/pokemon/mr-mime')).toEqual({ name: 'pokemon', gameId: 'dx', id: 'mr-mime' });
    expect(parseHash('#/dx/dungeons/tiny-woods')).toEqual({ name: 'dungeon', gameId: 'dx', id: 'tiny-woods' });
    expect(parseHash('#/dx/settings')).toEqual({ name: 'settings', gameId: 'dx' });
  });

  it('flags unknown games and pages', () => {
    expect(parseHash('#/sky')).toEqual({ name: 'not-found', gameId: 'dx' });
    expect(parseHash('#/dx/nope')).toEqual({ name: 'not-found', gameId: 'dx' });
  });

  it('round-trips paths', () => {
    expect(parseHash(paths.camp('dx', 'beau-plains'))).toEqual({ name: 'camp', gameId: 'dx', id: 'beau-plains' });
  });
});

describe('sharedEntry', () => {
  const list = { name: 'pokedex', gameId: 'dx' } as const;
  const pika = { name: 'pokemon', gameId: 'dx', id: 'pikachu' } as const;
  const raichu = { name: 'pokemon', gameId: 'dx', id: 'raichu' } as const;
  const dungeon = { name: 'dungeon', gameId: 'dx', id: 'mt-steel' } as const;

  it('morphs the Pokémon going into and out of its page', () => {
    expect(sharedEntry(list, pika)).toBe('pikachu');
    expect(sharedEntry(pika, dungeon)).toBe('pikachu');
  });

  it('does not morph on first load, between Pokémon, or between lists', () => {
    expect(sharedEntry(null, pika)).toBeNull();
    expect(sharedEntry(pika, raichu)).toBeNull();
    expect(sharedEntry(list, dungeon)).toBeNull();
  });
});

describe('sharedCamp', () => {
  const camps = { name: 'camps', gameId: 'dx' } as const;
  const beau = { name: 'camp', gameId: 'dx', id: 'beau-plains' } as const;
  const pika = { name: 'pokemon', gameId: 'dx', id: 'pikachu' } as const;

  it('morphs the camp going into and out of its page from the camp list', () => {
    expect(sharedCamp(camps, beau)).toBe('beau-plains');
    expect(sharedCamp(beau, camps)).toBe('beau-plains');
  });

  it('does not morph on first load or to other pages', () => {
    expect(sharedCamp(null, beau)).toBeNull();
    expect(sharedCamp(beau, pika)).toBeNull();
    expect(sharedCamp(pika, beau)).toBeNull();
  });
});

describe('sharedDungeon', () => {
  const dungeons = { name: 'dungeons', gameId: 'dx' } as const;
  const woods = { name: 'dungeon', gameId: 'dx', id: 'tiny-woods' } as const;
  const camps = { name: 'camps', gameId: 'dx' } as const;

  it('morphs the dungeon going into and out of its page from the dungeon list', () => {
    expect(sharedDungeon(dungeons, woods)).toBe('tiny-woods');
    expect(sharedDungeon(woods, dungeons)).toBe('tiny-woods');
  });

  it('does not morph on first load or to other pages', () => {
    expect(sharedDungeon(null, woods)).toBeNull();
    expect(sharedDungeon(camps, woods)).toBeNull();
    expect(sharedCamp(dungeons, woods)).toBeNull();
  });
});
