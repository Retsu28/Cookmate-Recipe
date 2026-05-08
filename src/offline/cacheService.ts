// Read-through cache helpers for CookMate web offline-first mode.
// Mirrors `mobile/src/offline/cacheService.js`:
//
//   ONLINE  -> call API, cache the response in IndexedDB, return response.
//   OFFLINE -> read cached JSON from IndexedDB, return it in an API-compatible shape.
//
// Screens may keep calling the existing `api.get(...)` directly; this module
// is opt-in. Switch a screen to use the helpers below when you want offline
// fallback for that specific endpoint.

import { groceryListCache, mealPlanCache, recipeCache, savedRecipeCache } from './db';
import { isOnlineNow } from './network';

type WithId = { id: string | number };

function toArray<T = WithId>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.recipes)) return v.recipes as T[];
    if (Array.isArray(v.plans)) return v.plans as T[];
    if (Array.isArray(v.data)) return v.data as T[];
    if (Array.isArray(v.results)) return v.results as T[];
    if (Array.isArray(v.saves)) return v.saves as T[];
  }
  return [];
}

/**
 * Read-through cache for list endpoints returning `{ recipes: [...] }`.
 *
 * Usage:
 *   const data = await getRecipesCached(() => api.get('/api/recipes/recent'));
 *   // data.recipes is populated either from the API or from IndexedDB.
 */
export async function getRecipesCached<T extends { recipes?: WithId[] } = { recipes: WithId[] }>(
  apiFn: () => Promise<T>,
  { fallbackFilter }: { fallbackFilter?: (item: WithId) => boolean } = {},
): Promise<T & { fromCache?: boolean }> {
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      const items = toArray<WithId>(response);
      if (items.length > 0) {
        recipeCache.upsertMany(items).catch(() => {});
      }
      return response;
    } catch (err) {
      const cached = await readCachedList(fallbackFilter);
      if (cached.length > 0) {
        return { recipes: cached, fromCache: true } as T & { fromCache?: boolean };
      }
      throw err;
    }
  }

  const cached = await readCachedList(fallbackFilter);
  return { recipes: cached, fromCache: true } as T & { fromCache?: boolean };
}

async function readCachedList(fallbackFilter?: (item: WithId) => boolean): Promise<WithId[]> {
  const rows = await recipeCache.getAll({ limit: 500 });
  const list = rows.map((r) => r.data as WithId).filter(Boolean);
  if (typeof fallbackFilter === 'function') {
    try {
      return list.filter(fallbackFilter);
    } catch {
      return list;
    }
  }
  return list;
}

/**
 * Read-through cache for a single recipe by id (`/api/recipes/:id`).
 * Returns `{ recipe, fromCache? }`.
 */
export async function getRecipeByIdCached<T extends { recipe: WithId } = { recipe: WithId }>(
  id: string | number,
  apiFn: () => Promise<T>,
): Promise<T & { fromCache?: boolean }> {
  if (id == null) throw new Error('Recipe id is required.');
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      const recipe = (response as { recipe?: WithId })?.recipe;
      if (recipe && recipe.id != null) {
        recipeCache.upsert(recipe.id, recipe).catch(() => {});
      }
      return response;
    } catch (err) {
      const cached = await recipeCache.get(id);
      if (cached?.data) {
        return { recipe: cached.data as WithId, fromCache: true } as T & { fromCache?: boolean };
      }
      throw err;
    }
  }

  const cached = await recipeCache.get(id);
  if (!cached?.data) {
    const error = new Error('Recipe not available offline.') as Error & { code?: string };
    error.code = 'OFFLINE_CACHE_MISS';
    throw error;
  }
  return { recipe: cached.data as WithId, fromCache: true } as T & { fromCache?: boolean };
}

/**
 * Read-through cache for the "My Saves" list (`/api/ml/ai-camera-saves`).
 * Returns `{ saves, fromCache? }`.
 */
export async function getSavedRecipesCached<T extends { saves?: WithId[] } = { saves: WithId[] }>(
  apiFn: () => Promise<T>,
): Promise<T & { fromCache?: boolean }> {
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      const items = toArray<WithId>(response);
      if (items.length > 0) {
        savedRecipeCache.upsertMany(items).catch(() => {});
      } else {
        // Authoritative empty response from server — mirror it locally so the
        // offline view doesn't keep stale entries.
        try {
          await savedRecipeCache.clear();
        } catch {}
      }
      return response;
    } catch (err) {
      const rows = await savedRecipeCache.getAll({ limit: 500 });
      const cached = rows.map((r) => r.data as WithId).filter(Boolean);
      if (cached.length > 0) {
        return { saves: cached, fromCache: true } as T & { fromCache?: boolean };
      }
      throw err;
    }
  }

  const rows = await savedRecipeCache.getAll({ limit: 500 });
  const cached = rows.map((r) => r.data as WithId).filter(Boolean);
  return { saves: cached, fromCache: true } as T & { fromCache?: boolean };
}

/**
 * Read-through cache for authenticated meal plans.
 * Returns `{ plans, fromCache? }`.
 */
export async function getMealPlansCached<T extends { plans?: WithId[] } = { plans: WithId[] }>(
  apiFn: () => Promise<T>,
): Promise<T & { fromCache?: boolean }> {
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      const plans = toArray<WithId>(response);
      if (plans.length > 0) {
        await mealPlanCache.clear();
        await mealPlanCache.upsertMany(plans);
      } else {
        await mealPlanCache.clear();
      }
      return response;
    } catch (err) {
      const cached = await readCachedMealPlans();
      if (cached.length > 0) {
        return { plans: cached, fromCache: true } as T & { fromCache?: boolean };
      }
      throw err;
    }
  }

  const cached = await readCachedMealPlans();
  return { plans: cached, fromCache: true } as T & { fromCache?: boolean };
}

async function readCachedMealPlans(): Promise<WithId[]> {
  const rows = await mealPlanCache.getAll({ limit: 500, order: 'ASC' });
  return rows.map((r) => r.data as WithId).filter(Boolean);
}

/**
 * Read-through cache for the last generated grocery list.
 * Returns the same API shape as `/api/meal-planner/grocery-list`.
 */
export async function getGroceryListCached<T extends { groceryList?: unknown }>(
  apiFn: () => Promise<T>,
): Promise<T & { fromCache?: boolean }> {
  if (isOnlineNow()) {
    try {
      const response = await apiFn();
      await groceryListCache.upsert('latest', response as Record<string, unknown>);
      return response;
    } catch (err) {
      const cached = await groceryListCache.get('latest');
      if (cached?.data) {
        return { ...(cached.data as T), fromCache: true };
      }
      throw err;
    }
  }

  const cached = await groceryListCache.get('latest');
  if (cached?.data) {
    return { ...(cached.data as T), fromCache: true };
  }

  const error = new Error('Grocery list not available offline yet.') as Error & { code?: string };
  error.code = 'OFFLINE_CACHE_MISS';
  throw error;
}

// Direct handles for screens that fetched via the existing api and just want
// to mirror the response into offline storage.
export const offlineCache = {
  recipes: recipeCache,
  savedRecipes: savedRecipeCache,
  mealPlans: mealPlanCache,
  groceryList: groceryListCache,
};
