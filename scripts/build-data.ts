// Validates data/**/*.yaml and writes the JSON the app loads to src/generated/.
// Run with `npm run data` (Node strips the TypeScript types natively).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
import type { Dictionary, GameData } from '../src/lib/game-data.ts';

const DEFAULT_LOCALE = 'en';

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids must be lowercase kebab-case');
const unique = <T extends { id: string }>(label: string) => (items: T[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) ctx.addIssue({ code: 'custom', message: `duplicate ${label} id "${item.id}"` });
    seen.add(item.id);
  }
};

const TypesFile = z.array(id);
const SpeciesFile = z
  .array(z.strictObject({ id, dex: z.number().int().positive() }))
  .superRefine(unique('species'));
const GameFile = z.strictObject({
  id,
  platform: z.string(),
  releaseYear: z.number().int(),
  methods: z.array(z.strictObject({ id, dungeon: z.boolean() })).superRefine(unique('method')),
  idAliases: z.record(id, id).default({}),
});
const DungeonsFile = z.array(z.strictObject({ id })).superRefine(unique('dungeon'));
const CampsFile = z.array(z.strictObject({ id })).superRefine(unique('camp'));
const PokemonFile = z
  .array(
    z.strictObject({
      id,
      species: id.optional(),
      form: id.optional(),
      types: z.array(id).min(1).max(2),
      camp: id,
      obtain: z.array(z.strictObject({ method: id, dungeon: id.optional() })),
    }),
  )
  .superRefine(unique('pokemon'));
const PortraitCreditsFile = z.record(id, z.array(z.string().min(1)));
/** `<kind>: { <id>: name }` */
const LocaleFile = z.record(id, z.record(id, z.string().min(1))).nullable();

export interface BuildResult {
  games: GameData[];
  /** gameId -> locale -> dictionary */
  dictionaries: Record<string, Record<string, Dictionary>>;
  warnings: string[];
}

export class DataError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Invalid data:\n  - ${problems.join('\n  - ')}`);
    this.problems = problems;
  }
}

function readYaml<T>(file: string, schema: z.ZodType<T>, problems: string[]): T | undefined {
  if (!existsSync(file)) {
    problems.push(`${file}: missing`);
    return undefined;
  }
  const result = schema.safeParse(parse(readFileSync(file, 'utf8')));
  if (!result.success) {
    for (const issue of result.error.issues) {
      problems.push(`${file}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    return undefined;
  }
  return result.data;
}

function flatten(file: z.infer<typeof LocaleFile> | undefined): Dictionary {
  const out: Dictionary = {};
  for (const [kind, names] of Object.entries(file ?? {})) {
    for (const [key, name] of Object.entries(names)) out[`${kind}.${key}`] = name;
  }
  return out;
}

const listDirs = (dir: string) =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];

export function buildData(dataDir: string, portraitsDir = join(dataDir, '../public/portraits')): BuildResult {
  const problems: string[] = [];
  const warnings: string[] = [];

  const types = readYaml(join(dataDir, 'shared/types.yaml'), TypesFile, problems) ?? [];
  const species = readYaml(join(dataDir, 'shared/species.yaml'), SpeciesFile, problems) ?? [];
  const speciesById = new Map(species.map((s) => [s.id, s]));
  const typeSet = new Set(types);

  const creditsFile = join(dataDir, 'shared/portrait-credits.yaml');
  const portraitCredits = existsSync(creditsFile) ? (readYaml(creditsFile, PortraitCreditsFile, problems) ?? {}) : {};
  for (const speciesId of Object.keys(portraitCredits)) {
    if (!speciesById.has(speciesId)) problems.push(`shared/portrait-credits.yaml: unknown species "${speciesId}"`);
    else if (!existsSync(join(portraitsDir, `${speciesId}.png`))) {
      problems.push(`public/portraits/${speciesId}.png is missing (listed in portrait-credits.yaml); run npm run portraits`);
    }
  }

  const locales = listDirs(join(dataDir, 'locales'));
  if (!locales.includes(DEFAULT_LOCALE)) problems.push(`locales/${DEFAULT_LOCALE}/ is required`);
  const sharedLocale = new Map(
    locales.map((l) => [l, flatten(readYaml(join(dataDir, `locales/${l}/shared.yaml`), LocaleFile, problems))]),
  );

  const games: GameData[] = [];
  const dictionaries: BuildResult['dictionaries'] = {};

  for (const gameId of listDirs(join(dataDir, 'games'))) {
    const dir = join(dataDir, 'games', gameId);
    const where = (file: string) => `games/${gameId}/${file}`;
    const game = readYaml(join(dir, 'game.yaml'), GameFile, problems);
    const dungeons = readYaml(join(dir, 'dungeons.yaml'), DungeonsFile, problems) ?? [];
    const camps = readYaml(join(dir, 'camps.yaml'), CampsFile, problems) ?? [];
    const pokemon = readYaml(join(dir, 'pokemon.yaml'), PokemonFile, problems) ?? [];
    if (!game) continue;
    if (game.id !== gameId) problems.push(`${where('game.yaml')}: id "${game.id}" must match folder name "${gameId}"`);

    const methods = new Map(game.methods.map((m) => [m.id, m]));
    const dungeonSet = new Set(dungeons.map((d) => d.id));
    const campSet = new Set(camps.map((c) => c.id));
    const entryIds = new Set(pokemon.map((p) => p.id));
    // Every key that must have an English name.
    const required = new Set<string>(['game.title', 'game.short']);
    for (const t of types) required.add(`type.${t}`);
    for (const m of game.methods) required.add(`method.${m.id}`);
    for (const d of dungeons) required.add(`dungeon.${d.id}`);
    for (const c of camps) required.add(`camp.${c.id}`);

    const entries = pokemon.map((p) => {
      const at = `${where('pokemon.yaml')}: ${p.id}`;
      const speciesId = p.species ?? p.id;
      const s = speciesById.get(speciesId);
      if (!s) problems.push(`${at}: unknown species "${speciesId}"`);
      for (const t of p.types) if (!typeSet.has(t)) problems.push(`${at}: unknown type "${t}"`);
      if (!campSet.has(p.camp)) problems.push(`${at}: unknown camp "${p.camp}"`);
      for (const o of p.obtain) {
        const method = methods.get(o.method);
        if (!method) problems.push(`${at}: unknown method "${o.method}"`);
        else if (method.dungeon && !o.dungeon) problems.push(`${at}: method "${o.method}" needs a dungeon`);
        else if (!method.dungeon && o.dungeon) problems.push(`${at}: method "${o.method}" does not take a dungeon`);
        if (o.dungeon && !dungeonSet.has(o.dungeon)) problems.push(`${at}: unknown dungeon "${o.dungeon}"`);
      }
      if (p.obtain.length === 0) warnings.push(`${at}: no way to obtain listed`);
      if (!portraitCredits[speciesId]) warnings.push(`${at}: no portrait for species "${speciesId}"`);
      required.add(`species.${speciesId}`);
      if (p.form) required.add(`form.${p.form}`);
      return {
        id: p.id,
        species: speciesId,
        dex: s?.dex ?? 0,
        ...(p.form ? { form: p.form } : {}),
        types: p.types,
        camp: p.camp,
        obtain: p.obtain,
      };
    });
    entries.sort((a, b) => a.dex - b.dex || a.id.localeCompare(b.id));

    for (const [from, to] of Object.entries(game.idAliases)) {
      if (!entryIds.has(to)) problems.push(`${where('game.yaml')}: idAliases.${from} points to unknown entry "${to}"`);
      if (entryIds.has(from)) problems.push(`${where('game.yaml')}: idAliases.${from} is still an entry id`);
    }

    // Dictionaries: <locale>/<game> overrides <locale>/shared, and every locale falls back to English.
    const gameLocale = new Map(
      locales.map((l) => {
        const file = join(dataDir, `locales/${l}/${gameId}.yaml`);
        return [l, existsSync(file) ? flatten(readYaml(file, LocaleFile, problems)) : {}];
      }),
    );
    const merged = (l: string): Dictionary => ({ ...sharedLocale.get(l), ...gameLocale.get(l) });
    const english = merged(DEFAULT_LOCALE);
    for (const key of required) {
      if (!english[key]) problems.push(`locales/${DEFAULT_LOCALE}: missing name for "${key}" (used by ${gameId})`);
    }
    for (const key of Object.keys(gameLocale.get(DEFAULT_LOCALE) ?? {})) {
      if (!required.has(key)) warnings.push(`locales/${DEFAULT_LOCALE}/${gameId}.yaml: "${key}" is not used by any ${gameId} data`);
    }

    dictionaries[gameId] = {};
    for (const l of locales) {
      const own = merged(l);
      const dict: Dictionary = {};
      // Ship only the keys this game uses, so shared files can grow without bloating every game.
      for (const key of required) dict[key] = own[key] ?? english[key] ?? key;
      dictionaries[gameId][l] = dict;
      if (l !== DEFAULT_LOCALE) {
        const missing = [...required].filter((k) => !own[k]).length;
        if (missing) warnings.push(`locales/${l}: ${missing}/${required.size} names for ${gameId} fall back to English`);
      }
    }

    games.push({
      id: game.id,
      platform: game.platform,
      releaseYear: game.releaseYear,
      types: types.filter((t) => entries.some((e) => e.types.includes(t))),
      methods: game.methods,
      pokemon: entries,
      dungeons: dungeons.map((d, i) => ({ id: d.id, order: i + 1 })),
      camps,
      portraitCredits: Object.fromEntries(
        [...new Set(entries.map((e) => e.species))].flatMap((sp) => (portraitCredits[sp] ? [[sp, portraitCredits[sp]]] : [])),
      ),
      idAliases: game.idAliases,
    });
  }

  if (games.length === 0) problems.push('no games found in data/games/');
  if (problems.length) throw new DataError(problems);
  return { games, dictionaries, warnings };
}

export function writeGenerated(result: BuildResult, outDir: string): void {
  rmSync(outDir, { recursive: true, force: true });
  for (const game of result.games) {
    const dir = join(outDir, 'games', game.id);
    mkdirSync(join(dir, 'i18n'), { recursive: true });
    writeFileSync(join(dir, 'data.json'), JSON.stringify(game));
    for (const [locale, dict] of Object.entries(result.dictionaries[game.id] ?? {})) {
      writeFileSync(join(dir, 'i18n', `${locale}.json`), JSON.stringify(dict));
    }
  }
}

if (import.meta.main) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const result = buildData(join(root, 'data'));
    writeGenerated(result, join(root, 'src/generated'));
    for (const w of result.warnings) console.warn(`warning: ${w}`);
    for (const g of result.games) {
      console.log(`data: ${g.id}: ${g.pokemon.length} pokémon, ${g.dungeons.length} dungeons, ${g.camps.length} camps`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
