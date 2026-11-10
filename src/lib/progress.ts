// Saved checklist progress: pure functions, no storage or UI.
//
// Progress is stored per game and keyed by entry id. Every saved or exported
// object carries a schemaVersion so older saves can be migrated forward.

export const PROGRESS_SCHEMA_VERSION = 1;
export const EXPORT_APP_ID = 'pokedex-md';

/** Per-entry state. Optional flags keep the format easy to extend (e.g. shiny). */
export interface EntryProgress {
  recruited?: true;
}

export interface Progress {
  schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  gameId: string;
  entries: Record<string, EntryProgress>;
  updatedAt: string;
}

export interface ProgressExport {
  app: typeof EXPORT_APP_ID;
  kind: 'progress';
  schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  gameId: string;
  exportedAt: string;
  entries: Record<string, EntryProgress>;
}

export type ImportError = 'invalid-json' | 'not-pokedex-md' | 'wrong-game' | 'unsupported-version';

export type ImportResult =
  | { ok: true; entries: Record<string, EntryProgress>; recruited: number; unknownIds: string[] }
  | { ok: false; error: ImportError; gameId?: string };

export const emptyProgress = (gameId: string): Progress => ({
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  gameId,
  entries: {},
  updatedAt: new Date(0).toISOString(),
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Keep only well-formed entries, renaming ids listed in `aliases` and dropping empty ones. */
export function sanitizeEntries(raw: unknown, aliases: Record<string, string> = {}): Record<string, EntryProgress> {
  const out: Record<string, EntryProgress> = {};
  if (!isRecord(raw)) return out;
  for (const [rawId, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const id = aliases[rawId] ?? rawId;
    const entry: EntryProgress = { ...out[id] };
    if (value.recruited === true) entry.recruited = true;
    if (Object.keys(entry).length) out[id] = entry;
  }
  return out;
}

/** Turn whatever was in storage into current-format progress. Unknown or broken data becomes empty progress. */
export function migrateProgress(raw: unknown, gameId: string, aliases: Record<string, string> = {}): Progress {
  if (!isRecord(raw) || raw.gameId !== gameId) return emptyProgress(gameId);
  // Future: `if (raw.schemaVersion === 1) raw = migrateV1toV2(raw)` and so on.
  if (raw.schemaVersion !== PROGRESS_SCHEMA_VERSION) return emptyProgress(gameId);
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    gameId,
    entries: sanitizeEntries(raw.entries, aliases),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
  };
}

export function toExport(progress: Progress, now = new Date()): ProgressExport {
  return {
    app: EXPORT_APP_ID,
    kind: 'progress',
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    gameId: progress.gameId,
    exportedAt: now.toISOString(),
    entries: progress.entries,
  };
}

export function parseImport(
  text: string,
  gameId: string,
  knownIds: ReadonlySet<string>,
  aliases: Record<string, string> = {},
): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
  if (!isRecord(raw) || raw.app !== EXPORT_APP_ID || raw.kind !== 'progress') return { ok: false, error: 'not-pokedex-md' };
  if (raw.gameId !== gameId) return { ok: false, error: 'wrong-game', gameId: String(raw.gameId) };
  if (raw.schemaVersion !== PROGRESS_SCHEMA_VERSION) return { ok: false, error: 'unsupported-version' };

  // Ids this version doesn't know are kept (a newer data release may know them) but not counted.
  const entries = sanitizeEntries(raw.entries, aliases);
  const ids = Object.keys(entries);
  return {
    ok: true,
    entries,
    recruited: ids.filter((id) => knownIds.has(id) && entries[id]?.recruited).length,
    unknownIds: ids.filter((id) => !knownIds.has(id)),
  };
}

/** Union of both: an entry recruited in either stays recruited. */
export function mergeEntries(
  a: Record<string, EntryProgress>,
  b: Record<string, EntryProgress>,
): Record<string, EntryProgress> {
  const out: Record<string, EntryProgress> = { ...a };
  for (const [id, entry] of Object.entries(b)) out[id] = { ...out[id], ...entry };
  return out;
}
