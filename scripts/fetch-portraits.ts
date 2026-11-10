// Downloads each game's own Pokémon portraits from Serebii into
// public/portraits/<gameId>/<portrait>.webp (re-encoded with `cwebp`).
//
// <portrait> is the species id, or `<species-id>-<form>` for an entry with a form (Unown B ->
// unown-b): one file per checklist entry in data/games/<gameId>/pokemon.yaml.
//
// Run manually with `npm run portraits` when Pokémon are added; the output is committed,
// so builds don't depend on Serebii being reachable. Needs `cwebp` (brew install webp).
//
// The portraits are from the official games by Spike Chunsoft; Serebii is credited in the app.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

interface Source {
  /** Portrait URL for a National Dex number and, for an entry with a form, the form id. */
  url: (dex: number, form: string | undefined) => string;
}

/** Portrait source per game. */
const SOURCES: Record<string, Source> = {
  dx: {
    // pokemon/025.png; forms are pokemon/201-b.png, with ! and ? as "em" and "qm".
    url: (dex, form) => {
      const suffix = form ? `-${{ exclamation: 'em', question: 'qm' }[form] ?? form}` : '';
      return `https://www.serebii.net/dungeonrescueteamdx/pokemon/${String(dex).padStart(3, '0')}${suffix}.png`;
    },
  },
};
const QUALITY = '80';
const CONCURRENCY = 6;
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; pokedex-md asset script)' };

try {
  execFileSync('cwebp', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('cwebp not found. Install it first (macOS: brew install webp; Debian/Ubuntu: apt install webp).');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readYaml = (path: string) => parse(readFileSync(join(root, path), 'utf8'));
const species = readYaml('data/shared/species.yaml') as { id: string; dex: number }[];
const dexById = new Map(species.map((s) => [s.id, s.dex]));
const tmp = mkdtempSync(join(tmpdir(), 'portraits-'));
const failed: string[] = [];

for (const [gameId, { url }] of Object.entries(SOURCES)) {
  const entries = readYaml(`data/games/${gameId}/pokemon.yaml`) as { id: string; species?: string; form?: string }[];
  const outDir = join(root, 'public/portraits', gameId);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const queue = entries.map((e) => {
    const speciesId = e.species ?? e.id;
    return { name: e.form ? `${speciesId}-${e.form}` : speciesId, url: url(dexById.get(speciesId) ?? 0, e.form) };
  });
  const total = queue.length;
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        const res = await fetch(p.url, { headers: HEADERS });
        // Serebii answers a missing image with an HTML page.
        if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) {
          failed.push(`${gameId}/${p.name} (${p.url}: HTTP ${res.status})`);
          continue;
        }
        const png = join(tmp, `${gameId}-${p.name}.png`);
        writeFileSync(png, Buffer.from(await res.arrayBuffer()));
        execFileSync('cwebp', ['-quiet', '-q', QUALITY, '-alpha_q', '100', '-metadata', 'none', png, '-o', join(outDir, `${p.name}.webp`)]);
        done++;
      }
    }),
  );
  console.log(`portraits: ${gameId}: ${done}/${total} downloaded`);
}

rmSync(tmp, { recursive: true, force: true });
for (const f of failed) console.warn(`warning: ${f}`);
