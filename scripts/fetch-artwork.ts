// Downloads the artwork of every Rescue Team Camp and dungeon from Serebii into
// public/<kind>/<gameId>/<id>.webp (re-encoded with `cwebp`: about half the size of the JPEGs).
//
// Serebii's lists are matched to our ids by English name (data/locales/en/<gameId>.yaml).
// They are also in unlock order, which camps.yaml and dungeons.yaml follow: the script warns
// when they disagree. Entries marked `artwork: false` have no artwork on Serebii.
//
// Run manually with `npm run artwork` when camps or dungeons are added; the output is
// committed, so builds don't depend on Serebii being reachable. Needs `cwebp` (brew install webp).
//
// The artwork is from the official games by Spike Chunsoft; Serebii is credited in the app.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

interface Source {
  /** data/games/<gameId>/<kind>.yaml, public/<kind>/<gameId>/. */
  kind: 'camps' | 'dungeons';
  /** Section of data/locales/en/<gameId>.yaml with the English names. */
  names: 'camp' | 'dungeon';
  /** Serebii list page. */
  url: string;
  /** Rows of the list page, in order: full-size image (relative to `url`) and English name. */
  rows: (html: string) => { image: string; name: string }[];
}

/** Serebii list pages per game. */
const SOURCES: Record<string, Source[]> = {
  dx: [
    {
      kind: 'camps',
      names: 'camp',
      url: 'https://www.serebii.net/dungeonrescueteamdx/rescueteamcamp.shtml',
      // <img src="camp/th/<file>.jpg" ... alt="<name>" />; the full-size image is camp/<file>.jpg.
      rows: (html) =>
        [...html.matchAll(/<img src="camp\/th\/([^"]+\.jpg)"[^>]*alt="([^"]+)"/g)].map(([, file, name]) => ({
          image: `camp/${file}`,
          name: name!,
        })),
    },
    {
      kind: 'dungeons',
      names: 'dungeon',
      url: 'https://www.serebii.net/dungeonrescueteamdx/dungeon/',
      // <img src="<n>th.jpg" ... alt="<name> Thumbnail" />; the full-size image is <n>.jpg.
      rows: (html) =>
        [...html.matchAll(/<img src="(\d+)th\.jpg"[^>]*alt="([^"]+) Thumbnail"/g)].map(([, n, name]) => ({
          image: `${n}.jpg`,
          name: name!,
        })),
    },
  ],
};
const QUALITY = '75';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; pokedex-md asset script)' };

try {
  execFileSync('cwebp', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('cwebp not found. Install it first (macOS: brew install webp; Debian/Ubuntu: apt install webp).');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readYaml = (path: string) => parse(readFileSync(join(root, path), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'artwork-'));
const failed: string[] = [];

for (const [gameId, sources] of Object.entries(SOURCES)) {
  for (const { kind, names: section, url: listUrl, rows: parseRows } of sources) {
    const items = readYaml(`data/games/${gameId}/${kind}.yaml`) as { id: string; artwork?: false }[];
    const ids = items.map((c) => c.id);
    const names = (readYaml(`data/locales/en/${gameId}.yaml`) as Record<string, Record<string, string>>)[section]!;
    const idByName = new Map(Object.entries(names).map(([id, name]) => [name, id]));

    const res = await fetch(listUrl, { headers: HEADERS });
    if (!res.ok) throw new Error(`${listUrl}: HTTP ${res.status}`);
    // Serebii serves Latin-1; the names are plain ASCII, so a lossy decode is fine.
    const html = new TextDecoder('latin1').decode(await res.arrayBuffer());
    const rows = parseRows(html).map((r) => ({ ...r, id: idByName.get(r.name) }));
    if (rows.length === 0) throw new Error(`${listUrl}: no ${kind} found; did the page layout change?`);

    const outDir = join(root, 'public', kind, gameId);
    mkdirSync(outDir, { recursive: true });
    const queue = rows.filter((r) => {
      if (!r.id) failed.push(`${gameId}: "${r.name}" on Serebii matches no ${section} name in locales/en/${gameId}.yaml`);
      return r.id;
    });
    let done = 0;
    await Promise.all(
      Array.from({ length: 6 }, async () => {
        for (let r = queue.shift(); r; r = queue.shift()) {
          const url = new URL(r.image, listUrl);
          const img = await fetch(url, { headers: HEADERS });
          if (!img.ok) {
            failed.push(`${gameId}/${kind}/${r.id} (${url}: HTTP ${img.status})`);
            continue;
          }
          const jpg = join(tmp, `${gameId}-${kind}-${r.id}.jpg`);
          writeFileSync(jpg, Buffer.from(await img.arrayBuffer()));
          execFileSync('cwebp', ['-quiet', '-q', QUALITY, '-metadata', 'none', jpg, '-o', join(outDir, `${r.id}.webp`)]);
          done++;
        }
      }),
    );
    console.log(`artwork: ${gameId}/${kind}: ${done}/${ids.length} downloaded`);

    for (const { id, artwork } of items) {
      if (artwork !== false && !existsSync(join(outDir, `${id}.webp`))) {
        failed.push(`${gameId}/${kind}/${id}: no image on Serebii (mark it \`artwork: false\` in ${kind}.yaml if expected)`);
      }
    }
    const serebiiOrder = rows.flatMap((r) => (r.id && ids.includes(r.id) ? [r.id] : []));
    const ours = ids.filter((id) => serebiiOrder.includes(id));
    if (ours.join() !== serebiiOrder.join()) {
      console.warn(`warning: games/${gameId}/${kind}.yaml is not in Serebii's (unlock) order, which is:`);
      for (const id of serebiiOrder) console.warn(`- id: ${id}`);
    }
  }
}

rmSync(tmp, { recursive: true, force: true });
for (const f of failed) console.warn(`warning: ${f}`);
