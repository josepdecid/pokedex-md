import { describe, expect, it } from 'vitest';
import type { Dungeon } from '../src/lib/game-data.ts';
import { formatFloors, lastFloor } from '../src/lib/obtain.ts';

const up: Dungeon = { id: 'mt-steel', order: 3, floors: 9 };
const down: Dungeon = { id: 'tiny-woods', order: 1, floors: 3, basement: true };

describe('floor numbers', () => {
  it('start from the ground floor (0) in a dungeon that goes up', () => {
    expect(formatFloors('1', up)).toBe('Floor 0');
    expect(formatFloors('1-8', up)).toBe('Floors 0..7');
    expect(lastFloor(up)).toBe('F8');
  });

  it('go negative in a dungeon that goes down', () => {
    expect(formatFloors('2', down)).toBe('Floor -2');
    expect(formatFloors('1-4, 6', down)).toBe('Floors -1..-4, -6');
    expect(lastFloor(down)).toBe('F-3');
  });

  it('list a range of two floors', () => {
    expect(formatFloors('2-14, 16-17', up)).toBe('Floors 1..13, 15, 16');
    expect(formatFloors('1-2', down)).toBe('Floors -1, -2');
  });

  it('count from 1 without a dungeon, and have no last floor when it varies', () => {
    expect(formatFloors('2-4', undefined)).toBe('Floors 2..4');
    expect(lastFloor({ id: 'illusory-grotto', order: 46 })).toBeUndefined();
  });
});
