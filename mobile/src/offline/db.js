// SQLite local cache for CookMate offline-first mode.
// Purely additive: no existing services depend on this file.
//
// Tables:
//   recipes        (id, data JSON, updated_at)
//   saved_recipes  (id, data JSON, updated_at)
//   meal_plans     (id, data JSON, updated_at)
//   grocery_lists  (id, data JSON, updated_at)
//   reminder_events (id, data JSON, updated_at)
//   sync_queue     (id, type, payload JSON, created_at)
//
// Cache limits with LRU eviction:
//   recipes: 500 entries, saved_recipes: 300, meal_plans: 100,
//   grocery_lists: 50, reminder_events: 200
//
// Usage:
//   import { getDb, recipeCache, savedRecipeCache, queue } from './db';
//   await recipeCache.upsert(recipe.id, recipe);
//   const r = await recipeCache.get(recipe.id);

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cookmate-offline.db';
let dbPromise = null;

// Cache size limits per table (LRU eviction when exceeded)
const CACHE_LIMITS = {
  recipes: 500,
  saved_recipes: 300,
  meal_plans: 100,
  grocery_lists: 50,
  reminder_events: 200,
};

async function openDb() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // PRAGMA cannot run inside a transaction; execAsync may wrap statements
  // in an implicit one, so run WAL mode separately first.
  await db.runAsync('PRAGMA journal_mode = WAL');
  await db.runAsync(`CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
  await db.runAsync(`CREATE TABLE IF NOT EXISTS saved_recipes (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
  await db.runAsync(`CREATE TABLE IF NOT EXISTS meal_plans (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
  await db.runAsync(`CREATE TABLE IF NOT EXISTS grocery_lists (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
  await db.runAsync(`CREATE TABLE IF NOT EXISTS reminder_events (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
  await db.runAsync(`CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL)`);
  // Image cache metadata table - tracks file system cached images
  await db.runAsync(`CREATE TABLE IF NOT EXISTS image_cache_metadata (
    url TEXT PRIMARY KEY NOT NULL,
    local_path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_accessed INTEGER NOT NULL
  )`);
  // Index for LRU eviction queries
  await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_image_cache_last_accessed ON image_cache_metadata(last_accessed)`);
  return db;
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return 'null';
  }
}

function safeParse(value) {
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Enforce cache size limits with LRU eviction
 * Removes oldest entries when table exceeds its limit
 */
async function enforceCacheLimit(table) {
  const limit = CACHE_LIMITS[table];
  if (!limit || limit <= 0) return;

  try {
    const db = await getDb();

    // Get total count
    const countRow = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table}`);
    const count = countRow?.count || 0;

    if (count <= limit) return;

    // Delete oldest entries (by updated_at)
    const toDelete = count - limit;
    await db.runAsync(
      `DELETE FROM ${table} WHERE id IN (
        SELECT id FROM ${table} ORDER BY updated_at ASC LIMIT ?
      )`,
      [toDelete]
    );
  } catch {
    // Best-effort eviction
  }
}

function makeCache(table) {
  return {
    async upsert(id, data) {
      if (id == null) return;
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO ${table} (id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
        [String(id), safeStringify(data), Date.now()]
      );
    },
    async upsertMany(items) {
      if (!Array.isArray(items) || items.length === 0) return;
      const db = await getDb();
      const now = Date.now();
      for (const item of items) {
        const id = item?.id;
        if (id == null) continue;
        await db.runAsync(
          `INSERT INTO ${table} (id, data, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
          [String(id), safeStringify(item), now]
        );
      }
      // Enforce cache limits with LRU eviction (fire-and-forget)
      enforceCacheLimit(table).catch(() => {});
    },
    async get(id) {
      if (id == null) return null;
      const db = await getDb();
      const row = await db.getFirstAsync(
        `SELECT data, updated_at FROM ${table} WHERE id = ?`,
        [String(id)]
      );
      if (!row) return null;
      return { data: safeParse(row.data), updatedAt: row.updated_at };
    },
    async getAll({ limit = 500, order = 'DESC' } = {}) {
      const db = await getDb();
      const dir = order === 'ASC' ? 'ASC' : 'DESC';
      const rows = await db.getAllAsync(
        `SELECT id, data, updated_at FROM ${table} ORDER BY updated_at ${dir} LIMIT ?`,
        [limit]
      );
      return rows.map((r) => ({ id: r.id, data: safeParse(r.data), updatedAt: r.updated_at }));
    },
    async delete(id) {
      if (id == null) return;
      const db = await getDb();
      await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [String(id)]);
    },
    async clear() {
      const db = await getDb();
      await db.runAsync(`DELETE FROM ${table}`);
    },
  };
}

export const recipeCache = makeCache('recipes');
export const savedRecipeCache = makeCache('saved_recipes');
export const mealPlanCache = makeCache('meal_plans');
export const groceryListCache = makeCache('grocery_lists');
export const reminderEventCache = makeCache('reminder_events');

export const queue = {
  async enqueue(type, payload) {
    if (!type) return null;
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO sync_queue (type, payload, created_at) VALUES (?, ?, ?)`,
      [String(type), safeStringify(payload), Date.now()]
    );
    return result?.lastInsertRowId ?? null;
  },
  async list({ limit = 100 } = {}) {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT id, type, payload, created_at FROM sync_queue ORDER BY id ASC LIMIT ?`,
      [limit]
    );
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: safeParse(r.payload),
      createdAt: r.created_at,
    }));
  },
  async remove(id) {
    if (id == null) return;
    const db = await getDb();
    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
  },
  async size() {
    const db = await getDb();
    const row = await db.getFirstAsync(`SELECT COUNT(*) AS c FROM sync_queue`);
    return Number(row?.c || 0);
  },
};

export async function clearOfflineCache() {
  try {
    await recipeCache.clear();
    await savedRecipeCache.clear();
    await mealPlanCache.clear();
    await groceryListCache.clear();
    await reminderEventCache.clear();
  } catch {
    // best-effort
  }
}

/**
 * Get cache statistics for all data stores
 * Returns entry counts and limits for monitoring cache health
 */
export async function getCacheStats() {
  const stats = {};

  const stores = [
    { name: 'recipes', cache: recipeCache, limit: CACHE_LIMITS.recipes },
    { name: 'saved_recipes', cache: savedRecipeCache, limit: CACHE_LIMITS.saved_recipes },
    { name: 'meal_plans', cache: mealPlanCache, limit: CACHE_LIMITS.meal_plans },
    { name: 'grocery_lists', cache: groceryListCache, limit: CACHE_LIMITS.grocery_lists },
    { name: 'reminder_events', cache: reminderEventCache, limit: CACHE_LIMITS.reminder_events },
  ];

  for (const { name, cache, limit } of stores) {
    try {
      const all = await cache.getAll({ limit: limit + 100 });
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
export async function getTotalCacheSize() {
  const stores = [
    { name: 'recipes', cache: recipeCache },
    { name: 'saved_recipes', cache: savedRecipeCache },
    { name: 'meal_plans', cache: mealPlanCache },
    { name: 'grocery_lists', cache: groceryListCache },
    { name: 'reminder_events', cache: reminderEventCache },
  ];

  let totalEntries = 0;
  const storeCounts = {};

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
