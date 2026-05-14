// IndexedDB local cache for CookMate web offline-first mode.
// Mirrors the mobile (`mobile/src/offline/db.js`) contract so the rest of the
// offline layer can stay platform-agnostic.
//
// Stores (object stores):
//   recipes        — keyPath: id  (full JSON value + updatedAt)
//   saved_recipes  — keyPath: id  (full JSON value + updatedAt)
//   sync_queue     — auto-incrementing id (type, payload JSON, createdAt)
//
// Cache limits with LRU eviction to prevent unbounded growth:
//   recipes: 500 entries, saved_recipes: 300, meal_plans: 100,
//   grocery_lists: 50, reminder_events: 200
//
// Purely additive: no existing service depends on this file.

const DB_NAME = 'cookmate-offline';
const DB_VERSION = 4;
const STORE_RECIPES = 'recipes';
const STORE_SAVED = 'saved_recipes';
const STORE_MEAL_PLANS = 'meal_plans';
const STORE_GROCERY_LISTS = 'grocery_lists';
const STORE_REMINDER_EVENTS = 'reminder_events';
const STORE_QUEUE = 'sync_queue';
const STORE_IMAGES = 'images';

// Cache size limits per store (LRU eviction when exceeded)
const CACHE_LIMITS: Record<string, number> = {
  [STORE_RECIPES]: 500,
  [STORE_SAVED]: 300,
  [STORE_MEAL_PLANS]: 100,
  [STORE_GROCERY_LISTS]: 50,
  [STORE_REMINDER_EVENTS]: 200,
};

type CacheRow<T = unknown> = {
  id: string;
  data: T;
  updatedAt: number;
};

type QueueRow = {
  id?: number;
  type: string;
  payload: unknown;
  createdAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RECIPES)) {
        db.createObjectStore(STORE_RECIPES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SAVED)) {
        db.createObjectStore(STORE_SAVED, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEAL_PLANS)) {
        db.createObjectStore(STORE_MEAL_PLANS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_GROCERY_LISTS)) {
        db.createObjectStore(STORE_GROCERY_LISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_REMINDER_EVENTS)) {
        db.createObjectStore(STORE_REMINDER_EVENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      // Images store for offline image caching - stores blobs with URL as key
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'url' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB.'));
  });
}

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode) {
  return db.transaction(store, mode).objectStore(store);
}

function waitRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed.'));
  });
}

function safeClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return null as unknown as T;
  }
}

/**
 * Enforce cache size limits with LRU eviction
 * Removes oldest entries when store exceeds its limit
 */
async function enforceCacheLimit(storeName: string): Promise<void> {
  const limit = CACHE_LIMITS[storeName];
  if (!limit || limit <= 0) return;

  try {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Get all entries sorted by updatedAt (oldest first)
    const rows = (await new Promise<CacheRow[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as CacheRow[]);
      req.onerror = () => reject(req.error);
    })) as CacheRow[];

    if (rows.length <= limit) return;

    // Sort by updatedAt ascending (oldest first) and delete excess
    const toDelete = rows
      .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))
      .slice(0, rows.length - limit);

    for (const row of toDelete) {
      if (row.id != null) {
        await new Promise<void>((resolve, reject) => {
          const req = store.delete(String(row.id));
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }
  } catch {
    // Best-effort eviction
  }
}

function makeCache<T = unknown>(storeName: string) {
  return {
    async upsert(id: string | number, data: T): Promise<void> {
      if (id == null) return;
      try {
        const db = await getDb();
        const row: CacheRow<T> = { id: String(id), data: safeClone(data), updatedAt: Date.now() };
        await waitRequest(tx(db, storeName, 'readwrite').put(row));
      } catch {
        /* best-effort cache */
      }
    },
    async upsertMany(items: Array<{ id: string | number } & Record<string, unknown>>): Promise<void> {
      if (!Array.isArray(items) || items.length === 0) return;
      try {
        const db = await getDb();
        const store = db.transaction(storeName, 'readwrite').objectStore(storeName);
        const now = Date.now();
        for (const item of items) {
          const id = (item as { id?: string | number }).id;
          if (id == null) continue;
          store.put({ id: String(id), data: safeClone(item), updatedAt: now });
        }
        await new Promise<void>((resolve, reject) => {
          store.transaction.oncomplete = () => resolve();
          store.transaction.onerror = () => reject(store.transaction.error ?? new Error('Transaction failed.'));
          store.transaction.onabort = () => reject(store.transaction.error ?? new Error('Transaction aborted.'));
        });
        // Enforce cache limits with LRU eviction (fire-and-forget)
        enforceCacheLimit(storeName).catch(() => {});
      } catch {
        /* best-effort cache */
      }
    },
    async get(id: string | number): Promise<{ data: T; updatedAt: number } | null> {
      if (id == null) return null;
      try {
        const db = await getDb();
        const row = (await waitRequest(tx(db, storeName, 'readonly').get(String(id)))) as CacheRow<T> | undefined;
        return row ? { data: row.data, updatedAt: row.updatedAt } : null;
      } catch {
        return null;
      }
    },
    async getAll({ limit = 500, order = 'DESC' }: { limit?: number; order?: 'ASC' | 'DESC' } = {}): Promise<
      Array<{ id: string; data: T; updatedAt: number }>
    > {
      try {
        const db = await getDb();
        const rows = (await waitRequest(tx(db, storeName, 'readonly').getAll())) as CacheRow<T>[];
        const sorted = rows.sort((a, b) =>
          order === 'ASC' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt,
        );
        return sorted.slice(0, limit);
      } catch {
        return [];
      }
    },
    async delete(id: string | number): Promise<void> {
      if (id == null) return;
      try {
        const db = await getDb();
        await waitRequest(tx(db, storeName, 'readwrite').delete(String(id)));
      } catch {
        /* best-effort */
      }
    },
    async clear(): Promise<void> {
      try {
        const db = await getDb();
        await waitRequest(tx(db, storeName, 'readwrite').clear());
      } catch {
        /* best-effort */
      }
    },
  };
}

export const recipeCache = makeCache<Record<string, unknown>>(STORE_RECIPES);
export const savedRecipeCache = makeCache<Record<string, unknown>>(STORE_SAVED);
export const mealPlanCache = makeCache<Record<string, unknown>>(STORE_MEAL_PLANS);
export const groceryListCache = makeCache<Record<string, unknown>>(STORE_GROCERY_LISTS);
export const reminderEventCache = makeCache<Record<string, unknown>>(STORE_REMINDER_EVENTS);

export const queue = {
  async enqueue(type: string, payload: unknown): Promise<number | null> {
    if (!type) return null;
    try {
      const db = await getDb();
      const row: QueueRow = { type: String(type), payload: safeClone(payload), createdAt: Date.now() };
      const key = (await waitRequest(tx(db, STORE_QUEUE, 'readwrite').add(row))) as IDBValidKey;
      return typeof key === 'number' ? key : null;
    } catch {
      return null;
    }
  },
  async list({ limit = 100 }: { limit?: number } = {}): Promise<Required<QueueRow>[]> {
    try {
      const db = await getDb();
      const rows = (await waitRequest(tx(db, STORE_QUEUE, 'readonly').getAll())) as Required<QueueRow>[];
      return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).slice(0, limit);
    } catch {
      return [];
    }
  },
  async remove(id: number | undefined): Promise<void> {
    if (id == null) return;
    try {
      const db = await getDb();
      await waitRequest(tx(db, STORE_QUEUE, 'readwrite').delete(id));
    } catch {
      /* best-effort */
    }
  },
  async size(): Promise<number> {
    try {
      const db = await getDb();
      return (await waitRequest(tx(db, STORE_QUEUE, 'readonly').count())) as number;
    } catch {
      return 0;
    }
  },
};

export async function clearOfflineCache(): Promise<void> {
  try {
    await recipeCache.clear();
    await savedRecipeCache.clear();
    await mealPlanCache.clear();
    await groceryListCache.clear();
    await reminderEventCache.clear();
  } catch {
    /* best-effort */
  }
}

/**
 * Get cache statistics for all data stores
 * Returns entry counts and limits for monitoring cache health
 */
export async function getCacheStats(): Promise<
  Record<string, { count: number; limit: number; percentage: number }>
> {
  const stats: Record<string, { count: number; limit: number; percentage: number }> = {};

  const stores = [
    { name: STORE_RECIPES, cache: recipeCache, limit: CACHE_LIMITS[STORE_RECIPES] },
    { name: STORE_SAVED, cache: savedRecipeCache, limit: CACHE_LIMITS[STORE_SAVED] },
    { name: STORE_MEAL_PLANS, cache: mealPlanCache, limit: CACHE_LIMITS[STORE_MEAL_PLANS] },
    { name: STORE_GROCERY_LISTS, cache: groceryListCache, limit: CACHE_LIMITS[STORE_GROCERY_LISTS] },
    { name: STORE_REMINDER_EVENTS, cache: reminderEventCache, limit: CACHE_LIMITS[STORE_REMINDER_EVENTS] },
  ];

  for (const { name, cache, limit } of stores) {
    try {
      const all = await cache.getAll({ limit: limit + 100 }); // Get a bit more to check if over limit
      stats[name] = {
        count: all.length,
        limit: limit || Infinity,
        percentage: limit ? Math.round((all.length / limit) * 100) : 0,
      };
    } catch {
      stats[name] = { count: 0, limit: limit || Infinity, percentage: 0 };
    }
  }

  return stats;
}

/**
 * Get total cache storage estimate across all stores
 */
export async function getTotalCacheSize(): Promise<{
  totalEntries: number;
  stores: Record<string, number>;
}> {
  const stores = [
    { name: STORE_RECIPES, cache: recipeCache },
    { name: STORE_SAVED, cache: savedRecipeCache },
    { name: STORE_MEAL_PLANS, cache: mealPlanCache },
    { name: STORE_GROCERY_LISTS, cache: groceryListCache },
    { name: STORE_REMINDER_EVENTS, cache: reminderEventCache },
  ];

  let totalEntries = 0;
  const storeCounts: Record<string, number> = {};

  for (const { name, cache } of stores) {
    try {
      const count = (await cache.getAll({ limit: 10000 })).length;
      storeCounts[name] = count;
      totalEntries += count;
    } catch {
      storeCounts[name] = 0;
    }
  }

  return { totalEntries, stores: storeCounts };
}
