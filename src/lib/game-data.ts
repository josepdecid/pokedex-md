// Shape of the JSON produced by scripts/build-data.ts and loaded by the app.
// Only ids live here; every display name is looked up in a Dictionary.

export interface ObtainMethod {
  id: string;
  /** Whether obtain entries using this method name a dungeon. */
  dungeon: boolean;
}

export interface Obtain {
  method: string;
  dungeon?: string;
}

export interface PokemonEntry {
  /** Stable checklist id; saved progress is keyed by it. */
  id: string;
  species: string;
  dex: number;
  /** Position when sorting by family: dex order, with each evolution line kept together. */
  familyOrder: number;
  form?: string;
  /** Portrait file name (portraits/<portrait>.png): the form's own portrait or the species one. Absent if none. */
  portrait?: string;
  types: string[];
  camp: string;
  obtain: Obtain[];
}

export interface Dungeon {
  id: string;
  /** 1-based unlock order. */
  order: number;
}

export interface Camp {
  id: string;
  /** Artwork path under public/ (camps/<gameId>/<id>.webp). Absent if none. */
  image?: string;
}

export interface GameData {
  id: string;
  platform: string;
  releaseYear: number;
  types: string[];
  methods: ObtainMethod[];
  pokemon: PokemonEntry[];
  dungeons: Dungeon[];
  /** In unlock order. */
  camps: Camp[];
  /** Portrait (entry.portrait) -> artists, for every portrait this game uses. */
  portraitCredits: Record<string, string[]>;
  /** Old entry id -> current entry id, applied to saved progress on load. */
  idAliases: Record<string, string>;
}

/** Flat map of `<kind>.<id>` -> display name, already merged with fallbacks. */
export type Dictionary = Record<string, string>;
