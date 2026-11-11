// Rescue Team DX rescue passwords: the 30-symbol rescue request the game shows when a team
// faints, and the A-OK (revival) password that answers it.
//
// Ported from pmd-gen (https://github.com/Karthik99999/pmd-gen, MIT, © 2025 Karthik Bandagonda),
// itself based on mid-kid's pmdrtdx_passwords and zaksabeast's notes on the format.
//
// A password is 30 symbols. Each symbol is a glyph (1-9, P, M, D, X) on a suit (fire, heart,
// water, emerald, star), and stands for a 6-bit value: suit * 13 + glyph (X on a star is never
// used). Those 180 bits are, in order: a checksum byte, then the payload, encrypted with a
// .NET-style RNG seeded from the first two bytes and finally shuffled.

import { SYMBOL_CHARS, TEXT_CHARS } from './dx-charmap.ts';

export const PASSWORD_LENGTH = 30;
export const SUITS = ['fire', 'heart', 'water', 'emerald', 'star'] as const;
export const GLYPHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'P', 'M', 'D', 'X'] as const;
export type Suit = (typeof SUITS)[number];
/** Suit * 13 + glyph, 0-63. */
export type PasswordSymbol = number;
export const SYMBOL_COUNT = 64;
/** Longest team name the game accepts. */
export const TEAM_NAME_MAX = 12;

export const symbolOf = (suit: number, glyph: number): PasswordSymbol => suit * GLYPHS.length + glyph;
export const suitOf = (symbol: PasswordSymbol): number => Math.floor(symbol / GLYPHS.length);
export const glyphOf = (symbol: PasswordSymbol): number => symbol % GLYPHS.length;

// Text form used by pmd-gen and other tools: two characters per symbol, glyph then suit ("7f", "ps").
const SUIT_LETTERS = 'fhwes';
export function symbolToText(symbol: PasswordSymbol): string {
  return GLYPHS[glyphOf(symbol)]!.toLowerCase() + SUIT_LETTERS[suitOf(symbol)];
}
/** Parses "7f 3h ..." (spaces optional) into symbols, or returns null if it isn't 30 valid symbols. */
export function passwordFromText(text: string): PasswordSymbol[] | null {
  const pairs = text.toLowerCase().replace(/\s/g, '').match(/.{1,2}/g) ?? [];
  if (pairs.length !== PASSWORD_LENGTH) return null;
  const out: PasswordSymbol[] = [];
  for (const pair of pairs) {
    const glyph = GLYPHS.findIndex((g) => g.toLowerCase() === pair[0]);
    const suit = SUIT_LETTERS.indexOf(pair[1] ?? '');
    if (glyph < 0 || suit < 0) return null;
    const symbol = symbolOf(suit, glyph);
    if (symbol >= SYMBOL_COUNT) return null;
    out.push(symbol);
  }
  return out;
}
export const passwordToText = (password: readonly PasswordSymbol[]) => password.map(symbolToText).join('');

// Where each symbol of the unshuffled password is shown.
const SHUFFLE = [3, 27, 13, 21, 12, 9, 7, 4, 6, 17, 19, 16, 28, 29, 23, 20, 11, 0, 1, 22, 24, 14, 8, 2, 15, 25, 10, 5, 18, 26];

/** The seeded System.Random of .NET (with its second index at 31, as the game uses it). */
class DotNetRandom {
  #state: number[] = [];
  #i1 = 0;
  #i2 = 31;

  constructor(seed: number) {
    seed = 0x9a4ec86 - seed;
    const state = this.#state;
    state[0] = 0;
    state[55] = seed;
    let value = 1;
    for (let i = 1; i < 55; i++) {
      state[(i * 21) % 55] = value;
      const temp = seed - value;
      seed = value;
      value = ((temp >> 31) & 0x7fffffff) + temp;
    }
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 56; j++) {
        const temp = state[j]! - state[(((j + 30) & 0xff) % 55) + 1]!;
        state[j] = ((temp >> 31) & 0x7fffffff) + temp;
      }
    }
  }

  next(): number {
    if (++this.#i1 > 55) this.#i1 = 1;
    if (++this.#i2 > 55) this.#i2 = 1;
    let result = this.#state[this.#i1]! - this.#state[this.#i2]!;
    if (result < 0) result += 0x7fffffff;
    this.#state[this.#i1] = result;
    return result;
  }
}

/** One's-complement style checksum over the payload bytes. */
function checksum(bytes: readonly number[]): number {
  let sum = bytes[0]!;
  for (let x = 1; x < Math.floor((bytes.length - 1) / 2) * 2; x += 2) sum += bytes[x]! | (bytes[x + 1]! << 8);
  if (bytes.length % 2 === 0) sum += bytes[bytes.length - 1]!;
  sum = ((sum >> 16) & 0xffff) + (sum & 0xffff);
  sum += sum >> 16;
  sum = ((sum >> 8) & 0xff) + (sum & 0xff);
  sum += sum >> 8;
  return (sum & 0xff) ^ 0xff;
}

/** Adds (encrypt) or subtracts (decrypt) the RNG stream from every byte after the first two. */
function crypt(bytes: readonly number[], direction: 1 | -1): number[] {
  const rng = new DotNetRandom(bytes[0]! | (bytes[1]! << 8));
  const out = bytes.map((b, i) => (i < 2 ? b : (b + direction * rng.next()) & 0xff));
  // Only the low bits of the last byte are part of the 180-bit password.
  const used = (PASSWORD_LENGTH * 6) % 8 || 8;
  out[out.length - 1]! &= (1 << used) - 1;
  return out;
}

// Bit streams are little-endian: the first value takes the lowest bits.
class BitWriter {
  bits: number[] = [];
  write(value: number, count: number): void {
    for (let i = 0; i < count; i++) this.bits.push(Math.floor(value / 2 ** i) % 2);
  }
}
class BitReader {
  #pos = 0;
  #bits: readonly number[];
  constructor(bits: readonly number[]) {
    this.#bits = bits;
  }
  read(count: number): number {
    let value = 0;
    for (let i = 0; i < count; i++) value += (this.#bits[this.#pos++] ?? 0) * 2 ** i;
    return value;
  }
}
function toBits(values: readonly number[], size: number): number[] {
  const w = new BitWriter();
  for (const v of values) w.write(v, size);
  return w.bits;
}
function fromBits(bits: readonly number[], size: number): number[] {
  const r = new BitReader(bits);
  return Array.from({ length: Math.ceil(bits.length / size) }, () => r.read(size));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Fields shared by both kinds of password. */
interface PasswordBase {
  /** When the password was made, in Unix seconds. */
  timestamp: number;
  /** Team name, as character indexes (see TEXT_CHARS); up to 12, 0-padded. */
  team: number[];
  /** A bit whose meaning is unknown; kept so a decoded password re-encodes identically. */
  unknown1: number;
}

export interface RescueRequest extends PasswordBase {
  kind: 'rescue';
  /** The game's internal dungeon index. */
  dungeon: number;
  floor: number;
  /** The game's internal index of the Pokémon the request shows. */
  pokemon: number;
  gender: number;
  /** Reward tier the player chose. */
  reward: number;
  unknown2: number;
  /** What an A-OK password must carry to answer this request (from the password's symbols). */
  reviveKey: number;
}

export interface Revival extends PasswordBase {
  kind: 'revival';
  /** reviveKey of the rescue request it answers. */
  revive: number;
}

export type DecodedPassword = RescueRequest | Revival;

function serialize(data: DecodedPassword): PasswordSymbol[] {
  const w = new BitWriter();
  w.write(data.timestamp, 32);
  w.write(data.kind === 'rescue' ? 0 : 1, 1);
  w.write(data.unknown1, 1);
  for (let i = 0; i < 12; i++) w.write(data.team[i] ?? 0, 9);
  if (data.kind === 'rescue') {
    w.write(data.dungeon, 7);
    w.write(data.floor, 7);
    w.write(data.pokemon, 11);
    w.write(data.gender, 2);
    w.write(data.reward, 2);
    w.write(data.unknown2, 1);
  } else {
    w.write(data.revive, 30);
  }
  const payload = fromBits(w.bits, 8);
  const encrypted = crypt([checksum(payload), ...payload], 1);
  const values = fromBits(toBits(encrypted, 8), 6).slice(0, PASSWORD_LENGTH);
  const shown: PasswordSymbol[] = [];
  values.forEach((v, i) => (shown[SHUFFLE[i]!] = v));
  return shown;
}

/**
 * Reads a password. Returns null when it isn't one: wrong length, an invalid symbol, or a
 * checksum that doesn't match (almost always a mistyped or misread symbol).
 */
export function decodePassword(password: readonly PasswordSymbol[]): DecodedPassword | null {
  if (password.length !== PASSWORD_LENGTH || password.some((s) => !(s >= 0 && s < SYMBOL_COUNT))) return null;
  const values = SHUFFLE.map((at) => password[at]!);
  const bytes = crypt(fromBits(toBits(values, 6), 8), -1);
  const [included, ...payload] = bytes;
  if (included !== checksum(payload)) return null;

  const r = new BitReader(toBits(payload, 8));
  const timestamp = r.read(32);
  const type = r.read(1);
  const unknown1 = r.read(1);
  const team = Array.from({ length: 12 }, () => r.read(9));
  if (type === 1) return { kind: 'revival', timestamp, team, unknown1, revive: r.read(30) };

  const dungeon = r.read(7);
  const floor = r.read(7);
  const pokemon = r.read(11);
  const gender = r.read(2);
  const reward = r.read(2);
  const unknown2 = r.read(1);
  const symbols = password.map((s) => SYMBOL_CHARS[s]).join('');
  const reviveKey = crc32(new TextEncoder().encode(symbols)) & 0x3fffffff;
  return { kind: 'rescue', timestamp, team, unknown1, dungeon, floor, pokemon, gender, reward, unknown2, reviveKey };
}

/** Re-encodes a decoded password (the inverse of decodePassword). */
export const encodePassword = serialize;

/** Team name as text, or null if it's empty or uses characters the game doesn't have. */
export function teamName(team: readonly number[]): string | null {
  let name = '';
  for (const c of team) {
    if (c === 0) break;
    const char = TEXT_CHARS[c];
    if (!char) return null;
    name += char;
  }
  return name || null;
}

/** Team name as character indexes, or null if it's empty, too long or has characters the game doesn't have. */
export function encodeTeamName(name: string): number[] | null {
  const chars = [...name];
  if (chars.length < 1 || chars.length > TEAM_NAME_MAX) return null;
  const out = chars.map((c) => TEXT_CHARS.indexOf(c));
  return out.every((i) => i > 0) ? out : null;
}

/** The A-OK password that answers a rescue request, "sent" by the team `rescuer`. */
export function makeRevival(request: RescueRequest, rescuer: string, now = new Date()): PasswordSymbol[] {
  const team = encodeTeamName(rescuer);
  if (!team) throw new Error(`Invalid team name: ${rescuer}`);
  return serialize({
    kind: 'revival',
    timestamp: Math.floor(now.getTime() / 1000),
    team,
    unknown1: 0,
    revive: request.reviveKey,
  });
}
