// Shape of the JSON produced by scripts/build-data.ts and loaded by the app.
// Only ids live here; every display name is looked up in a Dictionary.

export interface ObtainMethod {
  id: string;
  /** Whether obtain entries using this method name a dungeon, or `any`: it happens in any dungeon (none named). */
  dungeon: boolean | 'any';
  /** Section of the Pokémon page it is listed in (one of GameData.sections). */
  section: string;
  /** Icon path under public/ (icons/<gameId>/<name>.png). Absent if none. */
  icon?: string;
}

export interface Obtain {
  method: string;
  dungeon?: string;
  /** Floors it appears on, e.g. "1-3, 5". */
  floors?: string;
  /** Its level there. */
  level?: number;
  /** Base recruit rate in %; negative means it can't be recruited without boosts. */
  rate?: number;
}

/** What it takes to evolve into an entry. At least one of `level` and `item` is set. */
export interface Evolution {
  /** Entry it evolves from. */
  from: string;
  level?: number;
  item?: string;
  /** How many of `item` it takes (1 if absent). */
  count?: number;
}

export interface PokemonEntry {
  /** Stable checklist id; saved progress is keyed by it. */
  id: string;
  species: string;
  dex: number;
  /** Position when sorting by family: dex order, with each evolution line kept together. */
  familyOrder: number;
  form?: string;
  /** The Shiny one of another entry (generated as `<id>-shiny`, right after it). Only obtainable by the `obtain` it lists. */
  shiny?: true;
  /** Portrait path under public/ (portraits/<gameId>/<species>[-<form>][-shiny].webp): the form's own or the species one. Absent if none. */
  portrait?: string;
  types: string[];
  camp: string;
  /** Absent if it doesn't evolve from another Pokémon in this game. */
  evolvesFrom?: Evolution;
  obtain: Obtain[];
}

export interface Dungeon {
  id: string;
  /** 1-based unlock order. */
  order: number;
  /** Artwork path under public/ (dungeons/<gameId>/<id>.webp). Absent if none. */
  image?: string;
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
  /** Sections of a Pokémon's "How to get it", in order. `evolve` lists `evolvesFrom`; the rest list methods. */
  sections: string[];
  methods: ObtainMethod[];
  /** Icon of the `evolve` section, like ObtainMethod.icon. */
  evolveIcon?: string;
  pokemon: PokemonEntry[];
  /** In unlock order. */
  dungeons: Dungeon[];
  /** In unlock order. */
  camps: Camp[];
  /** Old entry id -> current entry id, applied to saved progress on load. */
  idAliases: Record<string, string>;
}

/** Flat map of `<kind>.<id>` -> display name, already merged with fallbacks. */
export type Dictionary = Record<string, string>;
