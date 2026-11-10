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
  .array(z.strictObject({ id, dex: z.number().int().positive(), evolvesFrom: id.optional() }))
  .superRefine(unique('species'));
/** Built-in section listing each entry's `evolve`. */
const EVOLVE_SECTION = 'evolve';
const GameFile = z.strictObject({
  id,
  platform: z.string(),
  releaseYear: z.number().int(),
  sections: z.array(id).min(1),
  methods: z
    .array(z.strictObject({ id, dungeon: z.boolean(), section: id, icon: id.optional() }))
    .superRefine(unique('method')),
  evolveIcon: id.optional(),
  idAliases: z.record(id, id).default({}),
});
// `artwork: false`: Serebii has no artwork for it, so don't warn that it's missing.
const Place = z.strictObject({ id, artwork: z.literal(false).optional() });
const DungeonsFile = z.array(Place).superRefine(unique('dungeon'));
const CampsFile = z.array(Place).superRefine(unique('camp'));
const PokemonFile = z
  .array(
    z.strictObject({
      id,
      species: id.optional(),
      form: id.optional(),
      types: z.array(id).min(1).max(2),
      camp: id,
      evolve: z
        .strictObject({ level: z.number().int().positive().optional(), item: id.optional(), count: z.number().int().positive().optional() })
        .refine((e) => e.level !== undefined || e.item !== undefined, 'evolve needs a level or an item')
        .refine((e) => e.count === undefined || e.item !== undefined, 'evolve count needs an item')
        .optional(),
      obtain: z.array(
        z.strictObject({
          method: id,
          dungeon: id.optional(),
          floors: z.string().regex(/^\d+(-\d+)?(, \d+(-\d+)?)*$/, 'floors look like "1-3, 5"').optional(),
          level: z.number().int().positive().optional(),
          rate: z.number().optional(),
        }),
      ),
    }),
  )
  .superRefine(unique('pokemon'));
/** `<kind>: { <id>: name }` */
// Each kind is a map of names, or the string `english` to say this language uses the
// English names on purpose (e.g. Pokémon names in Spanish), which silences the fallback warning.
const LocaleFile = z.record(id, z.union([z.literal('english'), z.record(id, z.string().min(1))])).nullable();

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
    if (names === 'english') continue;
    for (const [key, name] of Object.entries(names)) out[`${kind}.${key}`] = name;
  }
  return out;
}

/** Kinds a locale file marks as `english` (intentionally the same as English). */
const englishKinds = (file: z.infer<typeof LocaleFile> | undefined) =>
  Object.entries(file ?? {}).flatMap(([kind, names]) => (names === 'english' ? [kind] : []));

const listDirs = (dir: string) =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];

export function buildData(dataDir: string, artworkDir = join(dataDir, '../public')): BuildResult {
  const problems: string[] = [];
  const warnings: string[] = [];

  const types = readYaml(join(dataDir, 'shared/types.yaml'), TypesFile, problems) ?? [];
  const species = readYaml(join(dataDir, 'shared/species.yaml'), SpeciesFile, problems) ?? [];
  const speciesById = new Map(species.map((s) => [s.id, s]));
  const evolutions = new Map<string, string[]>();
  for (const s of species) {
    if (!s.evolvesFrom) continue;
    if (!speciesById.has(s.evolvesFrom)) problems.push(`shared/species.yaml: ${s.id}: unknown evolvesFrom "${s.evolvesFrom}"`);
    evolutions.set(s.evolvesFrom, [...(evolutions.get(s.evolvesFrom) ?? []), s.id]);
  }
  // Base of each species' evolution line (Elekid for Electivire).
  const lineBase = new Map<string, string>();
  for (const s of species) {
    let base = s;
    for (let steps = 0; base.evolvesFrom && speciesById.has(base.evolvesFrom); steps++) {
      if (steps > species.length) {
        problems.push(`shared/species.yaml: ${s.id}: evolvesFrom loops`);
        break;
      }
      base = speciesById.get(base.evolvesFrom)!;
    }
    lineBase.set(s.id, base.id);
  }
  const typeSet = new Set(types);

  const locales = listDirs(join(dataDir, 'locales'));
  if (!locales.includes(DEFAULT_LOCALE)) problems.push(`locales/${DEFAULT_LOCALE}/ is required`);
  const sharedLocaleFiles = new Map(
    locales.map((l) => [l, readYaml(join(dataDir, `locales/${l}/shared.yaml`), LocaleFile, problems)]),
  );
  const sharedLocale = new Map(locales.map((l) => [l, flatten(sharedLocaleFiles.get(l))]));

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

    /** `{ image }` if public/<kind>/<gameId>/<id>.webp exists (see scripts/fetch-artwork.ts). */
    const artwork = (kind: 'camps' | 'dungeons', item: z.infer<typeof Place>): { image?: string } => {
      const image = `${kind}/${gameId}/${item.id}.webp`;
      if (existsSync(join(artworkDir, image))) return { image };
      if (item.artwork !== false) warnings.push(`${where(`${kind}.yaml`)}: ${item.id}: public/${image} is missing; run npm run artwork`);
      return {};
    };

    /** `{ icon }` if public/icons/<gameId>/<name>.png exists. */
    const icon = (name: string | undefined, what: string): { icon?: string } => {
      if (!name) return {};
      const path = `icons/${gameId}/${name}.png`;
      if (existsSync(join(artworkDir, path))) return { icon: path };
      warnings.push(`${where('game.yaml')}: ${what}: public/${path} is missing`);
      return {};
    };

    const methods = new Map(game.methods.map((m) => [m.id, m]));
    const sectionSet = new Set(game.sections);
    if (sectionSet.size !== game.sections.length) problems.push(`${where('game.yaml')}: sections has duplicates`);
    for (const m of game.methods) {
      if (!sectionSet.has(m.section)) problems.push(`${where('game.yaml')}: method "${m.id}": unknown section "${m.section}"`);
      if (m.section === EVOLVE_SECTION) problems.push(`${where('game.yaml')}: method "${m.id}": section "${EVOLVE_SECTION}" is built in`);
    }
    const dungeonSet = new Set(dungeons.map((d) => d.id));
    const campSet = new Set(camps.map((c) => c.id));
    const entryIds = new Set(pokemon.map((p) => p.id));
    const speciesInGame = new Set(pokemon.map((p) => p.species ?? p.id));
    // An evolution links to the species' first entry (its first form).
    const entryOfSpecies = new Map<string, string>();
    for (const p of pokemon) if (!entryOfSpecies.has(p.species ?? p.id)) entryOfSpecies.set(p.species ?? p.id, p.id);
    // Every key that must have an English name.
    const required = new Set<string>(['game.title', 'game.short']);
    for (const t of types) required.add(`type.${t}`);
    for (const m of game.methods) required.add(`method.${m.id}`);
    for (const sec of game.sections) required.add(`section.${sec}`).add(`section-none.${sec}`);
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
        if (!o.dungeon && (o.floors || o.level || o.rate !== undefined)) problems.push(`${at}: floors, level and rate need a dungeon`);
      }
      // Evolution: only from a pre-evolution that is in this game.
      const preEvolution = s?.evolvesFrom && speciesInGame.has(s.evolvesFrom) ? s.evolvesFrom : undefined;
      if (preEvolution && !p.evolve) warnings.push(`${at}: evolves from "${preEvolution}" but has no evolve requirement`);
      if (!preEvolution && p.evolve) problems.push(`${at}: has evolve but doesn't evolve from a Pokémon in this game`);
      if (p.evolve?.item) required.add(`item.${p.evolve.item}`);
      if (p.obtain.length === 0 && !p.evolve) warnings.push(`${at}: no way to obtain listed`);
      // A form uses its own portrait when there is one, otherwise the species portrait.
      const portrait = [p.form && `${speciesId}-${p.form}`, speciesId]
        .map((k) => k && `portraits/${gameId}/${k}.webp`)
        .find((path) => path && existsSync(join(artworkDir, path)));
      if (!portrait) warnings.push(`${at}: public/portraits/${gameId}/${speciesId}.webp is missing; run npm run portraits`);
      required.add(`species.${speciesId}`);
      if (p.form) required.add(`form.${p.form}`);
      return {
        id: p.id,
        species: speciesId,
        dex: s?.dex ?? 0,
        ...(p.form ? { form: p.form } : {}),
        ...(portrait ? { portrait } : {}),
        types: p.types,
        camp: p.camp,
        ...(preEvolution && p.evolve ? { evolvesFrom: { from: entryOfSpecies.get(preEvolution)!, ...p.evolve } } : {}),
        obtain: p.obtain,
      };
    });
    // Stable sort: forms sharing a dex number keep their pokemon.yaml order (Unown A-Z, !, ?).
    entries.sort((a, b) => a.dex - b.dex);

    // Family order: dex order, but a whole evolution line sits where its lowest-numbered
    // member would (Elekid, Electabuzz, Electivire at #125). Within a line, each species is
    // followed by its evolutions in dex order (Oddish, Gloom, Vileplume, Bellossom).
    const inGame = new Set(entries.map((e) => e.species));
    const speciesRank = new Map<string, number>();
    const visited = new Set<string>();
    const visit = (speciesId: string) => {
      if (visited.has(speciesId)) return;
      visited.add(speciesId);
      if (inGame.has(speciesId)) speciesRank.set(speciesId, speciesRank.size);
      const next = [...(evolutions.get(speciesId) ?? [])].sort((a, b) => speciesById.get(a)!.dex - speciesById.get(b)!.dex);
      for (const child of next) visit(child);
    };
    for (const e of entries) visit(lineBase.get(e.species) ?? e.species);
    const familyOrder = [...entries].sort((a, b) => speciesRank.get(a.species)! - speciesRank.get(b.species)!);
    const familyIndex = new Map(familyOrder.map((e, i) => [e.id, i]));

    for (const [from, to] of Object.entries(game.idAliases)) {
      if (!entryIds.has(to)) problems.push(`${where('game.yaml')}: idAliases.${from} points to unknown entry "${to}"`);
      if (entryIds.has(from)) problems.push(`${where('game.yaml')}: idAliases.${from} is still an entry id`);
    }

    // Dictionaries: <locale>/<game> overrides <locale>/shared, and every locale falls back to English.
    const gameLocaleFiles = new Map(
      locales.map((l) => {
        const file = join(dataDir, `locales/${l}/${gameId}.yaml`);
        return [l, existsSync(file) ? readYaml(file, LocaleFile, problems) : null];
      }),
    );
    const gameLocale = new Map(locales.map((l) => [l, flatten(gameLocaleFiles.get(l))]));
    const sameAsEnglish = (l: string) =>
      new Set([...englishKinds(sharedLocaleFiles.get(l)), ...englishKinds(gameLocaleFiles.get(l))]);
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
        const inherited = sameAsEnglish(l);
        const missing = [...required].filter((k) => !own[k] && !inherited.has(k.split('.')[0]!)).length;
        if (missing) warnings.push(`locales/${l}: ${missing}/${required.size} names for ${gameId} fall back to English`);
      }
    }

    games.push({
      id: game.id,
      platform: game.platform,
      releaseYear: game.releaseYear,
      types: types.filter((t) => entries.some((e) => e.types.includes(t))),
      sections: game.sections,
      methods: game.methods.map(({ icon: name, ...m }) => ({ ...m, ...icon(name, `method "${m.id}"`) })),
      ...(game.evolveIcon && { evolveIcon: icon(game.evolveIcon, 'evolveIcon').icon }),
      pokemon: entries.map((e) => ({ ...e, familyOrder: familyIndex.get(e.id)! })),
      dungeons: dungeons.map((d, i) => ({ id: d.id, order: i + 1, ...artwork('dungeons', d) })),
      camps: camps.map((c) => ({ id: c.id, ...artwork('camps', c) })),
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
