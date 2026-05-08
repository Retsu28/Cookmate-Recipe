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
// Usage:
//   import { getDb, recipeCache, savedRecipeCache, queue } from './db';
//   await recipeCache.upsert(recipe.id, recipe);
//   const r = await recipeCache.get(recipe.id);

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cookmate-offline.db';
let dbPromise = null;

async function openDb() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // PRAGMA cannot run inside a transaction; execAsync may wrap statements
  // in an implicit one, so run WAL mode separately first.
  await db.runAsync('PRAGMA journal_mode = WAL');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saved_recipes (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grocery_lists (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminder_events (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
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
      await db.withTransactionAsync(async () => {
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
      });
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
