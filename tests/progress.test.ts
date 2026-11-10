import { describe, expect, it } from 'vitest';
import {
  emptyProgress,
  mergeEntries,
  migrateProgress,
  parseImport,
  sanitizeEntries,
  toExport,
} from '../src/lib/progress.ts';

const known = new Set(['bulbasaur', 'pikachu', 'mewtwo']);

describe('migrateProgress', () => {
  it('returns empty progress for missing or foreign data', () => {
    expect(migrateProgress(undefined, 'dx')).toEqual(emptyProgress('dx'));
    expect(migrateProgress({ schemaVersion: 1, gameId: 'sky', entries: { pikachu: { recruited: true } } }, 'dx').entries).toEqual({});
    expect(migrateProgress({ schemaVersion: 99, gameId: 'dx', entries: {} }, 'dx')).toEqual(emptyProgress('dx'));
  });

  it('keeps valid entries and applies id aliases', () => {
    const p = migrateProgress(
      { schemaVersion: 1, gameId: 'dx', updatedAt: 'x', entries: { 'old-pika': { recruited: true }, mewtwo: { recruited: false } } },
      'dx',
      { 'old-pika': 'pikachu' },
    );
    expect(p.entries).toEqual({ pikachu: { recruited: true } });
  });
});

describe('sanitizeEntries', () => {
  it('drops malformed values', () => {
    expect(sanitizeEntries({ a: { recruited: 'yes' }, b: null, c: { recruited: true } })).toEqual({ c: { recruited: true } });
    expect(sanitizeEntries([1, 2])).toEqual({});
  });
});

describe('export / import round trip', () => {
  const progress = { ...emptyProgress('dx'), entries: { pikachu: { recruited: true as const }, missingno: { recruited: true as const } } };
  const text = JSON.stringify(toExport(progress));

  it('imports its own export', () => {
    const result = parseImport(text, 'dx', known);
    expect(result).toEqual({
      ok: true,
      entries: progress.entries,
      recruited: 1,
      unknownIds: ['missingno'],
    });
  });

  it('rejects other games, other apps and bad JSON', () => {
    expect(parseImport(text, 'sky', known)).toEqual({ ok: false, error: 'wrong-game', gameId: 'dx' });
    expect(parseImport('{"hello":1}', 'dx', known)).toEqual({ ok: false, error: 'not-pokedex-md' });
    expect(parseImport('not json', 'dx', known)).toEqual({ ok: false, error: 'invalid-json' });
    expect(parseImport(text.replace('"schemaVersion":1', '"schemaVersion":2'), 'dx', known)).toEqual({
      ok: false,
      error: 'unsupported-version',
    });
  });
});

describe('mergeEntries', () => {
  it('keeps everything recruited in either side', () => {
    expect(mergeEntries({ a: { recruited: true } }, { b: { recruited: true } })).toEqual({
      a: { recruited: true },
      b: { recruited: true },
    });
  });
});
