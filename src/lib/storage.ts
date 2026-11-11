import { createStore, get, set, del } from 'idb-keyval';

// All persisted state goes through here. Keys are namespaced so several games
// (and app-wide settings) can share one database without colliding:
//   app/settings
//   game/<gameId>/progress
//   game/<gameId>/rescue

const store = (() => {
  try {
    return typeof indexedDB === 'undefined' ? undefined : createStore('pokedex-md', 'kv');
  } catch {
    return undefined;
  }
})();

// Used when IndexedDB is unavailable (some private modes); state then lasts for the session only.
const memory = new Map<string, unknown>();

export const storageKeys = {
  settings: 'app/settings',
  progress: (gameId: string) => `game/${gameId}/progress`,
  /** The rescue password being entered on the Rescues page, and the A-OK password made for it. */
  rescue: (gameId: string) => `game/${gameId}/rescue`,
} as const;

export async function readValue<T>(key: string): Promise<T | undefined> {
  if (store) {
    try {
      return await get<T>(key, store);
    } catch {
      // fall through to memory
    }
  }
  return memory.get(key) as T | undefined;
}

export async function writeValue(key: string, value: unknown): Promise<boolean> {
  memory.set(key, value);
  if (!store) return false;
  try {
    await set(key, value, store);
    return true;
  } catch {
    return false;
  }
}

export async function deleteValue(key: string): Promise<void> {
  memory.delete(key);
  if (store) await del(key, store).catch(() => undefined);
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
