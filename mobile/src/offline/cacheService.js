// Read-through cache helpers for CookMate offline-first mode.
// Wraps existing API calls without rewriting any service:
//
//   ONLINE  -> call API, cache the response in SQLite, return response.
//   OFFLINE -> read cached JSON from SQLite, return it in an API-compatible shape.
//
// Screens are free to keep calling the existing `recipeApi.*` directly; this
// module is opt-in and additive. Only screens that want offline behavior need
// to switch to the helpers below.

import { recipeCache, savedRecipeCache } from './db';
import { isOnlineNow } from './network';

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.recipes)) return value.recipes;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && Array.isArray(value.results)) return value.results;
  return [];
}

function buildAxiosLike(data, { fromCache = false } = {}) {
  return {
    data,
    status: fromCache ? 0 : 200,
    fromCache,
  };
}

// Generic read-through for LIST endpoints that return an array of recipes.
// Caches each recipe item (with an `id`) into the recipes table so individual
// detail reads can hit the cache too.
export async function getRecipesCached(apiFn, { fallbackFilter } = {}) {
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      const items = toArray(response?.data);
      if (items.length > 0) {
        // Fire-and-forget cache write so the UI isn't blocked.
        recipeCache.upsertMany(items).catch(() => {});
      }
      return response;
    } catch (err) {
      // Network call failed even though we thought we were online — fall
      // through to the cache so the UI still renders something.
      const cached = await readCachedList(fallbackFilter);
      if (cached.length > 0) return buildAxiosLike({ recipes: cached }, { fromCache: true });
      throw err;
    }
  }

  const cached = await readCachedList(fallbackFilter);
  return buildAxiosLike({ recipes: cached }, { fromCache: true });
}

async function readCachedList(fallbackFilter) {
  const rows = await recipeCache.getAll({ limit: 500 });
  const list = rows.map((r) => r.data).filter(Boolean);
  if (typeof fallbackFilter === 'function') {
    try {
      return list.filter(fallbackFilter);
    } catch {
      return list;
    }
  }
  return list;
}

// Read-through for a single recipe by id.
export async function getRecipeByIdCached(id, apiFn) {
  if (id == null) throw new Error('Recipe id is required.');
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      const recipe = response?.data?.recipe || response?.data;
      if (recipe && recipe.id != null) {
        recipeCache.upsert(recipe.id, recipe).catch(() => {});
      }
      return response;
    } catch (err) {
      const cached = await recipeCache.get(id);
      if (cached?.data) return buildAxiosLike({ recipe: cached.data }, { fromCache: true });
      throw err;
    }
  }

  const cached = await recipeCache.get(id);
  if (!cached?.data) {
    const err = new Error('Recipe not available offline.');
    err.code = 'OFFLINE_CACHE_MISS';
    throw err;
  }
  return buildAxiosLike({ recipe: cached.data }, { fromCache: true });
}

// "My Saves" list — cache saved recipes locally so they remain accessible
// even when offline. We store the full item payload under its id.
export async function getSavedRecipesCached(apiFn) {
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      const items = toArray(response?.data) || [];
      if (items.length > 0) {
        savedRecipeCache.upsertMany(items).catch(() => {});
      } else {
        // Empty list from the server is authoritative — mirror it locally so
        // the offline view doesn't show stale entries.
        try {
          await savedRecipeCache.clear();
        } catch {}
      }
      return response;
    } catch (err) {
      const rows = await savedRecipeCache.getAll({ limit: 500 });
      const cached = rows.map((r) => r.data).filter(Boolean);
      if (cached.length > 0) return buildAxiosLike({ saves: cached }, { fromCache: true });
      throw err;
    }
  }

  const rows = await savedRecipeCache.getAll({ limit: 500 });
  const cached = rows.map((r) => r.data).filter(Boolean);
  return buildAxiosLike({ saves: cached }, { fromCache: true });
}

// Primitive cache writers — useful when a screen already fetched data through
// the existing API and just wants to mirror it for offline use.
export const offlineCache = {
  recipes: recipeCache,
  savedRecipes: savedRecipeCache,
};
