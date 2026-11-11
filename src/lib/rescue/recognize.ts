// Reads a Rescue Team DX password from a picture of the "Rescue request password" screen:
// a Switch screenshot, or a phone photo of the TV or the Switch.
//
// 1. findCorners: every symbol has a white glyph in its middle, so the bright, glyph-sized blobs
//    are found, and the 2×15 layout of the password is fitted to them. The result is where the four
//    corner symbols are, which the user can drag to fix when the picture is hard to read.
// 2. readSymbols: through the perspective those corners give, each symbol is sampled, its colours
//    are white-balanced against its own glyph, and it's scored against the 5 suits (by colour) and
//    the 13 glyphs (by shape). Each cell gets a ranked list of guesses.
// 3. bestPassword: the best guess per cell, or, when that isn't a valid password, the most likely
//    one or two swaps for runner-up guesses that make it valid (the password has a checksum).
//
// Pure functions on RGBA pixels, so the same code runs in the browser and in tests.

import { GLYPH_MASKS } from './dx-glyphs.ts';
import { SUIT_MASKS } from './dx-suits.ts';
import { GLYPHS, PASSWORD_LENGTH, SUITS, SYMBOL_COUNT, symbolOf, type PasswordSymbol } from './dx-password.ts';

export interface RgbaImage {
  width: number;
  height: number;
  /**
   * RGBA, 4 bytes per pixel, row by row (ImageData.data). Transparent pixels aren't part of the
   * picture (a camera frame's margin past the edge of the video).
   */
  data: ArrayLike<number>;
}
export interface Point {
  x: number;
  y: number;
}
/** Where the centres of the four corner symbols are: top-left, top-right, bottom-right, bottom-left. */
export type Corners = [Point, Point, Point, Point];

// ---------------------------------------------------------------------------------------------
// Layout of the password panel, in the game's own units (as in pmd-gen's 967×254 panel): symbols
// are 53 wide and 54 apart, groups of 5 have 8.5 more between them, the rows are 69 apart and the
// middle group sits 8.5 lower.

const PITCH = 54;
const GROUP_GAP = 8.5;
const ROW_PITCH = 69;
const MIDDLE_DROP = 8.5;
const SYMBOL_SIZE = 53;
const PER_ROW = 15;

/** Centre of symbol `i` (0-29, row by row) in panel units, relative to the first one. */
export function cellCentre(i: number): Point {
  const col = i % PER_ROW;
  const group = Math.floor(col / 5);
  return { x: col * PITCH + group * GROUP_GAP, y: (i >= PER_ROW ? ROW_PITCH : 0) + (group === 1 ? MIDDLE_DROP : 0) };
}
const CORNER_CELLS = [0, PER_ROW - 1, PASSWORD_LENGTH - 1, PER_ROW] as const;
const IDEAL_CORNERS = CORNER_CELLS.map((i) => cellCentre(i));
// The middle group's drop isn't part of the corners' rectangle.
IDEAL_CORNERS.forEach((p) => (p.y = p.y >= ROW_PITCH ? ROW_PITCH : 0));

// ---------------------------------------------------------------------------------------------
// Homographies (3×3, row-major, h[8] = 1).

type Homography = number[];

function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    if (Math.abs(m[pivot]![col]!) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col]! / m[col]![col]!;
      for (let c = col; c <= n; c++) m[r]![c]! -= f * m[col]![c]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

/** Least-squares homography taking each `from` point to its `to` point (4 or more pairs). */
function fitHomography(from: Point[], to: Point[]): Homography | null {
  // Normalise both sets (centroid at 0, mean distance √2) to keep the system well conditioned.
  const norm = (pts: Point[]) => {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const d = pts.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / pts.length || 1;
    const k = Math.SQRT2 / d;
    return { pts: pts.map((p) => ({ x: (p.x - cx) * k, y: (p.y - cy) * k })), cx, cy, k };
  };
  const f = norm(from);
  const t = norm(to);
  const ata = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  const atb = new Array<number>(8).fill(0);
  const add = (row: number[], rhs: number) => {
    for (let i = 0; i < 8; i++) {
      atb[i]! += row[i]! * rhs;
      for (let j = 0; j < 8; j++) ata[i]![j]! += row[i]! * row[j]!;
    }
  };
  f.pts.forEach(({ x, y }, i) => {
    const { x: u, y: v } = t.pts[i]!;
    add([x, y, 1, 0, 0, 0, -u * x, -u * y], u);
    add([0, 0, 0, x, y, 1, -v * x, -v * y], v);
  });
  const h = solve(ata, atb);
  if (!h) return null;
  // Undo the normalisation: H = T⁻¹ · Hn · F.
  const hn = [...h, 1];
  const F = [f.k, 0, -f.k * f.cx, 0, f.k, -f.k * f.cy, 0, 0, 1];
  const Tinv = [1 / t.k, 0, t.cx, 0, 1 / t.k, t.cy, 0, 0, 1];
  const mul = (a: number[], b: number[]) =>
    Array.from({ length: 9 }, (_, i) => {
      const r = Math.floor(i / 3);
      const c = i % 3;
      return a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!;
    });
  const out = mul(Tinv, mul(hn, F));
  return out.map((v) => v / out[8]!);
}

function project(h: Homography, p: Point): Point {
  const w = h[6]! * p.x + h[7]! * p.y + h[8]!;
  return { x: (h[0]! * p.x + h[1]! * p.y + h[2]!) / w, y: (h[3]! * p.x + h[4]! * p.y + h[5]!) / w };
}

const panelToImage = (corners: Corners) => fitHomography(IDEAL_CORNERS, corners);

/**
 * The game's password panel ("Rescue request password", with its border): its size, and where the
 * first symbol's centre is in it. The camera's guide frame has these proportions.
 */
export const PANEL = { width: 967, height: 254, first: { x: 97.5, y: 97.5 }, symbol: SYMBOL_SIZE } as const;

/** Top-left corner of each symbol in the panel (for drawing the guide). */
export const panelSymbols = (): Point[] =>
  Array.from({ length: PASSWORD_LENGTH }, (_, i) => {
    const c = cellCentre(i);
    return { x: PANEL.first.x + c.x - SYMBOL_SIZE / 2, y: PANEL.first.y + c.y - SYMBOL_SIZE / 2 };
  });

/** The corners for a picture of exactly the panel, `scale` pixels per panel unit. */
export const panelCorners = (scale: number): Corners =>
  IDEAL_CORNERS.map((p) => ({ x: (PANEL.first.x + p.x) * scale, y: (PANEL.first.y + p.y) * scale })) as Corners;

/** Where each of the 30 symbols' centres is in the image, for the given corners. */
export function symbolCentres(corners: Corners): Point[] {
  const h = panelToImage(corners);
  return Array.from({ length: PASSWORD_LENGTH }, (_, i) => (h ? project(h, cellCentre(i)) : { x: 0, y: 0 }));
}

// ---------------------------------------------------------------------------------------------
// Finding the password.

interface Blob extends Point {
  /** Height of the blob: the glyphs are all about as tall. */
  size: number;
}

/** "Whiteness" (darkest channel) of a downscaled copy of the image, at most `maxSide` pixels wide or tall. */
function whiteness(img: RgbaImage, maxSide: number) {
  const scale = Math.max(1, Math.ceil(Math.max(img.width, img.height) / maxSide));
  const w = Math.floor(img.width / scale);
  const h = Math.floor(img.height / scale);
  const out = new Float32Array(w * h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < scale; dy++) {
        let i = ((y * scale + dy) * img.width + x * scale) * 4;
        for (let dx = 0; dx < scale; dx++, i += 4) sum += Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
      }
      out[y * w + x] = sum / (scale * scale * 255);
    }
  }
  return { w, h, scale, values: out };
}

/** Bright blobs shaped like a glyph (connected pixels at or above `threshold`). */
function brightBlobs(values: Float32Array, w: number, h: number, threshold: number): Blob[] {
  const labels = new Int32Array(w * h).fill(-1);
  const stack: number[] = [];
  const blobs: Blob[] = [];
  for (let start = 0; start < w * h; start++) {
    if (labels[start] !== -1 || values[start]! < threshold) continue;
    labels[start] = start;
    stack.push(start);
    let count = 0;
    let x0 = w;
    let x1 = 0;
    let y0 = h;
    let y1 = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % w;
      const py = (p - px) / w;
      count++;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = py + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          if (nx < 0 || nx >= w) continue;
          const q = ny * w + nx;
          if (labels[q] === -1 && values[q]! >= threshold) {
            labels[q] = start;
            stack.push(q);
          }
        }
      }
    }
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const fill = count / (bw * bh);
    if (bh < 4 || bw < 2 || bh > h / 5 || bw > w / 8 || bw / bh > 2 || bw / bh < 0.25 || fill < 0.15 || fill > 0.95) continue;
    blobs.push({ x: (x0 + x1 + 1) / 2, y: (y0 + y1 + 1) / 2, size: bh });
  }
  return blobs;
}

/** Spatial hash of blobs, for finding the blobs near a point. */
class BlobIndex {
  #cells = new Map<number, number[]>();
  #cell: number;
  readonly blobs: Blob[];
  constructor(blobs: Blob[], cell: number) {
    this.blobs = blobs;
    this.#cell = cell;
    blobs.forEach((b, i) => {
      const key = this.#key(Math.floor(b.x / cell), Math.floor(b.y / cell));
      const list = this.#cells.get(key);
      if (list) list.push(i);
      else this.#cells.set(key, [i]);
    });
  }
  #key = (x: number, y: number) => (x + 0x8000) * 0x10000 + (y + 0x8000);
  /** Calls `visit` with every blob that might be within `r` of `p`. */
  #around(p: Point, r: number, visit: (i: number) => void) {
    const n = Math.ceil(r / this.#cell);
    const cx = Math.floor(p.x / this.#cell);
    const cy = Math.floor(p.y / this.#cell);
    for (let y = cy - n; y <= cy + n; y++) {
      for (let x = cx - n; x <= cx + n; x++) for (const i of this.#cells.get(this.#key(x, y)) ?? []) visit(i);
    }
  }
  /** The blob nearest to `p` within `maxDist`, or -1. */
  nearest(p: Point, maxDist: number): number {
    let best = -1;
    let bestD = maxDist * maxDist;
    this.#around(p, maxDist, (i) => {
      const b = this.blobs[i]!;
      const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
  /** Blobs within `r` of `p`. */
  within(p: Point, r: number): Blob[] {
    const out: Blob[] = [];
    this.#around(p, r, (i) => {
      const b = this.blobs[i]!;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 <= r * r) out.push(b);
    });
    return out;
  }
}

interface Fit {
  h: Homography;
  /** Blob matched to each symbol, or -1. */
  matched: number[];
  count: number;
  /**
   * How well the blobs back it up: each matched blob counts 1 when it's exactly where a symbol
   * should be, less the further off it is. A fit off by a column can still match most blobs (it
   * stretches to reach them), but never closely.
   */
  score: number;
}

/** Matches the nearest blob to each symbol a panel→image homography predicts. */
function match(h: Homography, index: BlobIndex): Fit {
  const centres = Array.from({ length: PASSWORD_LENGTH }, (_, i) => project(h, cellCentre(i)));
  const used = new Set<number>();
  let score = 0;
  const matched = centres.map((c, i) => {
    // Tolerance: 30% of the local distance between neighbouring symbols.
    const next = centres[i % PER_ROW === PER_ROW - 1 ? i - 1 : i + 1]!;
    const tol = 0.3 * Math.hypot(next.x - c.x, next.y - c.y);
    const m = index.nearest(c, tol);
    if (m < 0 || used.has(m)) return -1;
    used.add(m);
    const b = index.blobs[m]!;
    score += 1 - ((b.x - c.x) ** 2 + (b.y - c.y) ** 2) / (tol * tol);
    return m;
  });
  return { h, matched, count: used.size, score };
}

/** Refits the homography on its matches, `rounds` times, keeping the best-scoring fit. */
function refine(fit: Fit, index: BlobIndex, rounds: number): Fit {
  let best = fit;
  let current = fit;
  for (let round = 0; round < rounds && current.count >= 6; round++) {
    const pairs = current.matched.flatMap((m, i) => (m >= 0 ? [[cellCentre(i), index.blobs[m]!] as const] : []));
    const h = fitHomography(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1]),
    );
    if (!h) break;
    current = match(h, index);
    if (current.score > best.score) best = current;
  }
  return best;
}

// More bright blobs than this is noise (a busy photo at a low threshold), not a password.
const MAX_BLOBS = 1500;
// Matching this many symbols is as good as it gets; stop trying more hypotheses.
const ENOUGH = PASSWORD_LENGTH - 2;
// Hypotheses refined (the costly step) after the quick screening.
const SHORTLIST = 12;
// For each blob, its nearest neighbours to the right that are tried as the next symbol.
const NEIGHBOURS = 4;

/** The best way to lay the 30 symbols over these blobs. */
function fitLayout(blobs: Blob[]): Fit | null {
  if (blobs.length < 6 || blobs.length > MAX_BLOBS) return null;
  const sizes = blobs.map((b) => b.size).sort((a, b) => a - b);
  const index = new BlobIndex(blobs, Math.max(4, sizes[Math.floor(sizes.length / 2)]! * 2));
  // Hypothesis: blobs a and b are neighbours in a group. Their distance is the pitch, and the rows
  // run along it. Every place a could be in the layout is screened by how many blobs it matches,
  // and the best few are refined and compared by how closely they match.
  const shortlist: Fit[] = [];
  const consider = (fit: Fit) => {
    if (fit.count < 6) return;
    shortlist.push(fit);
    shortlist.sort((x, y) => y.count - x.count || y.score - x.score);
    if (shortlist.length > SHORTLIST) shortlist.pop();
  };
  const top = () => shortlist[0]?.count ?? 0;
  for (const a of blobs) {
    if (top() >= ENOUGH) break;
    // A blob the best hypothesis already explains would mostly give that same one again.
    if (top() >= 12 && shortlist[0]!.matched.some((m) => index.blobs[m] === a)) continue;
    const next = index
      .within(a, 4.5 * 1.43 * a.size)
      .filter((b) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const ratio = b.size / a.size;
        const glyph = (a.size + b.size) / 2;
        return dx > 0 && Math.abs(dy) <= 0.5 * dx && ratio >= 0.7 && ratio <= 1.43 && dist >= 2 * glyph && dist <= 4.5 * glyph;
      })
      .sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))
      .slice(0, NEIGHBOURS);
    for (const b of next) {
      // Panel units → image: x along a→b, y perpendicular (pointing down), same scale.
      const ux = (b.x - a.x) / PITCH;
      const uy = (b.y - a.y) / PITCH;
      for (let cell = 0; cell < PASSWORD_LENGTH; cell++) {
        if (cell % 5 === 4) continue; // b must be in the same group, right after a
        const o = cellCentre(cell);
        consider(match([ux, -uy, a.x - ux * o.x + uy * o.y, uy, ux, a.y - uy * o.x - ux * o.y, 0, 0, 1], index));
      }
    }
  }
  let best: Fit | null = null;
  for (const fit of shortlist) {
    const refined = refine(fit, index, 3);
    if (!best || refined.score > best.score) best = refined;
  }
  // A blurry picture can settle one column or row off; see if a nudge fits better.
  for (const [dx, dy] of [[PITCH, 0], [-PITCH, 0], [0, ROW_PITCH], [0, -ROW_PITCH]] as const) {
    if (!best) break;
    const h = best.h;
    const moved = [h[0]!, h[1]!, h[0]! * dx + h[1]! * dy + h[2]!, h[3]!, h[4]!, h[3]! * dx + h[4]! * dy + h[5]!, h[6]!, h[7]!, h[6]! * dx + h[7]! * dy + h[8]!];
    const refined = refine(match(moved, index), index, 3);
    if (refined.score > best.score) best = refined;
  }
  return best;
}

export interface Located {
  corners: Corners;
  /** How many of the 30 glyphs were found where the corners put them. */
  found: number;
}

/**
 * Looks for the password in a picture. Returns where it seems to be (with how many symbols back it
 * up), or null when nothing looks like it.
 */
// A fit this close needs no other threshold or scale to be tried.
const GOOD_SCORE = PASSWORD_LENGTH - 4;

export function findCorners(img: RgbaImage): Located | null {
  let best: { fit: Fit; scale: number } | null = null;
  for (const maxSide of [1600, 900]) {
    const { w, h, scale, values } = whiteness(img, maxSide);
    const sorted = Float32Array.from(values).sort();
    const top = sorted[Math.floor(sorted.length * 0.998)]!;
    // Photos vary a lot in exposure, so try a few thresholds relative to the brightest pixels.
    for (const k of [0.9, 0.8, 0.7, 0.6]) {
      const fit = fitLayout(brightBlobs(values, w, h, top * k));
      if (fit && (!best || fit.score > best.fit.score)) best = { fit, scale };
      if (best && best.fit.score >= GOOD_SCORE) break;
    }
    if (best && best.fit.score >= GOOD_SCORE) break;
  }
  if (!best || best.fit.count < 6) return null;
  const { fit, scale } = best;
  const corners = IDEAL_CORNERS.map((p) => {
    const q = project(fit.h, p);
    // Blob coordinates are pixel-corner based in the downscaled image.
    return { x: q.x * scale, y: q.y * scale };
  }) as Corners;
  return { corners, found: fit.count };
}

/** A starting frame for placing the corners by hand: the middle of the picture. */
export function defaultCorners(img: { width: number; height: number }): Corners {
  const span = cellCentre(PASSWORD_LENGTH - 1);
  const k = (img.width * 0.7) / span.x;
  const x0 = (img.width - span.x * k) / 2;
  const y0 = (img.height - span.y * k) / 2;
  return [
    { x: x0, y: y0 },
    { x: x0 + span.x * k, y: y0 },
    { x: x0 + span.x * k, y: y0 + span.y * k },
    { x: x0, y: y0 + span.y * k },
  ];
}

// ---------------------------------------------------------------------------------------------
// Reading the symbols.

// Each symbol is sampled on a grid of SAMPLE×SAMPLE points, one per panel unit, centred on it.
const SAMPLE = 41;
const HALF = (SAMPLE - 1) / 2;
// The glyph is drawn 25 units wide, 1 unit left of the symbol's centre (M and X a bit less).
const GLYPH_BOX = 25;
const GLYPH_DX = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -0.1, -1, -0.6];
const GLYPH_DY = 0;
// Suits are told apart by colour, in a ring around the glyph.
const RING = [0, 19] as const;

interface Template {
  /** Sample indexes covered by the glyph (fill or outline) and their value (1 fill, 0 outline). */
  ink: Int32Array;
  value: Float32Array;
}

let templates: Template[][] | null = null;
/** Sample indexes no glyph ever covers: the suit behind the glyph. */
let backgroundIdx: Int32Array | null = null;
const SHIFTS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const SCALES = [0.9, 1, 1.1];

function glyphTemplates(): Template[][] {
  if (templates) return templates;
  const anyInk = new Uint8Array(SAMPLE * SAMPLE);
  templates = GLYPH_MASKS.map((mask, g) => {
    const src = mask.length;
    const variants: Template[] = [];
    for (const scale of SCALES) {
      for (const sy of SHIFTS) {
        for (const sx of SHIFTS) {
          const ink: number[] = [];
          const value: number[] = [];
          for (let y = 0; y < SAMPLE; y++) {
            for (let x = 0; x < SAMPLE; x++) {
              const u = (x - HALF - GLYPH_DX[g]! - sx) / (GLYPH_BOX * scale) + 0.5;
              const v = (y - HALF - GLYPH_DY - sy) / (GLYPH_BOX * scale) + 0.5;
              if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
              const c = mask[Math.floor(v * src)]![Math.floor(u * src)];
              if (c === '.') continue;
              ink.push(y * SAMPLE + x);
              value.push(c === '#' ? 1 : 0);
              if (scale === 1 && Math.abs(sx) <= 1 && Math.abs(sy) <= 1) anyInk[y * SAMPLE + x] = 1;
            }
          }
          variants.push({ ink: Int32Array.from(ink), value: Float32Array.from(value) });
        }
      }
    }
    return variants;
  });
  const bg: number[] = [];
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      const r = Math.hypot(x - HALF, y - HALF);
      if (!anyInk[y * SAMPLE + x] && r < 15) bg.push(y * SAMPLE + x);
    }
  }
  backgroundIdx = Int32Array.from(bg);
  return templates;
}

/** Bilinear RGB (0-1) at an image position, clamped to the edges. */
function pixel(img: RgbaImage, x: number, y: number, out: Float32Array, at: number) {
  const fx = Math.min(Math.max(x - 0.5, 0), img.width - 1.001);
  const fy = Math.min(Math.max(y - 0.5, 0), img.height - 1.001);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const ax = fx - x0;
  const ay = fy - y0;
  const d = img.data;
  const i00 = (y0 * img.width + x0) * 4;
  const i10 = i00 + 4;
  const i01 = i00 + img.width * 4;
  const i11 = i01 + 4;
  for (let c = 0; c < 3; c++) {
    const top = d[i00 + c]! * (1 - ax) + d[i10 + c]! * ax;
    const bottom = d[i01 + c]! * (1 - ax) + d[i11 + c]! * ax;
    out[at + c] = (top * (1 - ay) + bottom * ay) / 255;
  }
}

/** RGB → hue (0-360), saturation and value (0-1). */
function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (max <= 0 || d <= 0) return [0, 0, max];
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d / max, max];
}

const HUE_BINS = 18;
// Hue histograms (weighted by saturation, 20° bins from red) of each suit around its glyph, measured
// with measureRingHues on a game screenshot (Serebii's), after white balance. Bin 1 (20-40°) is mostly
// the tan tile behind the symbol. Order: fire, heart, water, emerald, star.
const SUIT_HUES: number[][] = [
  [0.35, 0.36, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.19],
  [0.15, 0.07, 0.01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.08, 0.69],
  [0, 0.22, 0.01, 0, 0, 0, 0, 0, 0.01, 0.74, 0.02, 0, 0, 0, 0, 0, 0, 0],
  [0, 0.21, 0.07, 0.02, 0.03, 0.04, 0.09, 0.48, 0.06, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0.16, 0.84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export interface Guess {
  symbol: PasswordSymbol;
  /** Log-likelihood-like score; higher is more likely. */
  score: number;
}

/** Best guesses for one symbol, most likely first. */
export interface SymbolReading {
  guesses: Guess[];
  /** How far ahead the best guess is of the next one (0 = a toss-up). */
  margin: number;
  /**
   * Whether the whole symbol is in the picture. One that isn't (cut off at an edge) can't be read,
   * and guessing it would let two wrong symbols cancel out in the checksum.
   */
  visible: boolean;
}

/** Saturation-weighted hue histogram (sums to 1, or all 0) of the ring around the glyph. */
function ringHues(rgb: Float32Array): number[] {
  const hist = new Array<number>(HUE_BINS).fill(0);
  let total = 0;
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      const r = Math.hypot(x - HALF, y - HALF);
      if (r < RING[0] || r > RING[1]) continue;
      const i = (y * SAMPLE + x) * 3;
      const [h, s, v] = hsv(rgb[i]!, rgb[i + 1]!, rgb[i + 2]!);
      if (s < 0.3 || v < 0.25) continue;
      hist[Math.floor(h / (360 / HUE_BINS)) % HUE_BINS]! += s;
      total += s;
    }
  }
  return hist.map((v) => (total ? v / total : 0));
}

/** Suit scores (Bhattacharyya coefficient, 0-1) from white-balanced samples. */
function suitScores(rgb: Float32Array): number[] {
  const hist = ringHues(rgb);
  return SUIT_HUES.map((ref) => ref.reduce((sum, p, i) => sum + Math.sqrt(p * hist[i]!), 0));
}

// Shapes are told apart by their silhouette too: colours shift a lot in photos (an emerald can look
// teal, like a drop), outlines don't. Sampled every 2 units over the symbol and a band around it.
const SHAPE_STEP = 2;
// How much the silhouette counts next to the colour (both feed the suit's score). Anything from 1 to
// 3 read every test picture's shapes right; 0 got the real photo's emeralds wrong.
const SHAPE_WEIGHT = 1.5;
const SHAPE_REACH = 30;
const SHAPE_N = SHAPE_REACH * 2 / SHAPE_STEP + 1;
const SHAPE_SHIFTS = [-3, -1.5, 0, 1.5, 3];
const SHAPE_SCALES = [0.92, 1, 1.08];

/** Each suit's silhouette as variants (shifts, scales) over the shape samples within the symbol's square. */
let shapeTemplates: { inBox: Int32Array; variants: Uint8Array[][] } | null = null;
function suitShapes() {
  if (shapeTemplates) return shapeTemplates;
  const half = SYMBOL_SIZE / 2;
  const inBox: number[] = [];
  for (let y = 0; y < SHAPE_N; y++) {
    for (let x = 0; x < SHAPE_N; x++) {
      const u = x * SHAPE_STEP - SHAPE_REACH;
      const v = y * SHAPE_STEP - SHAPE_REACH;
      if (Math.abs(u) <= half && Math.abs(v) <= half) inBox.push(y * SHAPE_N + x);
    }
  }
  const variants = SUIT_MASKS.map((mask) => {
    const n = mask.length;
    const out: Uint8Array[] = [];
    for (const scale of SHAPE_SCALES) {
      for (const sy of SHAPE_SHIFTS) {
        for (const sx of SHAPE_SHIFTS) {
          out.push(
            Uint8Array.from(inBox, (i) => {
              const u = ((i % SHAPE_N) * SHAPE_STEP - SHAPE_REACH - sx) / (SYMBOL_SIZE * scale) + 0.5;
              const v = (Math.floor(i / SHAPE_N) * SHAPE_STEP - SHAPE_REACH - sy) / (SYMBOL_SIZE * scale) + 0.5;
              if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
              return mask[Math.floor(v * n)]![Math.floor(u * n)] === '#' ? 1 : 0;
            }),
          );
        }
      }
    }
    return out;
  });
  shapeTemplates = { inBox: Int32Array.from(inBox), variants };
  return shapeTemplates;
}

/**
 * Shape scores (best correlation of the symbol's silhouette with each suit's, -1 to 1). The
 * silhouette is what differs from the tile around it: its colour is the median of a band just
 * outside the symbol's square, and the split between "like the tile" and "not" is Otsu's.
 */
function shapeScores(img: RgbaImage, h: Homography | null, cell: number): number[] {
  const { inBox, variants } = suitShapes();
  const c = cellCentre(cell);
  const rgb = new Float32Array(SHAPE_N * SHAPE_N * 3);
  const band: number[][] = [[], [], []];
  const half = SYMBOL_SIZE / 2;
  for (let y = 0; y < SHAPE_N; y++) {
    for (let x = 0; x < SHAPE_N; x++) {
      const u = x * SHAPE_STEP - SHAPE_REACH;
      const v = y * SHAPE_STEP - SHAPE_REACH;
      const p = h ? project(h, { x: c.x + u, y: c.y + v }) : { x: 0, y: 0 };
      const i = (y * SHAPE_N + x) * 3;
      pixel(img, p.x, p.y, rgb, i);
      if (Math.max(Math.abs(u), Math.abs(v)) > half) for (let ch = 0; ch < 3; ch++) band[ch]!.push(rgb[i + ch]!);
    }
  }
  const tile = band.map((values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0);
  const dist = Float32Array.from(inBox, (i) =>
    Math.hypot(rgb[i * 3]! - tile[0]!, rgb[i * 3 + 1]! - tile[1]!, rgb[i * 3 + 2]! - tile[2]!),
  );
  // Otsu's threshold on the distances.
  const bins = 64;
  const max = Math.max(...dist, 1e-6);
  const hist = new Array<number>(bins).fill(0);
  for (const d of dist) hist[Math.min(bins - 1, Math.floor((d / max) * bins))]!++;
  let best = 0;
  let threshold = max / 2;
  let w0 = 0;
  let sum0 = 0;
  const total = dist.length;
  const sumAll = hist.reduce((s, n, i) => s + n * i, 0);
  for (let t = 0; t < bins - 1; t++) {
    w0 += hist[t]!;
    sum0 += hist[t]! * t;
    const w1 = total - w0;
    if (!w0 || !w1) continue;
    const between = w0 * w1 * (sum0 / w0 - (sumAll - sum0) / w1) ** 2;
    if (between > best) {
      best = between;
      threshold = ((t + 1) / bins) * max;
    }
  }
  const fg = Uint8Array.from(dist, (d) => (d > threshold ? 1 : 0));
  const n = fg.length;
  const sumF = fg.reduce((a, b) => a + b, 0);
  return variants.map((suit) => {
    let top = -1;
    for (const m of suit) {
      let both = 0;
      let sumM = 0;
      for (let k = 0; k < n; k++) {
        sumM += m[k]!;
        both += m[k]! & fg[k]!;
      }
      // Phi coefficient (correlation of two 0/1 images).
      const cov = both * n - sumF * sumM;
      const corr = cov / Math.sqrt(Math.max(sumF * (n - sumF) * sumM * (n - sumM), 1e-9));
      if (corr > top) top = corr;
    }
    return top;
  });
}

/** Glyph scores (best correlation over small shifts and scales, -1 to 1) from luminance samples. */
function glyphScores(lum: Float32Array): number[] {
  const all = glyphTemplates();
  const bgIdx = backgroundIdx!;
  // The suit colour behind the glyph: the median of the samples no glyph covers.
  const bgValues = Array.from(bgIdx, (i) => lum[i]!).sort((a, b) => a - b);
  const bg = bgValues[Math.floor(bgValues.length / 2)] ?? 0.5;
  // Correlate over a fixed window covering every variant of every glyph.
  const lo = Math.floor(HALF - GLYPH_BOX * 0.55 - 3);
  const hi = Math.ceil(HALF + GLYPH_BOX * 0.55 + 3);
  let n = 0;
  let sumP = 0;
  let sumP2 = 0;
  for (let y = lo; y <= hi; y++) {
    for (let x = lo; x <= hi; x++) {
      const p = lum[y * SAMPLE + x]!;
      n++;
      sumP += p;
      sumP2 += p * p;
    }
  }
  const varP = sumP2 - (sumP * sumP) / n;
  return all.map((variants) => {
    let best = -1;
    for (const t of variants) {
      // The template is `value` on its ink and `bg` everywhere else in the window.
      let inkP = 0;
      let inkPT = 0;
      let inkT = 0;
      let inkT2 = 0;
      for (let k = 0; k < t.ink.length; k++) {
        const p = lum[t.ink[k]!]!;
        const v = t.value[k]!;
        inkP += p;
        inkPT += p * v;
        inkT += v;
        inkT2 += v * v;
      }
      const rest = n - t.ink.length;
      const sumT = inkT + bg * rest;
      const sumT2 = inkT2 + bg * bg * rest;
      const sumPT = inkPT + bg * (sumP - inkP);
      const cov = sumPT - (sumP * sumT) / n;
      const varT = sumT2 - (sumT * sumT) / n;
      const corr = cov / Math.sqrt(Math.max(varP * varT, 1e-9));
      if (corr > best) best = corr;
    }
    return best;
  });
}

/** Samples one symbol, white-balanced against its glyph: RGB and luminance on a SAMPLE×SAMPLE grid. */
function sampleSymbol(img: RgbaImage, h: Homography | null, cell: number) {
  const rgb = new Float32Array(SAMPLE * SAMPLE * 3);
  const lum = new Float32Array(SAMPLE * SAMPLE);
  const c = cellCentre(cell);
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      const p = h ? project(h, { x: c.x + x - HALF, y: c.y + y - HALF }) : { x: 0, y: 0 };
      pixel(img, p.x, p.y, rgb, (y * SAMPLE + x) * 3);
    }
  }
  // White balance against the glyph: its brightest samples are white in the game.
  const inner: number[] = [];
  for (let y = HALF - 10; y <= HALF + 10; y++) {
    for (let x = HALF - 10; x <= HALF + 10; x++) inner.push((y * SAMPLE + x) * 3);
  }
  inner.sort((a, b) => Math.min(rgb[b]!, rgb[b + 1]!, rgb[b + 2]!) - Math.min(rgb[a]!, rgb[a + 1]!, rgb[a + 2]!));
  const white = [0, 0, 0];
  const top = inner.slice(0, Math.max(1, Math.floor(inner.length * 0.1)));
  for (const i of top) for (let ch = 0; ch < 3; ch++) white[ch]! += rgb[i + ch]! / top.length;
  for (let i = 0; i < rgb.length; i += 3) {
    for (let ch = 0; ch < 3; ch++) rgb[i + ch] = Math.min(1, rgb[i + ch]! / Math.max(white[ch]!, 0.05));
    lum[i / 3] = 0.299 * rgb[i]! + 0.587 * rgb[i + 1]! + 0.114 * rgb[i + 2]!;
  }
  return { rgb, lum };
}

/** For tuning SUIT_HUES: the ring hue histogram of each symbol. */
export function measureRingHues(img: RgbaImage, corners: Corners): number[][] {
  const h = panelToImage(corners);
  return Array.from({ length: PASSWORD_LENGTH }, (_, cell) => ringHues(sampleSymbol(img, h, cell).rgb));
}

/** Reads all 30 symbols, given where the corner symbols are. */
export function readSymbols(img: RgbaImage, corners: Corners): SymbolReading[] {
  const h = panelToImage(corners);
  // In the picture: within its bounds, and not a transparent pixel.
  const inside = (p: Point) => {
    if (!(p.x >= 0 && p.y >= 0 && p.x < img.width && p.y < img.height)) return false;
    return img.data[(Math.floor(p.y) * img.width + Math.floor(p.x)) * 4 + 3]! > 0;
  };
  // Points around the edge of a symbol, checked to be in the picture.
  const r = SYMBOL_SIZE / 2;
  const edge = [-1, 0, 1].flatMap((a) => [-1, 0, 1].filter((b) => a || b).map((b) => [a * r, b * r] as const));
  return Array.from({ length: PASSWORD_LENGTH }, (_, cell) => {
    const c = cellCentre(cell);
    const visible = !!h && edge.every(([dx, dy]) => inside(project(h, { x: c.x + dx, y: c.y + dy })));
    const { rgb, lum } = sampleSymbol(img, h, cell);
    const hues = suitScores(rgb);
    const shapes = shapeScores(img, h, cell);
    const suits = hues.map((hue, i) => hue + SHAPE_WEIGHT * shapes[i]!);
    const glyphs = glyphScores(lum);
    const guesses: Guess[] = [];
    suits.forEach((s, si) => {
      glyphs.forEach((g, gi) => {
        const symbol = symbolOf(si, gi);
        if (symbol >= SYMBOL_COUNT) return;
        // Weights turn both scores into comparable log-likelihoods.
        guesses.push({ symbol, score: 12 * s + 20 * g });
      });
    });
    guesses.sort((a, b) => b.score - a.score);
    const top6 = guesses.slice(0, 6);
    return { guesses: top6, margin: top6[0]!.score - top6[1]!.score, visible };
  });
}

// A symbol whose best guess is less than this ahead of the next is worth double-checking. When the
// best guesses already make a valid password, only near toss-ups are.
const UNSURE_MARGIN = 2;
const UNSURE_MARGIN_VALID = 1;
export const isUnsure = (reading: SymbolReading, valid = false) =>
  reading.margin < (valid ? UNSURE_MARGIN_VALID : UNSURE_MARGIN);
// A swap costing more than this (score lost) isn't a plausible misread. Two misreads can cancel out
// in the checksum, so implausible swaps would sometimes "fix" a password into a wrong valid one.
const MAX_SWAP_COST = 4;

export interface BestPassword {
  /** Null where a symbol isn't fully in the picture. */
  password: (PasswordSymbol | null)[];
  /** Whether `isValid` accepted it. */
  valid: boolean;
  /** Symbols swapped for a runner-up guess to make it valid. */
  corrected: number[];
}

/**
 * The most likely password: the best guess per symbol if it's valid, otherwise the most likely
 * way to make it valid by swapping one or two symbols for runner-up guesses.
 */
export function bestPassword(readings: SymbolReading[], isValid: (password: PasswordSymbol[]) => boolean): BestPassword {
  // With a symbol missing there's nothing to check, and nothing safe to correct.
  if (readings.some((r) => !r.visible)) {
    return { password: readings.map((r) => (r.visible ? r.guesses[0]!.symbol : null)), valid: false, corrected: [] };
  }
  const first = readings.map((r) => r.guesses[0]!.symbol);
  if (isValid(first)) return { password: first, valid: true, corrected: [] };

  let best: { password: PasswordSymbol[]; cost: number; corrected: number[] } | null = null;
  const consider = (changes: [number, number][]) => {
    let cost = 0;
    const password = [...first];
    for (const [cell, k] of changes) {
      const g = readings[cell]!.guesses;
      const swap = g[0]!.score - g[k]!.score;
      if (swap > MAX_SWAP_COST) return;
      cost += swap;
      password[cell] = g[k]!.symbol;
    }
    if (best && cost >= best.cost) return;
    if (isValid(password)) best = { password, cost, corrected: changes.map(([c]) => c).sort((a, b) => a - b) };
  };
  const alternatives = (cell: number, max: number) =>
    Array.from({ length: Math.min(max, readings[cell]!.guesses.length - 1) }, (_, i) => i + 1);

  for (let cell = 0; cell < PASSWORD_LENGTH; cell++) for (const k of alternatives(cell, 5)) consider([[cell, k]]);
  // Two swaps: among the least certain symbols only.
  const unsure = readings
    .map((r, cell) => ({ cell, margin: r.margin }))
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 10)
    .map((u) => u.cell);
  for (let i = 0; i < unsure.length; i++) {
    for (let j = i + 1; j < unsure.length; j++) {
      for (const a of alternatives(unsure[i]!, 3)) for (const b of alternatives(unsure[j]!, 3)) consider([[unsure[i]!, a], [unsure[j]!, b]]);
    }
  }
  const found = best as { password: PasswordSymbol[]; corrected: number[] } | null;
  return found ? { password: found.password, valid: true, corrected: found.corrected } : { password: first, valid: false, corrected: [] };
}

/** For tests and tuning: the suit and glyph names of a symbol. */
export const describeSymbol = (s: PasswordSymbol) => `${GLYPHS[s % 13]}${SUITS[Math.floor(s / 13)]![0]}`;
