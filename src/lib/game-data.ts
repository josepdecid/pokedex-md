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
  form?: string;
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
}

export interface GameData {
  id: string;
  platform: string;
  releaseYear: number;
  types: string[];
  methods: ObtainMethod[];
  pokemon: PokemonEntry[];
  dungeons: Dungeon[];
  camps: Camp[];
  /** Species id -> portrait artists. A species has a portrait at portraits/<id>.png iff it is listed here. */
  portraitCredits: Record<string, string[]>;
  /** Old entry id -> current entry id, applied to saved progress on load. */
  idAliases: Record<string, string>;
}

/** Flat map of `<kind>.<id>` -> display name, already merged with fallbacks. */
export type Dictionary = Record<string, string>;
