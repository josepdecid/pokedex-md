// Downloads the artwork of every Rescue Team Camp from Serebii into
// public/camps/<gameId>/<camp-id>.webp (re-encoded with `cwebp`: about half the size of the JPEGs).
//
// Serebii's camp list is matched to our camp ids by English name (data/locales/en/<gameId>.yaml).
// It is also in unlock order, which camps.yaml follows: the script warns when they disagree.
//
// Run manually with `npm run camp-images` when camps are added; the output is committed,
// so builds don't depend on Serebii being reachable. Needs `cwebp` (brew install webp).
//
// The artwork is from the official games by Spike Chunsoft; Serebii is credited in the app.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

/** Serebii camp list page per game. */
const SOURCES: Record<string, string> = {
  dx: 'https://www.serebii.net/dungeonrescueteamdx/rescueteamcamp.shtml',
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
const tmp = mkdtempSync(join(tmpdir(), 'camp-images-'));
const failed: string[] = [];

for (const [gameId, listUrl] of Object.entries(SOURCES)) {
  const camps = (readYaml(`data/games/${gameId}/camps.yaml`) as { id: string }[]).map((c) => c.id);
  const names = (readYaml(`data/locales/en/${gameId}.yaml`) as { camp: Record<string, string> }).camp;
  const idByName = new Map(Object.entries(names).map(([id, name]) => [name, id]));

  const res = await fetch(listUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`${listUrl}: HTTP ${res.status}`);
  // Serebii serves Latin-1; the camp names are plain ASCII, so a lossy decode is fine.
  const html = new TextDecoder('latin1').decode(await res.arrayBuffer());
  // Each row: <img src="camp/th/<file>.jpg" ... alt="<English name>" />. The full-size image is camp/<file>.jpg.
  const rows = [...html.matchAll(/<img src="camp\/th\/([^"]+\.jpg)"[^>]*alt="([^"]+)"/g)].map(([, file, name]) => ({
    file: file!,
    name: name!,
    id: idByName.get(name!),
  }));
  if (rows.length === 0) throw new Error(`${listUrl}: no camps found; did the page layout change?`);

  const outDir = join(root, 'public/camps', gameId);
  mkdirSync(outDir, { recursive: true });
  const queue = rows.filter((r) => {
    if (!r.id) failed.push(`${gameId}: "${r.name}" on Serebii matches no camp name in locales/en/${gameId}.yaml`);
    return r.id;
  });
  let done = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        const url = new URL(`camp/${r.file}`, listUrl);
        const img = await fetch(url, { headers: HEADERS });
        if (!img.ok) {
          failed.push(`${gameId}/${r.id} (${url}: HTTP ${img.status})`);
          continue;
        }
        const jpg = join(tmp, `${gameId}-${r.id}.jpg`);
        writeFileSync(jpg, Buffer.from(await img.arrayBuffer()));
        execFileSync('cwebp', ['-quiet', '-q', QUALITY, '-metadata', 'none', jpg, '-o', join(outDir, `${r.id}.webp`)]);
        done++;
      }
    }),
  );
  console.log(`camp images: ${gameId}: ${done}/${camps.length} downloaded`);

  for (const id of camps) {
    if (!existsSync(join(outDir, `${id}.webp`))) failed.push(`${gameId}/${id}: no image on Serebii`);
  }
  const serebiiOrder = rows.flatMap((r) => (r.id && camps.includes(r.id) ? [r.id] : []));
  const ours = camps.filter((id) => serebiiOrder.includes(id));
  if (ours.join() !== serebiiOrder.join()) {
    console.warn(`warning: games/${gameId}/camps.yaml is not in Serebii's (unlock) order, which is:`);
    for (const id of serebiiOrder) console.warn(`- id: ${id}`);
  }
}

rmSync(tmp, { recursive: true, force: true });
for (const f of failed) console.warn(`warning: ${f}`);
