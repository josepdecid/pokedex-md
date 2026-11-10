import type { Camp, Dungeon, GameData, PokemonEntry } from './game-data.ts';
import type { ProgressStore } from './progress.svelte.ts';

export interface DungeonEncounter {
  entry: PokemonEntry;
  /** Method ids (dungeon, strong-foe, legendary...) for this Pokémon in this dungeon. */
  methods: string[];
}

/** A loaded game: static data, lookups derived from it, and the player's progress. */
export class GameSession {
  readonly data: GameData;
  readonly progress: ProgressStore;
  readonly entryById: ReadonlyMap<string, PokemonEntry>;
  readonly dungeonById: ReadonlyMap<string, Dungeon>;
  readonly campById: ReadonlyMap<string, Camp>;
  readonly encountersByDungeon: ReadonlyMap<string, DungeonEncounter[]>;
  readonly entriesByCamp: ReadonlyMap<string, PokemonEntry[]>;
  readonly knownIds: ReadonlySet<string>;

  recruitedCount = $derived.by(() => this.data.pokemon.filter((e) => this.progress.isRecruited(e.id)).length);

  constructor(data: GameData, progress: ProgressStore) {
    this.data = data;
    this.progress = progress;
    this.entryById = new Map(data.pokemon.map((e) => [e.id, e]));
    this.dungeonById = new Map(data.dungeons.map((d) => [d.id, d]));
    this.campById = new Map(data.camps.map((c) => [c.id, c]));
    this.knownIds = new Set(data.pokemon.map((e) => e.id));

    const byDungeon = new Map<string, DungeonEncounter[]>(data.dungeons.map((d) => [d.id, []]));
    const byCamp = new Map<string, PokemonEntry[]>(data.camps.map((c) => [c.id, []]));
    for (const entry of data.pokemon) {
      byCamp.get(entry.camp)?.push(entry);
      const methodsHere = new Map<string, string[]>();
      for (const o of entry.obtain) {
        if (!o.dungeon) continue;
        methodsHere.set(o.dungeon, [...(methodsHere.get(o.dungeon) ?? []), o.method]);
      }
      for (const [dungeonId, methods] of methodsHere) byDungeon.get(dungeonId)?.push({ entry, methods });
    }
    this.encountersByDungeon = byDungeon;
    this.entriesByCamp = byCamp;
  }

  get id(): string {
    return this.data.id;
  }

  countRecruited(entries: readonly PokemonEntry[]): number {
    return entries.filter((e) => this.progress.isRecruited(e.id)).length;
  }
}
