import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';
import { buildData } from '../scripts/build-data.ts';
import {
  decodePassword,
  encodePassword,
  encodeTeamName,
  makeRevival,
  passwordFromText,
  passwordToText,
  teamName,
  type RescueRequest,
} from '../src/lib/rescue/dx-password.ts';
import { bestPassword, findCorners, readSymbols, type RgbaImage } from '../src/lib/rescue/recognize.ts';
import { readRescue } from '../src/lib/rescue/rescue.ts';

// The rescue request in Serebii's screenshot of the game (tests/fixtures/rescue-screenshot.jpg).
const SCREENSHOT = 'xe5s8h7fmf8f7w9f4s1wme7smf5hms1sde7hpe9f5smhdsdh8f6hdsps4sxh';
const table = buildData(resolve(__dirname, '../data')).games.find((g) => g.id === 'dx')!.rescue!;

describe('rescue passwords', () => {
  const password = passwordFromText(SCREENSHOT)!;

  it('decodes a password made by the game', () => {
    const d = decodePassword(password) as RescueRequest;
    expect(d.kind).toBe('rescue');
    expect(teamName(d.team)).toBe('Help DX'); // the screenshot shows "Help DX's rescue request"
    expect({ dungeon: d.dungeon, floor: d.floor, pokemon: d.pokemon }).toEqual({ dungeon: 10, floor: 13, pokemon: 1 });
    expect(new Date(d.timestamp * 1000).toISOString()).toBe('2020-03-09T11:48:47.000Z');
  });

  it('re-encodes it to the same symbols', () => {
    expect(passwordToText(encodePassword(decodePassword(password)!))).toBe(SCREENSHOT);
  });

  it('rejects a mistyped password', () => {
    const typo = [...password];
    typo[7] = (typo[7]! + 1) % 64;
    expect(decodePassword(typo)).toBeNull();
    expect(decodePassword(password.slice(1))).toBeNull();
  });

  it('makes the A-OK password that answers it', () => {
    const request = decodePassword(password) as RescueRequest;
    const now = new Date('2026-11-11T12:00:00Z');
    const revival = makeRevival(request, 'Pokédex MD', now);
    expect(revival).toHaveLength(30);
    const back = decodePassword(revival)!;
    expect(back).toMatchObject({ kind: 'revival', revive: request.reviveKey, timestamp: now.getTime() / 1000 });
    expect(teamName(back.team)).toBe('Pokédex MD');
    expect(makeRevival(request, 'Pokédex MD', now)).toEqual(revival);
  });

  it('only takes team names the game can write', () => {
    expect(encodeTeamName('Pokédex MD')).toHaveLength(10);
    expect(encodeTeamName('')).toBeNull();
    expect(encodeTeamName('Thirteen char')).toBeNull();
    expect(encodeTeamName('Team 🙂')).toBeNull();
  });

  it('reads the text form other tools use', () => {
    expect(passwordFromText(SCREENSHOT.toUpperCase().replace(/(..)/g, '$1 '))).toEqual(password);
    expect(passwordFromText('xs'.repeat(30))).toBeNull(); // X on a star is never used
    expect(passwordFromText(SCREENSHOT.slice(2))).toBeNull();
  });

  it('checks a request against the game data', () => {
    const result = readRescue(password, table);
    expect(result.ok && result.info).toMatchObject({ team: 'Help DX', dungeon: 'frosty-forest', floor: 13, pokemon: 'bulbasaur' });
    const revival = makeRevival(decodePassword(password) as RescueRequest, 'Pokédex MD');
    expect(readRescue(revival, table)).toEqual({ ok: false, error: 'revival' });
    // Valid checksum, but floor 99 of Frosty Forest (14 floors) doesn't exist.
    const request = decodePassword(password) as RescueRequest;
    expect(readRescue(encodePassword({ ...request, floor: 99 }), table)).toEqual({ ok: false, error: 'invalid' });
  });
});

/** Decodes a JPEG with resvg (already a dev dependency), as the browser's canvas would. */
function loadJpeg(file: string, width: number, height: number): RgbaImage {
  const data = readFileSync(resolve(__dirname, 'fixtures', file)).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="data:image/jpeg;base64,${data}" width="${width}" height="${height}"/></svg>`;
  const rendered = new Resvg(svg).render();
  return { width: rendered.width, height: rendered.height, data: rendered.pixels };
}

function read(img: RgbaImage) {
  const located = findCorners(img);
  expect(located).not.toBeNull();
  const readings = readSymbols(img, located!.corners);
  return { located: located!, readings, best: bestPassword(readings, (p) => readRescue(p, table).ok) };
}

describe('reading a password from a picture', () => {
  it('reads a screenshot', () => {
    const { located, readings, best } = read(loadJpeg('rescue-screenshot.jpg', 640, 360));
    expect(located.found).toBe(30);
    expect(passwordToText(readings.map((r) => r.guesses[0]!.symbol))).toBe(SCREENSHOT);
    expect(best).toMatchObject({ valid: true, corrected: [] });
  });

  it('reads a photo-like picture (perspective, blur, colour cast, glare)', () => {
    const { best } = read(loadJpeg('rescue-photo.jpg', 1970, 2160));
    expect(passwordToText(best.password as number[])).toBe(SCREENSHOT);
  });

  it('reads a real phone photo of a Switch (where colours alone confuse emeralds and drops)', () => {
    const { best } = read(loadJpeg('rescue-real-photo.jpg', 2000, 1125));
    expect(passwordToText(best.password as number[])).toBe('7smeps1fxwmw2fxeds1h9spe7wdf9h5wxh3fde7wpe5epfpsds5wph5f8f8w');
    const result = readRescue(best.password as number[], table);
    expect(result.ok && result.info.team).toBe('La Troupe'); // "Petición de rescate de La Troupe"
  });

  it('leaves out symbols cut off at the edge instead of guessing them', () => {
    const img = loadJpeg('rescue-screenshot.jpg', 640, 360);
    const { corners } = findCorners(img)!;
    // Move the layout right until the last column is past the picture's edge (it ends at x ≈ 561).
    const shifted = corners.map((p) => ({ x: p.x + 80, y: p.y })) as typeof corners;
    const readings = readSymbols(img, shifted);
    expect(readings[14]!.visible).toBe(false);
    expect(readings[0]!.visible).toBe(true);
    const best = bestPassword(readings, (p) => readRescue(p, table).ok);
    expect(best.valid).toBe(false);
    expect(best.password[14]).toBeNull();
    expect(best.password[29]).toBeNull();
  });

  it('swaps in a runner-up guess when the best ones make an invalid password', () => {
    const { readings } = read(loadJpeg('rescue-screenshot.jpg', 640, 360));
    // Pretend symbol 12 was misread: its right symbol becomes the second guess.
    const damaged = readings.map((r, i) =>
      i === 12 ? { ...r, guesses: [{ ...r.guesses[1]!, score: r.guesses[0]!.score + 0.5 }, r.guesses[0]!, ...r.guesses.slice(2)] } : r,
    );
    const best = bestPassword(damaged, (p) => readRescue(p, table).ok);
    expect(best).toMatchObject({ valid: true, corrected: [12] });
    expect(passwordToText(best.password as number[])).toBe(SCREENSHOT);
  });
});
