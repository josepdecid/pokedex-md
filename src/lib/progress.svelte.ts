import {
  emptyProgress,
  mergeEntries,
  migrateProgress,
  PROGRESS_SCHEMA_VERSION,
  type EntryProgress,
  type Progress,
} from './progress.ts';
import { readValue, requestPersistence, storageKeys, writeValue } from './storage.ts';

export type SaveState = 'saved' | 'memory-only';

/** Reactive progress for one game, saved to IndexedDB on every change. */
export class ProgressStore {
  readonly gameId: string;
  readonly #aliases: Record<string, string>;
  entries = $state<Record<string, EntryProgress>>({});
  saveState = $state<SaveState>('saved');
  #askedPersistence = false;

  constructor(gameId: string, aliases: Record<string, string> = {}) {
    this.gameId = gameId;
    this.#aliases = aliases;
  }

  async load(): Promise<void> {
    const raw = await readValue<unknown>(storageKeys.progress(this.gameId));
    this.entries = migrateProgress(raw, this.gameId, this.#aliases).entries;
  }

  isRecruited = (id: string): boolean => this.entries[id]?.recruited === true;

  setRecruited(id: string, recruited: boolean): void {
    const { recruited: _, ...rest } = this.entries[id] ?? {};
    const next: EntryProgress = recruited ? { ...rest, recruited: true } : rest;
    if (Object.keys(next).length) this.entries[id] = next;
    else delete this.entries[id];
    void this.#save();
  }

  toggle(id: string): void {
    this.setRecruited(id, !this.isRecruited(id));
  }

  replace(entries: Record<string, EntryProgress>): void {
    this.entries = structuredClone(entries);
    void this.#save();
  }

  merge(entries: Record<string, EntryProgress>): void {
    this.entries = mergeEntries($state.snapshot(this.entries), entries);
    void this.#save();
  }

  reset(): void {
    this.replace({});
  }

  snapshot(): Progress {
    return {
      ...emptyProgress(this.gameId),
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      entries: $state.snapshot(this.entries),
      updatedAt: new Date().toISOString(),
    };
  }

  async #save(): Promise<void> {
    const ok = await writeValue(storageKeys.progress(this.gameId), this.snapshot());
    this.saveState = ok ? 'saved' : 'memory-only';
    // Ask once, on the first real change, so the prompt (if any) has context.
    if (ok && !this.#askedPersistence) {
      this.#askedPersistence = true;
      void requestPersistence();
    }
  }
}
